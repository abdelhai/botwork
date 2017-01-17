const
    client = require('./client'),
    event = require('./../../services').event(),
    config = require('./config'),
    session = require('./../../services').session(config);


module.exports = class Request {

    constructor(req) {

        this.raw = req;
        this.session = session.current(req.sender.id)

        this.parseRequestMessage(req);

        event.emit("messenger_message_in", this);

        this._translate = this._translate.bind(this);
        this._translateButtons = this._translateButtons.bind(this);
    }

    parseRequestMessage(req) {

        this.uid = req.sender.id;
        this.text = "";

        if (req.postback) {
            this.payload = req.postback.payload;

        if (req.postback.referral) {
            this.payload = "$ref";
            this.data = req.postback.referral;
        }

        } else if (req.referral) {
            this.payload = "$ref";
            this.data = req.referral;
        } else if (req.message.quick_reply) {
            this.payload = req.message.quick_reply.payload;
        } else if (req.message.text) {
            this.payload = req.message.text;
            this.text = req.message.text;
        } else if (req.message.attachments) {
            this.payload = "_" + req.message.attachments[0].type;
            this.is_file = true;
            this["is_" + req.message.attachments[0].type] = true;
            this.data = req.message.attachments[0].payload;
        }

        if (this.payload.indexOf("{") === 0) {
            let payload = JSON.parse(this.payload);
            this.payload = payload.c;
            this.data = payload.d;
        } else {
            this.payload = this.payload.toLowerCase();
        }

        let words = this.payload.split(/[ ,]+/);

        this.yes = this._isAction(words, 'yes');
        this.no = this._isAction(words, 'no');
        this.skip = this._isAction(words, 'skip') || this.yes;
        this.back = this._isAction(words, 'back');


    }

    _isAction(words, action) {

        let lang, answer;

        if (this.session.user && this.session.user.convo_lang) {
            lang = this.session.user.convo_lang.split('_')[0] || 'en';
        }

        let params = {locale: lang, arr: true};

        let strings = Request.i18n._(action, params);

        strings.forEach((str) => {
            words.forEach((word) => {
                if (word  === str) {answer = true}
            });
        });

        return answer; 
    }

    _(name, params) {
        let usr = this.sess.user;
        params = params || {first_name : usr.first_name};
        params['locale'] = usr.convo_lang ? usr.convo_lang.split('_')[0] : 'en';

        return Request.i18n._(name, params);
    }

    next(cb) {
        this.sess._next = cb;
    }

    yesOrNo(onYes, onNo) {
        if (this.yes) {

            return onYes(this);
        }

        onNo(this, false);
    }

    sendText(text) {
        return client.sendText(this.uid, text);
    }

    sendMenu(text, buttons) {

        return client.sendMenu(this.uid, text, this._translateButtons(buttons));
    }

    sendList(elements, first = "compact") {

        return client.sendList(this.uid, elements, first);
    }

    sendGeneric(elements) {

        return client.sendGeneric(this.uid, elements);
    }

    sendUrlButton(text, title, url, ratio = "full") {
        return client.sendUrlButton(this.uid, text, title, url, ratio);
    }

    sendOptions(text, options = { $yes: "_btn_yes", $no: "_btn_no" }) {

        options = this._translateButtons(options);
        return client.sendOptions(this.uid, text, options);

    }

    sendImage(image_url) {
      return client.sendImage(this.uid, image_url);
    }

    _translate(str, opts = {}) {
        if (str.indexOf("_") === 0) {
            return this._(str.substr(1), opts._params);
        }

        return str;
    }

    _translateButtons(btns, opts = {}) {

        if (btns) {

            for (let btn in btns) {

                if (btns.hasOwnProperty(btn)) {

                    btns[btn] = this._translate(btns[btn], opts);
                }

            }

        }

        return btns;

    }

    send(text, btns, opts = {}) {

        text = this._translate(text, opts);

        btns = this._translateButtons(btns, opts);


        return btns ? client.sendOptions(this.uid, text, btns) : client.sendText(this.uid, text);
    }

    sendTyping() {

        return client.sendTyping(this.uid);
    }

    sendMessage(message) {

        try {

            let elements = message.attachment.payload.elements;

            elements.forEach((el) => {

                el.buttons.forEach((btn) => {

                    if (btn.title) {
                        btn.title = this._translate(btn.title);
                    }

                });

            });

        } catch (e) {
            // it's ok, pass!
        }

        return client.sendMessage(this.uid, message);
    }

    getUser() {
        return client.getUser(this.uid);
    }

    static register(name, module) {

        Request[name] = module;
    }
};
