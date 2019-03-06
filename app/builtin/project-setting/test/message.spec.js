'use strict';

const { expect } = require('chai');
const profile = Editor.Profile.load('profile://global/packages/project-setting.json');

describe('项目设置消息接口测试', () => {
    let design_width;
    before(async () => {
        design_width = await Editor.Ipc.requestToPackage('project-setting', 'get-setting', 'preview.design_width');
    });
    describe('get-setting：查询设置信息', () => {
        it('查询预览的分辨率宽度设置,应与 profile 取得的值一致', async () => {
            let width = await Editor.Ipc.requestToPackage('project-setting', 'get-setting', 'preview.design_width');
            expect(width).to.equal(profile.get('preview.design_width'));
        });
    });

    describe('set-setting && save-setting：写入/保存项目配置', () => {
        it('设置预览的分辨率宽度为600', () => {
            Editor.Ipc.sendToPackage('project-setting', 'set-setting', 'preview.design_width', 600);
            Editor.Ipc.sendToPackage('project-setting', 'save-setting');
            // 设置有异步问题
            process.nextTick(() => {
                let language = profile.get('preview.design_width');
                expect(language).to.equal(600);
            });
        });
    });

    // 还原初始设置
    after(() => {
        Editor.Ipc.sendToPackage('project-setting', 'set-setting', 'preview.design_width', design_width);
    });
});
