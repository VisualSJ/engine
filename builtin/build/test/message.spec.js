'use strict';

const { expect } = require('chai');
const profile = Editor.Profile.load('profile://global/packages/builder.json');

describe('构建设置信息查询测试', () => {
    let platform;
    before(async () => {
        platform = await Editor.Ipc.requestToPackage('build', 'get-builder-setting', 'common.platform');
    });
    describe('get-builder-setting', () => {
        it('查询构建平台设置信息,应与 profile 取得的值一致', async () => {
            let platform = await Editor.Ipc.requestToPackage('build', 'get-builder-setting', 'common.platform');
            expect(platform).to.equal(profile.get('common.platform'));
        });
    });

    describe('set-builder-setting && save-builder-setting', () => {
        it('设置构建平台为 web-desktop', () => {
            Editor.Ipc.sendToPackage('build', 'set-builder-setting', 'common.platform', 'web-desktop');
            Editor.Ipc.sendToPackage('build', 'save-builder-setting');
            // 设置有异步问题
            process.nextTick(() => {
                let plat = profile.get('common.platform');
                expect(plat).to.equal('web-desktop');
            });
        });
    });

    // 还原初始设置
    after(() => {
        Editor.Ipc.sendToPackage('build', 'set-builder-setting', 'common.platform', platform);
    });
});
