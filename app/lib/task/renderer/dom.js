'use strict';

const i18n = require('../../i18n');

const $mask = document.querySelector('.task-sync-mask');
const $info = $mask.querySelector('.info');

const info = {
    title: '',
    describe: '',
};

i18n.on('switch', () => {
    if (info.describe && info.describe.startsWith('i18n:')) {
        $info.innerHTML = i18n.t(info.describe.substr(5));
    }
});

exports.show = function(title, describe) {
    info.title = title || '';
    info.describe = describe || '';
    if (title) {
        if (!describe) {
            $info.innerHTML = title;
        } else {
            if (describe && describe.startsWith('i18n:')) {
                $info.innerHTML = i18n.t(info.describe.substr(5));
            } else {
                $info.innerHTML = describe;
            }
        }
        $mask.style.display = 'flex';
    } else {
        $info.innerHTML = '';
        $mask.style.display = 'none';
    }
};
