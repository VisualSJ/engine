'use strict';

exports.query = function(panel, selector) {
    const dock = document.querySelector('#dock').shadowRoot;

    let element = null;

    if (dock) {
        const frame = dock.querySelector(`panel-frame[name="${panel}"]`);
        
        if (frame && frame.shadowRoot) {
            element = frame.shadowRoot.querySelector(selector) || null;
        }
    }

    return element;
};