'use strict';

module.exports = {

    template: `
        <div class="test">
            <ui-button class="test-button" active="true">Button</ui-button>
            <ui-input class="test-input"></ui-input>
        </div>
    `,

    style: `
        .test { padding: 20px; }
    `,

    $: {
        testButton: '.test-button',
        testInput: '.test-input',
    },

    listeners: {},

    messages: {},

    methods: {},

    async ready() {
        // this.$.testInput.addEventListener('keydown', (event) => {
        //     console.log('keydown');
        // });
        // this.$.testInput.addEventListener('keypress', (event) => {
        //     console.log('keypress');
        // });
        // this.$.testInput.addEventListener('keyup', (event) => {
        //     console.log('keyup');
        // });
        // this.$.testInput.addEventListener('confirm', (event) => {
        //     console.log('confirm');
        // });
    },

    close() {

    },
};
