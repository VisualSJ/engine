'use stirct';
const path = require('path');

const Button = require('./components/button');
const Input = require('./components/input');
const NumInput = require('./components/num-input');
const Loading = require('./components/loading');
const Checkbox = require('./components/checkbox');
const Section = require('./components/section');
const Select = require('./components/select');

window.customElements.define('ui-button', Button);
window.customElements.define('ui-input', Input);
window.customElements.define('ui-num-input', NumInput);
window.customElements.define('ui-loading', Loading);
window.customElements.define('ui-checkbox', Checkbox);
window.customElements.define('ui-section', Section);
window.customElements.define('ui-select', Select);
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

    get Checkbox () {
        return Checkbox;
    }

    get Section () {
        return Section;
    }

    get Progress () {
        return Progress;
    }
}

module.exports = new UI();
