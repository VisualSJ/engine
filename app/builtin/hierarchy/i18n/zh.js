'use strict';

module.exports = {
    title: '层级管理器',

    menu: {
        createMenu: '新建节点',
        searchPlaceholder: '搜索...',
        search: '搜索',
        refresh: '刷新',
        allExpand: '全部展开',
        allCollapse: '全部折叠',

        newNode: '创建',
        newNodeEmpty: '空节点',

        new3dObject: '3D 对象',
        new3dCube: 'Cube 立方体',
        new3dCylinder: 'Cylinder 圆柱体',
        new3dSphere: 'Sphere 球体',
        new3dCapsule: 'Capsule 胶囊',
        new3dCone: 'Cone 圆锥体',
        new3dTorus: 'Torus 圆环体',
        new3dPlane: 'Plane 平面',
        new3dQuad: 'Quad 四方形',

        newLightObject: '光线',
        newLightDirectional: '平行光',
        newLightSphere: '球面光',
        newLightSpot: '聚光',

        newCameraObject: '摄像机',

        newEffects: '特效',
        newEffectsParticle: '粒子系统',

        newUI: 'UI',
        newUICanvas: 'Canvas',
        newUISprite: 'Sprite',
        newUILabel: 'Label',
        newUIButton: 'Button',
        newUIToggle: 'Toggle',
        newUIToggleGroup: 'ToggleGroup',
        newUISlider: 'Slider',
        newUIProgressBar: 'ProgressBar',
        newUIWidget: 'Widget',
        newUIEditBox: 'EditBox',
        newUILayout: 'Layout',
        newUIScrollView: 'ScrollView',
        newUIMask: 'Mask',

        copy: '拷贝',
        paste: '粘贴',
        delete: '删除',
        rename: '重命名',
        duplicate: '复制节点',
        showUuid: '显示节点 UUID',

        link_prefab: '关联节点到 Prefab 资源',
        link_prefab_error_node_empty: '请在层级管理器选择一个节点',
        link_prefab_error_node_isScene: '场景节点不能关联为 Prefab',
        link_prefab_error_asset_empty: '请在资源管理器选择一个 Prefab 资源',
        link_prefab_error_asset_invalid: '请在资源管理器选择有效的 Prefab 资源',
        unlink_prefab: '还原为普通节点',
        unlink_prefab_error_prefab_empty: '请在层级管理器选择一个有效的 Prefab',

        errorNewnameEmpty: '名称不能为空',
    },

    operate: {
        dialogError: '错误',
        dialogWaining: '警告',
        dialogQuestion: '确认',
        dialogInfo: '提示',
        renameFail: '不能对此节点重命名',
    },
};
