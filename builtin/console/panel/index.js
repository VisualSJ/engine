'use strict';

const fs = require('fs');
const Vue = require('./vue.min.js');

module.exports = {

    style: fs.readFileSync(__dirname + '/style/index.css'),

    template: fs.readFileSync(__dirname + '/template/index.html'),

    messages: {
        
    },

    methods: {
        _onRecord (log) {
            this.vm.list.push(log);
        },
    },

    ready () {
        let list = Editor.Logger.query();
        let $elem = this.shadowRoot.querySelector('.console');
        this.vm = new Vue({
            el: $elem,
            data: {
                list: list,
            },
        });

        this._record = this._onRecord.bind(this);
        Editor.Logger.on('record',this._record);
    },

    beforeClose () {},

    close () {
        Editor.Logger.removeListener('record', this._record);
    },
};