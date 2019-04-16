'use strict';

module.exports = {
    title: '动画编辑器',
    mask: {
        need_select_node: '请选中一个节点来开始动画制作',
        need_animation_component: '要制作动画，需要先为当前节点添加动画组件',
        need_animation_clip: '当前动画组件缺少动画 clip',
        enter_animation_mode: '进入动画编辑模式',
        add_animation_component: '添加 Animation 组件',
        add_animation_clip: '新建 Clip 文件',
    },
    toolbar: {
        exit: '退出动画编辑模式',
        jump_first_frame: '跳转到第一帧',
        jump_prev_frame: '跳转到上一帧',
        play_animation: '播放动画',
        pause_animation: '暂停动画',
        jump_next_frame: '跳转到下一帧',
        insert_event: '插入帧事件',
    },
    property: {
        create_prop: '添加属性轨道',
        remove_prop: '移除当前属性轨道',
        create_key: '添加关键帧',
        remove_key: '移除关键帧',
    },
    event_editor: {
        title: '事件函数',
        add_func: '添加函数',
        del_func: '删除函数',
        add_params: '添加参数',
        del_params: '删除参数',
        clear_params: '清空参数',
    },
    node_tree: {
        move_data: '迁移数据',
        clear_data: '清空数据',
    },
    is_save: '是否保存数据？',
    is_save_message: '修改的数据尚未保存，是否保存？',
    save: '保存',
    abort: '丢弃',
    cancel: '取消关闭',
};
