'use strict';

module.exports = {
    title: 'animation',
    loading_tips: 'Loading animation data, please wait...',
    mask: {
        need_select_node: 'Select a Node to get started',
        need_animation_component: 'The current node has no animation components',
        need_animation_clip: 'Current animation component lacks animation clip',
        enter_animation_mode: 'Enter animation editing mode',
        add_animation_component: 'Add the Animation component',
        add_animation_clip: 'Create a new Clip file.',
    },
    toolbar: {
        exit: 'Exit animaiton edit mode',
        jump_first_frame: 'Skip to frame 1',
        jump_prev_frame: 'Jump to the previous frame',
        play_animation: 'Play animation',
        pause_animation: 'Pause animation',
        jump_next_frame: 'Skip to the next frame',
        jump_last_frame: 'Jump to the last frame',
        insert_event: 'Insert frame\'s event',
    },
    property_tools: {
        create_prop: 'Add prop track',
        remove_prop: 'Remove prop track',
        clear_keys: 'Clear keyframes data',
        create_key: 'Add keyframe',
        remove_key: 'Remove keyframe',
        copy_key: 'Copy keyframe',
        paste_key: 'Paste keyframe',
    },
    event: {
        add_func: 'add function',
        del_func: 'delete function',
        add_params: 'add param',
        del_params: 'delete param',
        clear_params: 'clear param',
        create: 'New frame event',
        paste: 'Paste frame event',
    },
    bezier: {
        title: 'Bezier Editor',
    },
    node_tree: {
        move_data: 'Move data',
        move_data_to: 'Move data To This Node',
        clear_data: 'Clear data',
    },
    preview_row: {
        line_tips: 'Double click to edit curve',
        open_curve_editor: 'Open the curve editor',
    },
    is_save: 'Do you need to save it?',
    is_save_message: 'The data has been modified. Do you need to save it?',
    is_paste_overwrite: 'Do you want to overwrite the original keyframes?',
    is_paste_overwrite_message: 'This paste will overwrite the original keyframe. Do you want to continue pasting?',
    overwrite: 'overwrite',
    is_clear: 'Do you want to clear this data?',
    is_clear_message: 'That will clear the keyframe, will it continue?',
    is_move_data: 'Do you want to migrate data to the current node?',
    is_move_data_message: 'This operation will overwrite all key frame data of the original node, Do you want to continue?',
    move: 'move',    
    clear: 'clear',
    copy: 'copy',
    paste: 'paste',
    save: 'save',
    abort: 'abort',
    cancel: 'cancel',
    edit: 'edit',
    delete: 'delete',
};
