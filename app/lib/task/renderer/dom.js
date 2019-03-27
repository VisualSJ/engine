'use strict';

const i18n = require('../../i18n');

const $mask = document.querySelector('.task-sync-mask');
const $describe = $mask.querySelector('.describe');
const $message = $mask.querySelector('.message');

const info = {
    title: '',
    describe: '',
    message: '',
};

i18n.on('switch', () => {
    if (info.describe && info.describe.startsWith('i18n:')) {
        $describe.innerHTML = i18n.t(info.describe.substr(5));
    }
});

exports.show = function(title, describe, message) {
    info.title = title || '';
    info.describe = describe || '';
    info.message = message;

    let html = '';
    let mhtml = '';

    if (title) {
        if (!describe) {
            html = title;
        } else {
            if (describe && describe.startsWith('i18n:')) {
                html = i18n.t(info.describe.substr(5));
            } else {
                html = describe;
            }
        }

        if (info.message){
            mhtml = info.message;
        }
    } else {
        html = '';
    }

    $describe.innerHTML = html;
    $message.innerHTML = mhtml;
    $mask.style.display = html ? 'flex' : 'none';
};
