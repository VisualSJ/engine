'use strict';

import SceneImporter from './scene';
import SpriteFrameImporter from './sprite-frame';
import TextureImporter from './texture';
import UnknownImporter from './unknown';

export function register(database: any) {

    // 未知类型导入（不处理）
    database.register(new UnknownImporter(), '*');

    // 场景文件导入
    database.register(new SceneImporter(), ['.scene', '.fire']);

    // 图片资源导入
    database.register(new TextureImporter(), ['.jpg', '.png']);

    // 虚拟的 sprite-frame 导入
    database.register(new SpriteFrameImporter());
}

export { TextureImporter, SpriteFrameImporter };
