'use strict';

// 一个简单的验证测试和一个带标题的可是窗口
const ps = require('path');
const spectron = require('spectron');
const { expect } = require('chai');
const electronPath = require('electron');

const selector = require('./1.dashboard.spec/selector');


describe('测试 Dashboard', () => {

    before(function() {
        this.timeout(10000);
        this.app = new spectron.Application({
            path: electronPath,
            args: [ps.join(__dirname, '../app')]
        });
        return this.app.start();
    });

    after(function() {
        // 停止应用
        return this.app.stop();
    });

    it('启动 Dashboard', async function() {
        this.timeout(10000);
        expect(await this.app.client.getWindowCount()).to.be.equal(1);
    });

    it('切换选项卡', async function() {
        this.timeout(10000);
        
        return this.app.client
            // 默认选项卡
            .waitForVisible(selector.content.project)
            // 模拟点击选项卡
            .click(selector.typeTab.create)
            .waitForVisible(selector.content.create)
            .click(selector.typeTab.help)
            .waitForVisible(selector.content.help)
            .click(selector.typeTab.project)
            .waitForVisible(selector.content.project);
    });

    it('新建项目', async function() {
        this.timeout(10000);
        
        return this.app.client
            // 切换到项目
            .click(selector.typeTab.create)
            .waitForVisible(selector.content.create)

            // .click(selector.create.createBtn);
    });
});