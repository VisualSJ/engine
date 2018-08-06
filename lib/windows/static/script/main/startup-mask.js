'use stirct';

const startup = require('../../../../startup');

const Vue = require('vue/dist/vue');
Vue.config.productionTip = false;
Vue.config.devtools = false;

new Vue({

    el: document.querySelector('.loading-mask'),

    data: {
        process: 0,
        hidden: false,
    },

    watch: {
        process () {
            clearTimeout(this._timer);
            this._timer = setTimeout(() => {
                this.hidden = this.process >= 1;
            }, 200);
        },
    },

    mounted () {
        this.process = startup.process;
        startup.on('change', (process) => {
            this.process = process;
        });
    }
});
