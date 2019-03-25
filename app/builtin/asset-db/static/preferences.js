'use strict';

const profile = Editor.Profile.load('profile://global/packages/asset-db.json');

exports.template = `
<ui-prop
    label="日志等级"
>
    <ui-select class="log-level" slot="content">
        <option value="1">仅输出错误</option>
        <option value="2">仅输出错误、警告</option>
        <option value="3">输出错误、警告以及日志</option>
        <option value="4">输出所有信息</option>
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