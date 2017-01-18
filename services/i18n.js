const
 path = require("path")
 _ = require("lodash");

module.exports = (config = {}) => {

    return {

        _(name, params = {}) {

            let strings;
            let enstrings = require( path.join( process.cwd(), 'locales', 'en') );

            try {
                strings = require( path.join( process.cwd(), 'locales', params.locale) );
            } catch (e) {
                strings = enstrings
            }

            if (!strings[name]) {strings = enstrings};

            let str = strings[name] || enstrings[name];

            if (!str) return name;

            if (typeof str === "object" || _.size(params) === 0) {
                return str;
            }

            _.each(params, (v, k) => {
                str = str.replace(`{${k}}`, v);
            })

            return str;
        }
    }

}
