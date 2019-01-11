'use strict';

const { readTemplate } = require('../../../../utils');
const { assetComponentPrefix } = require('../../asset-section');

exports.template = readTemplate('3d', './asset-section/assets/image.html');

exports.props = ['info', 'meta'];

exports.components = {
    [`${assetComponentPrefix}image-preview`]: require('../public/image-preview'),
};

exports.data = function() {
    return {
        tab: 'default',
        platforms: ['android', 'ios', 'wechat', 'html5'],
        defaultOption: ['none', 'png', 'jpg', 'webp'],
        extOption: ['pvrtc_4bits', 'pvrtc_4bits_rgb', 'pvrtc_2bits', 'pvrtc_2bits_rgb'],
        formatsInfo: {
            none: 'Select A Format To Add',
            png: 'PNG',
            jpg: 'JPG',
            webp: 'WEBP',
            pvrtc_4bits: 'PVRTC 4bits RGBA',
            pvrtc_4bits_rgb: 'PVRTC 4bits RGB',
            pvrtc_2bits: 'PVRTC 2bits RGBA',
            pvrtc_2bits_rgb: 'PVRTC 2bits RGB',
        },
    };
};

exports.methods = {
    /**
     * 重置
     */
    reset() {
        this.$parent.$emit('reset');
    },

    /**
     * 应用
     */
    apply() {
        this.$parent.$emit('apply');
    },

    /**
     * 添加平台图片格式设置
     * @param {*} event
     */
    addFormats(event) {
        let type = event.target.value;
        event.target.value = 'none';
        if (type === 'none') {
            return;
        }
        if (!this.meta.userData) {
            this.$parent.$emit('updateMeta', `userData`, {});
            this.meta.userData = {};
        }
        let formatSetting = this.meta.userData.platformSettings;
        // 已经添加过当前平台的设置
        if (formatSetting && formatSetting[this.tab] && formatSetting[this.tab][type]) {
            return;
        }
        if (!formatSetting) {
            this.$parent.$emit('updateMeta', `userData.platformSettings`, {});
            formatSetting = {};
        }
        if (!formatSetting[this.tab]) {
            this.$parent.$emit('updateMeta', `userData.platformSettings.${this.tab}`, {});
        }
        this.$parent.$emit('updateMeta', `userData.platformSettings.${this.tab}.${type}`, {
            quality: 0.8,
        });
    },

    /**
     * 删除平台图片格式设置
     * @param {string} type 图片格式 png/jpg...
     */
    delFormats(type) {
        delete this.meta.userData.platformSettings[this.tab][type];
        let value = JSON.parse(JSON.stringify(this.meta.userData.platformSettings[this.tab]));
        this.$parent.$emit('updateMeta', `userData.platformSettings.${this.tab}`, value);
    },

    /**
     * 更改平台图片格式设置
     * @param {*} type
     */
    changeQuality(event, type) {
        let value = event.target.value;
        this.$parent.$emit('updateMeta', `userData.platformSettings.${this.tab}.${type}`, {
            quality: value,
        });
    },
};
