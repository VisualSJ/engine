'use strict';

exports.template = `
    <component
        v-for="(prop, index) in dump.value"
        :key="index"
        :is="prop.compType"
        :name="prop.name"
        :dump="prop"
        :path="prop.path"
        :indent="indent + 1"
    ></component>
`;

exports.props = [
    'name',
    'dump', // dump 数据
    'indent', // 是否需要缩进
    'disabled',
    'readonly',
    'foldable'
];

exports.data = function() {
    return {};
};
