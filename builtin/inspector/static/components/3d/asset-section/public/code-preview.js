'use strict';

const { createReadStream } = require('fs');

exports.props = ['type', 'path'];

exports.data = function() {
    return {};
};

exports.render = function(h) {
    return h('pre', {
        class: {
            'flex-1': true,
            code: true,
        },
    });
};

exports.mounted = function() {
    this.updateText();
};

exports.watch = { type: 'updateText', path: 'updateText' };

exports.methods = {
    updateText() {
        if (!this.path || this.type === 'unknown') {
            return;
        }
        this.highlightCode();
    },
    highlightCode() {
        const es = require('event-stream');
        const readStream = createReadStream(this.path, {
            encoding: 'utf-8',
        });
        let remainLines = 400;
        let text = '';
        const writeStream = readStream
            .pipe(es.split())
            .pipe(
                es.mapSync((line) => {
                    remainLines--;
                    text += line + '\n';
                    if (remainLines <= 0) {
                        text += '...\n';
                        readStream.close();
                        writeStream.push(null);
                        writeStream.end();
                    }
                })
            )
            .on('close', (err) => {
                if (err) {
                    throw err;
                }
                showCode.apply(this);
            });

        function showCode() {
            const codeDOM = this.$el;
            if (!codeDOM) {
                return;
            }

            if (this.type !== 'text') {
                const Hljs = require('highlight.js');
                const result = Hljs.highlight(this.type, text);
                codeDOM.innerHTML = result.value;
            } else {
                codeDOM.innerHTML = text;
            }
        }
    },
};
