'use strict';

const { readFileSync } = require('fs');
const { join } = require('path');

exports.template = readFileSync(join(__dirname, '../template/asset-tree.html'), 'utf8');

exports.components = {
    'asset-item': require('./asset-item'),
};

exports.props = [
    'list',
    'fold',
    'length',
    'total',
    'selects',
    'index',
    'copy',
    'rename',
    'filter',
    'bindex',
    'blength',
];

exports.data = function() {
    return {
        // 外框的样式
        contentStyle: {
            height: this.total * 20 + 'px',
        },

        // 遮罩的样式
        maskStyle: {
            top: this.bindex !== -1 ? this.bindex * 20 + 'px' : '-1000px',
            height: this.blength * 20 + 'px',
        },
    };
};

exports.watch = {
    /**
     * 显示的总条数更改的时候，需要更新外框的高度
     */
    total() {
        this.contentStyle.height = this.total * 20 + 'px';
    },

    /**
     * box 索引更改的时候，需要更新 box 的 top 值
     */
    bindex() {
        this.maskStyle.top = this.bindex !== -1 ? this.bindex * 20 + 'px' : '-1000px';
    },

    /**
     * box 长度更改的时候，需要更新 box 的 height 值
     */
    blength() {
        this.maskStyle.height = this.blength * 20 + 'px';
    },
};

exports.methods = {

    /**
     * 滚动了整个显示树
     */
    _onTreeScroll(event) {
        event.stopPropagation();
        this.$root.$emit('change-index', this.$el.scrollTop / 20 | 0);
    },

    /**
     * 放置到树形结构上
     */
    _onTreeDrop(event) {
        const uuids = event.dataTransfer.getData('value').split(',').filter(Boolean);
        const files = Array.prototype.map.call(event.dataTransfer.files, (item) => {
            return item.path;
        });
        this.$root.$emit('drop', uuids, files);
    },

    /**
     * 点击空白区域
     */
    _onTreeClick(event) {
        event.stopPropagation();
        this.$root.$emit('select-asset', null);
    },
};

exports.mounted = function() {};
