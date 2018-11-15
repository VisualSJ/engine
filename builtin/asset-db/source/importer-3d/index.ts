'use strict';

import JavascriptImporter from './importers/javascript';
import JsonImporter from './importers/json';
import SceneImporter from './importers/scene';
import SpriteFrameImporter from './importers/sprite-frame';
import TextImporter from './importers/text';
import TextureImporter from './importers/texture';
import UnknownImporter from './importers/unknown';

export function register(database: any) {
    // 未知类型导入（不处理）
    database.register(new UnknownImporter(), '*');

    // text 导入
    database.register(new TextImporter(), [
        '.txt',
        '.html',
        '.htm',
        '.xml',
        '.css',
        '.less',
        '.scss',
        '.stylus',
        'yaml',
        '.ini',
        '.csv',
        '.proto',
        '.ts',
        '.tsx'
    ]);

    // json 导入
    database.register(new JsonImporter(), ['.json']);

    // javascript 导入
    database.register(new JavascriptImporter(), '.js');

    // 场景文件导入
    database.register(new SceneImporter(), ['.scene', '.fire']);

    // 图片资源导入
    database.register(new TextureImporter(), ['.jpg', '.png', 'jpeg', 'webp']);

    // 虚拟的 sprite-frame 导入
    database.register(new SpriteFrameImporter());

    // .js | .coffee | .ts | .prefab | spine .json
    // dragonbones json | dragonbones-atlas json | tiled-map tmx |
}

export { TextureImporter, SpriteFrameImporter };
