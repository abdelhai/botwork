const
    client = require('./client'),
    event = require('./../../services').event();

module.exports = class Request {

    constructor(req) {

        this.raw = req;

        this.parseRequestMessage(req);

        event.emit("messenger_message_in", this);
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

        this.yes = false;

        let yesish = ["$yes", "yes", "yep", "right", "ok", "yup", "fine", "sure", "k", "ah", "aha", "ja", "jup"];

        yesish.forEach((str) => {
            if (this.payload.toLowerCase().indexOf(str) === 0) {
                this.yes = true;
            }
        });

        this.skip = this.payload === "$skip";
    }

    _(name, params) {

        params = params || {first_name : this.sess.user.first_name};

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

        return client.sendMenu(this.uid, text, buttons);
    }

    sendList(elements, first = "compact") {

        return client.sendList(this.uid, elements, first);
    }

    sendGeneric(elements) {

        return client.sendGeneric(this.uid, elements);
    }

    sendOptions(text, options = { $yes: "Yes, please.", $no: "No, thanx" }) {
        
        return client.sendOptions(this.uid, text, options);
    }

    send(text, btns, opts = {}) {

        if (text.indexOf("_") === 0) {

            text = this._(text.substr(1), opts._params);
        }
        
        return btns ? client.sendOptions(this.uid, text, btns) : client.sendText(this.uid, text);
    }

    sendTyping() {

        return client.sendTyping(this.uid);
    }

    sendMessage(message) {

        return client.sendMessage(this.uid, message);
    }

    getUser() {
        return client.getUser(this.uid);
    }

    static register(name, module) {

        Request[name] = module;
    }
};