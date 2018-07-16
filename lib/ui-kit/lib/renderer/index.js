'use stirct';

const Button = require('./element/button');
const Input = require('./element/input');
const NumInput = require('./element/num-input');
const Loading = require('./element/loading');

window.customElements.define('ui-button', Button);
window.customElements.define('ui-input', Input);
window.customElements.define('ui-num-input', NumInput);
window.customElements.define('ui-loading', Loading);

class UI {

    get Button () {
        return Button;
    }

    get Input () {
        return Input;
    }

    get NumInput () {
        return NumInput;
    }

    get Loading () {
        return Loading;
    }
}

module.exports = new UI();