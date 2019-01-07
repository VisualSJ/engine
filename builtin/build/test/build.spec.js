const { expect } = require('chai');

describe('构建发布接口测试', () => {

    describe('build：开始构建', () => {
        // todo:更多的对构建结果的测试
        it('构建发布', async () => {
            // todo
        });
    });

    describe('build-setting：构建 setting 脚本', () => {
        it('构建的 setting 需要有 launchScene 属性', async () => {
            const setting = await Editor.Ipc.requestToPackage('build', 'build-setting', {
                debug: true,
                type: 'preview', // 构建 setting 的种类
                platform: 'web-desktop',
            });
            expect(setting).to.have.property('launchScene');
        });
    });
});
