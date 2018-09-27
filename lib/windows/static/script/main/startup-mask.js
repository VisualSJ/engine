'use stirct';

const Vue = require('vue/dist/vue');
Vue.config.productionTip = false;
Vue.config.devtools = false;

new Vue({

    el: document.querySelector('.loading-mask'),

    data: {
        startup: false,
        process: 0,
        message: 'Wait a moment',
        hidden: false,
    },

    watch: {
        process() {
            clearTimeout(this._timer);
            this._timer = setTimeout(() => {
                this.hidden = this.process >= 1;
            }, 200);
        },
    },

    mounted() {
        this.startup = true;

        const startup = require('../../../../startup');
        this.process = startup.process;
        startup.on('change', (process) => {
            this.process = process;
        });
        startup.on('message', (message) => {
            this.message = message;
        });
    }
});
