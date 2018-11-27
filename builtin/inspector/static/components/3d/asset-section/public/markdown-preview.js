const { readFileSync } = require('fs');
const Remarkable = require('remarkable');
const Hljs = require('highlight.js');

exports.props = ['type', 'path', 'content'];

exports.mounted = function() {
    this.updateText();
};

exports.render = function(h) {
    return h('div', {
        staticClass: 'container markdown-container',
    });
};

exports.watch = {
    type: 'updateText',
    path: 'updateText',
    content: 'updateText',
};

exports.methods = {
    updateText() {
        if ((!this.path && !this.content) || this.type === 'unknown') {
            return;
        }
        this.markdownRender();
    },

    markdownRender() {
        const content = this.content ? this.content : readFileSync(this.path, { encoding: 'utf-8' });
        const mark = new Remarkable({
            html: true,
            highlight(str, lang) {
                if (lang && Hljs.getLanguage(lang)) {
                    try {
                        return Hljs.highlight(lang, str).value;
                    } catch (err) {
                        console.error(err);
                    }
                } else {
                    try {
                        return Hljs.highlightAuto(str).value;
                    } catch (err) {
                        console.error(err);
                    }
                }
                return '';
            },
        });
        const text = mark.render(content);
        const codeDOM = this.$el;
        if (!codeDOM) {
            return;
        }

        codeDOM.innerHTML = text;
    },
};
