'use strict';

const { expect } = require('chai');
const profile = Editor.Profile.load('profile://global/packages/preferences.json');

describe('偏好设置消息接口测试', () => {
    let lan;
    before(async () => {
        lan = await Editor.Ipc.requestToPackage('preferences', 'get-setting', 'general.language');
    });
    describe('get-setting：查询设置信息', () => {
        it('查询语言设置信息,应与 profile 取得的值一致', async () => {
            let language = await Editor.Ipc.requestToPackage('preferences', 'get-setting', 'general.language');
            expect(language).to.equal(profile.get('general.language'));
        });
    });

    describe('set-setting && save-setting：写入/保存项目配置', () => {
        it('设置语言为en', () => {
            Editor.Ipc.sendToPackage('preferences', 'set-setting', 'general.language', 'en');
            Editor.Ipc.sendToPackage('preferences', 'save-setting');
            // 设置有异步问题
            process.nextTick(() => {
                let language = profile.get('general.language');
                expect(language).to.equal('en');
            });
        });
    });

    describe('update-tab： 设置面板的 tab 索引', () => {
        // 先归 0
        Editor.Ipc.sendToPackage('preferences', 'update-tab', 0);
        it('tab 值设为2', () => {
            Editor.Ipc.sendToPackage('preferences', 'update-tab', 0);
            // todo E2E 测试
        });
    });

    after(() => {
        Editor.Ipc.sendToPackage('preferences', 'set-setting', 'general.language', lan);
    });
});
