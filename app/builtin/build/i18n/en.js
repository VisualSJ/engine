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
    force_combile_engin: 'Force Recompilation Of Engine',
    debug_mode: 'Open Build DevTools',
    eruda: 'eruda',
    require: 'require',
    wechat_game: {
        client_path_error: 'Can not find wechat game develop program path [%{path}].',
        client_info_path_err: 'Can not find wechat game develop program version information path [%{path}].',
        client_version_low: 'Wechat game develop version is too low, please upgrade to the newest version.',
        remote_server_address: 'Remote server address',
        remote_server_address_tips: 'The address of the server used to download the remote resources. ' +
                                      'Because the WeChat game limits the native packet size to 4 mb, if it is greater than that, ' +
                                      'it can save some resources to the server for download.',
        sub_context: 'Open Data Context Root',
        sub_context_tips: 'The open data context is also called the open data field. ' +
                            'Here is the code directory that specifies the open data context. ' +
                            'It is automatically configured into game.json.',
        build_sub: 'Open Data Context Project',
        build_sub_tips: 'Developer should create individual project for open data context scene (e.g. leaderboard). ' +
                          'This option will pack everything in the project to be running in open data context environment.',
    },
    error: {
        build_error: 'Build Error',
        dirty_info: 'not saved. Please build project after saveing project.',
        build_dir_not_exists: 'Build dir [%{buildDir}] not exists',
        build_path_contains_space: "Build path can't include space.",
        build_path_contains_chinese: "Build path can't include chinese characters.",
        project_name_not_legal: 'Project name is not legal, should only include character: [0-9], [a-z], [A-Z], [_].',
        package_name_not_legal: 'Package name is not legal, should only include character: [0-9], [a-z], [A-Z], [_], [.].',
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
