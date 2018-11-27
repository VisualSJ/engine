'use strict';

module.exports = {
    title: 'Build...',
    build: 'Build',
    compile: 'Compile',
    name: 'Name',
    platform: 'Platform',
    build_path: 'Build Path',
    start_scene: 'Start Scene',
    inline_SpriteFrames: 'Inline all SpriteFrames',
    merge_start_scene: 'Merge all JSON that the Start Scene depends on',
    orientation: 'orientation',
    scenes: 'Included Scenes',
    debug: 'Debug',
    resolution: 'preview Resolution',
    preview_url: 'preview URL',
    package_name: 'Package Name',
    select_all: 'Select All',
    open_compile_file: 'Open compile log file',
    source_map: 'Source Maps',
    error: {
        build_error: 'Build Error',
        dirty_info: 'not saved. Please build project after saveing project.',
        build_dir_not_exists: 'Build dir [%{buildDir}] not exists',
        build_path_contains_space: "Build path can't include space.",
        build_path_contains_chinese: "Build path can't include chinese characters.",
        project_name_not_legal: 'Project name is not legal, should only include character: [0-9], [a-z], [A-Z], [_]. And [-] is not support on android.',
        package_name_not_legal: 'Package name is not legal, should only include character: [0-9], [a-z], [A-Z], [_], [.]. And [-] is not support on android.',
        package_name_start_with_number: "Package name can't start with number",
        select_scenes_to_build: 'Please select scenes to build',
        binary_api_level: 'Binary template can only use ApiLevel which is larger or equal to 22. Please change template or ApiLevel.',
        path_too_long_title: 'build path too long error',
        path_too_long_desc: 'you need to keep build path below %{max_length} characters on windows',
        keep_raw_texture_of_atlas: 'Original texture %{texturePath} was already packed to Auto Atlas %{pacPath}, but since the original texture is used directly by %{assetPath}, it will still be retained.',
        arm64_not_support: 'Current API level %{current_api} does not support arm64_v8a , please select android-${min_version} or higher',
    },
    tips: {
        enter_name: 'Please enter the name of the game',
    },
};
