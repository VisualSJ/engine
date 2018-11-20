'use strict';

module.exports = {
    title: '属性检查器',
    add_component: '添加组件',
    add_ui_component: '添加 UI 组件',
    move_down: 'Move Down',
    move_up: 'Move Up',
    remove: 'Remove',
    reset: 'Reset',
    reset_node: 'Reset Node',
    reset_all: 'Reset All',
    select_button: '选择',
    edit_button: '编辑',
    resize_to_target: 'Resize To Target',
    difference: 'Difference',
    javascript: {
        plugin: '导入为插件',
        loadPluginInWeb: '允许 Web 平台加载',
        loadPluginInEditor: '允许编辑器加载',
        loadPluginInNative: '允许 Native 平台加载',
    },
    block_input_events: {
        brief_help:
            '该组件将拦截所有输入事件，防止输入穿透到下层节点，一般用于上层 UI 的背景。',
    },

    node: {
        title: '节点',
        create_empty: '创建空节点',
        renderers: '创建渲染节点',
        ui: '创建 UI 节点',
        sprite: 'Sprite（精灵）',
        sprite_splash: 'Sprite（单色）',
        particle: 'ParticleSystem（粒子）',
        tiledmap: 'TiledMap（地图）',
        tiledtile: 'TiledTile（地图块）',
        label: 'Label（文字）',
        scrollview: 'ScrollView（滚动视图）',
        pageview: 'PageView（页面视图）',
        slider: 'Slider（滑动器）',
        button: 'Button（按钮）',
        canvas: 'Canvas（画布）',
        layout: 'Layout（布局）',
        progressbar: 'ProgressBar（进度条）',
        editbox: 'EditBox（输入框）',
        videoplayer: 'VideoPlayer（播放器）',
        break_prefab_instance: '还原成普通节点',
        link_prefab: '关联节点到预制',
        webview: 'WebView（网页视图）',
        richtext: 'RichText（富文本）',
        toggle: 'Toggle（复选按钮）',
        toggleContainer: 'ToggleContainer（单选按钮）',
        toggleGroup: 'ToggleGroup（旧版单选按钮）',
    },
    component: {
        title: '组件',
        renderers: '添加渲染组件',
        ui: '添加 UI 组件',
        others: '添加其他组件',
        scripts: '添加用户脚本组件',
        collider: '添加碰撞组件',
        physics: '物理',
        // 3d
        components: 'Components',
    },
    collider: {
        editing: '是否需要编辑此碰撞组件',
        category: '碰撞组件所属类别',
        mask: '可以与碰撞组件相碰撞的组件掩码',
        regenerate_points: 'Regenerate Points',
    },
    particle_system: {
        preview:
            '在编辑器模式下预览粒子，启用后选中粒子时，粒子将自动播放',
        custom: '是否自定义粒子属性',
        file: 'plist 格式的粒子配置文件',
        spriteFrame: '粒子贴图定义',
        texture:
            '粒子贴图，只读属性，请使用 spriteFrame 属性来替换贴图',
        particleCount: '当前播放的粒子数量',
        srcBlendFactor: '指定原图混合模式',
        dstBlendFactor: '指定目标的混合模式',
        playOnLoad: '如果设置为 true 运行时会自动发射粒子',
        autoRemoveOnFinish: '粒子播放完毕后自动销毁所在的节点',
        duration: '发射器生存时间，单位秒，-1表示持续发射',
        emissionRate: '每秒发射的粒子数目',
        life: '粒子的运行时间及变化范围',
        totalParticles: '粒子最大数量',
        startColor: '粒子初始颜色',
        startColorVar: '粒子初始颜色变化范围',
        endColor: '粒子结束颜色',
        endColorVar: '粒子结束颜色变化范围',
        angle: '粒子角度及变化范围',
        startSize: '粒子的初始大小及变化范围',
        endSize: '粒子结束时的大小及变化范围',
        startSpin: '粒子开始自旋角度及变化范围',
        endSpin: '粒子结束自旋角度及变化范围',
        sourcePos: '发射器位置',
        posVar: '发射器位置的变化范围。（横向和纵向）',
        positionType: '粒子位置类型',
        emitterMode: '发射器类型',
        gravity: '重力',
        speed: '速度及变化范围',
        tangentialAccel:
            '每个粒子的切向加速度及变化范围，即垂直于重力方向的加速度，只有在重力模式下可用',
        radialAccel:
            '粒子径向加速度及变化范围，即平行于重力方向的加速度，只有在重力模式下可用',
        rotationIsDir:
            '每个粒子的旋转是否等于其方向，只有在重力模式下可用',
        startRadius:
            '初始半径及变化范围，表示粒子出生时相对发射器的距离，只有在半径模式下可用',
        endRadius: '结束半径及变化范围，只有在半径模式下可用',
        rotatePerS:
            '粒子每秒围绕起始点的旋转角度及变化范围，只有在半径模式下可用',
    },
    particle: {
        export_title: '将自定义的粒子数据导出成 plist 文件',
        export: '导出',
        export_error: '该资源不支持导出到项目外',
        sync: '同步',
        sync_tips: '同步 File 中的参数到 Custom',
    },

    physics: {
        rigid_body_last: 'Last',
        rigid_body_next: 'Next',
        rigidbody: {
            enabledContactListener:
                '是否启用接触接听器。当 collider 产生碰撞时，只有开启了接触接听器才会调用相应的回调函数',
            bullet:
                '这个刚体是否是一个快速移动的刚体，并且需要禁止穿过其他快速移动的刚体',
            type:
                '刚体类型： Static（静态）, Kinematic（不受外力）, Dynamic（动态）和 Animated（通过设置线性速度和角速度驱动）',
            allowSleep:
                '如果此刚体永远都不应该进入睡眠，那么设置这个属性为 false。需要注意这将使 CPU 占用率提高',
            gravityScale: '缩放应用在此刚体上的重力值',
            linearDamping:
                'Linear damping 用于衰减刚体的线性速度。衰减系数可以大于 1，但是当衰减系数比较大的时候，衰减的效果会变得比较敏感。',
            angularDamping:
                'Angular damping 用于衰减刚体的角速度。衰减系数可以大于 1，但是当衰减系数比较大的时候，衰减的效果会变得比较敏感。',
            linearVelocity: '刚体在世界坐标下的线性速度',
            angularVelocity: '刚体的角速度',
            fixedRotation: '是否禁止此刚体进行旋转',
            awake: '是否立刻唤醒此刚体',
        },
        physics_collider: {
            density: '密度',
            sensor:
                '一个传感器类型的碰撞体会产生碰撞回调，但是不会发生物理碰撞效果。',
            friction: '摩擦系数，取值一般在 [0, 1] 之间',
            restitution: '弹性系数，取值一般在 [0, 1]之间',
            anchor: '刚体的锚点。',
            connectedAnchor: '关节另一端刚体的锚点。',
            connectedBody: '关节另一端链接的刚体',
            collideConnected:
                '链接到关节上的两个刚体是否应该相互碰撞？',
            distance: '关节两端的距离',
            frequency: '弹性系数。',
            dampingRatio:
                '阻尼，表示关节变形后，恢复到初始状态受到的阻力。',
            linearOffset:
                '关节另一端的刚体相对于起始端刚体的位置偏移量',
            angularOffset:
                '关节另一端的刚体相对于起始端刚体的角度偏移量',
            maxForce: '可以应用于刚体的最大的力值',
            maxTorque: '可以应用于刚体的最大扭矩值',
            correctionFactor: '位置矫正系数，范围为 [0, 1]',
            mouseRegion:
                '用于注册触摸事件的节点。如果没有设置这个值，那么将会使用关节的节点来注册事件。',
            target:
                '目标点，鼠标关节将会移动选中的刚体到指定的目标点',
            localAxisA: '指定刚体可以移动的方向。',
            enableLimit: '是否开启关节的距离限制？',
            enableMotor: '是否开启关节马达？',
            lowerLimit: '刚体能够移动的最小值',
            upperLimit: '刚体能够移动的最大值',
            maxMotorForce: '可以施加到刚体的最大力。',
            motorSpeed: '期望的马达速度。',
            referenceAngle:
                '相对角度。两个物体之间角度为零时可以看作相等于关节角度',
            lowerAngle: '角度的最低限制。',
            upperAngle: '角度的最高限制。',
            maxMotorTorque: '可以施加到刚体的最大扭矩。',
            maxLength: '最大长度。',
            offset: '位置偏移量',
            size: '包围盒大小',
            radius: '圆形半径',
            tag:
                '标签。当一个节点上有多个碰撞组件时，在发生碰撞后，可以使用此标签来判断是节点上的哪个碰撞组件被碰撞了。',
            points: '多边形顶点数组',
        },
    },
    SPRITE_EDITOR: {
        title: 'Sprite 编辑器',
        border: 'Border',
        left: 'Left',
        right: 'Right',
        top: 'Top',
        bottom: 'Bottom',
    },
    missing_script: {
        error_compiled:
            '载入脚本时报错或脚本已丢失，请检查报错信息并进行修正，该组件将在修正后自动还原。如果脚本已删除，请手动删除该组件。',
        error_not_compiled:
            '脚本编译失败，请检查报错信息并进行修正，该组件将在修正后自动还原。',
    },
    empty_component_message: '组件没有可展示属性',
};
