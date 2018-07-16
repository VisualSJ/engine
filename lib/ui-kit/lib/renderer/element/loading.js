'use stirct';

const fs = require('fs');
const ps = require('path');

const Base = require('./base');

const HTML = `
<style>
${fs.readFileSync(ps.join(__dirname, '../style/loading.css'))}
</style>
<style id=""></style>
${fs.readFileSync(ps.join(__dirname, '../template/loading.html'))}
`;

class Loading extends window.HTMLElement {

    constructor () {
        super();
        this.attachShadow({
            mode: 'open'
        });

        this.shadowRoot.innerHTML = HTML;
    }
}

module.exports = Loading;