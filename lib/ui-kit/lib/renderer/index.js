'use stirct';
const path = require('path');

const Button = require('./components/button');
const Input = require('./components/input');
const NumInput = require('./components/num-input');
const Loading = require('./components/loading');
const Checkbox = require('./components/checkbox');
const Section = require('./components/section');
const Select = require('./components/select');
const Slider = require('./components/slider');
const ColorPicker = require('./components/color-picker');
const Color = require('./components/color');
const DragItem = require('./components/drag/drag-item');
const DragArea = require('./components/drag/drag-area');
const DragObject = require('./components/drag/drag-object');
const Prop = require('./components/prop');
const Tooltip = require('./components/tooltip');

window.customElements.define('ui-button', Button);
window.customElements.define('ui-input', Input);
window.customElements.define('ui-num-input', NumInput);
window.customElements.define('ui-loading', Loading);
window.customElements.define('ui-checkbox', Checkbox);
window.customElements.define('ui-section', Section);
window.customElements.define('ui-select', Select);
window.customElements.define('ui-slider', Slider);
window.customElements.define('ui-color-picker', ColorPicker);
window.customElements.define('ui-color', Color);
window.customElements.define('ui-drag-item', DragItem);
window.customElements.define('ui-drag-area', DragArea);
window.customElements.define('ui-drag-object', DragObject);
window.customElements.define('ui-prop', Prop);
window.customElements.define('ui-tooltip', Tooltip);

class UI {
    get Button() {
        return Button;
    }

    get Input() {
        return Input;
    }

    get NumInput() {
        return NumInput;
    }

    get Loading() {
        return Loading;
    }

    get Checkbox() {
        return Checkbox;
    }

    get Section() {
        return Section;
    }

    get Slider() {
        return Slider;
    }

    get Select() {
        return Select;
    }

    get ColorPicker() {
        return ColorPicker;
    }

    get Color() {
        return Color;
    }

    get DragItem() {
        return DragItem;
    }

    get DragArea() {
        return DragArea;
    }

    get DragObject() {
        return DragObject;
    }

    get Prop() {
        return Prop;
    }

    get Tooltip() {
        return Tooltip;
    }
}

module.exports = new UI();
