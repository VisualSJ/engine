'use strict';

exports.components = {
    'ui-prop': require('../ui-prop'),
};

exports.template = `
    <ui-prop
        :name="dump.name"
        :indent="indent"
        foldable
    >
        <template slot="child" v-for="(prop, key) in dump.value">
            <ui-prop
                :key="key"
                v-if="prop.attrs.visible !== false"
                :comp-type="prop.compType"
                :dump="prop"
                :indent="indent + 1"
            ></ui-prop>
        </template>
    </ui-prop>
`;

exports.props = [
    'dump', // dump 数据
    'indent', // 是否需要缩进
];

exports.data = function() {
    return {};
};
