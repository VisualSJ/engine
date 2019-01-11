'use strict';

const Vue = require('vue/dist/vue');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const tester = require('./tester');

const { join } = require('path');
const { readFileSync } = require('fs');

module.exports = {

    template: readFileSync(join(__dirname, './index.html'), 'utf8'),

    style: readFileSync(join(__dirname, './index.css'), 'utf8'),

    $: {
        tester: '.tester',
    },

    listeners: {},

    messages: {
        '*'(message, ...args) {
            tester.Ipc.receive(message, ...args);
        },
    },

    methods: {},

    async ready() {
        const home = require('./components/home');
        this.vm = new Vue({
            el: this.$.tester,
            data: home.data(),
            watch: home.watch,
            methods: home.methods,
            mounted: home.mounted,
        });
    },

    close() {

    },
};
