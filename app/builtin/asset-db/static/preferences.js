'use strict';

const profile = Editor.Profile.load('profile://global/packages/asset-db.json');

exports.template = `
<ui-prop
    label="${Editor.I18n.t('asset-db.preferences.log_level')}"
>
    <ui-select class="log-level" slot="content">
        <option value="1">${Editor.I18n.t('asset-db.preferences.log_level_error')}</option>
        <option value="2">${Editor.I18n.t('asset-db.preferences.log_level_warn')}</option>
        <option value="3">${Editor.I18n.t('asset-db.preferences.log_level_log')}</option>
        <option value="4">${Editor.I18n.t('asset-db.preferences.log_level_debug')}</option>
    </ui-select>
</ui-prop>
`;

exports.methods = {
    /**
     * 修改 profile 内的设置
     * @param {*} key 
     * @param {*} value 
     * @param {*} type 
     */
    changeProfile(key, value, type) {

        if (type) {
            switch(type) {
                case 'number':
                value -= 0;
                if (isNaN(value)) {
                    value = 0;
                }
                break;
            }
        }

        profile.set(key, value);
        profile.save();
    },
};

exports.$ = {
    logLevel: '.log-level',
};

exports.ready = function() {
    requestAnimationFrame(() => {
        this.$.logLevel.value = profile.get('log.level');
    });

    this.$.logLevel.addEventListener('confirm', (event) => {
        this.changeProfile('log.level', event.target.value, 'number');
    });
};

exports.close = function() {};