'use strict';

import AnimationImporter from './importers/animation-clip';
import AudioImporter from './importers/audio-clip';
import AutoAtlasImporter from './importers/auto-atlas';
import BitmapFontImporter from './importers/bitmap-font';
import JavascriptImporter from './importers/javascript';
import JsonImporter from './importers/json';
import LabelAtlasImporter from './importers/label-atlas';
import MarkdownImporter from './importers/markdown';
import ParticleImporter from './importers/particle';
import SceneImporter from './importers/scene';
import SpriteFrameImporter from './importers/sprite-frame';
import TextImporter from './importers/text';
import TextureImporter from './importers/texture';
import TexturePackerImporter from './importers/texture-packer';
import TTFFontImporter from './importers/ttf-font';
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

    // text 导入
    database.register(new MarkdownImporter(), ['.md', '.markdown']);

    // 场景文件导入
    database.register(new SceneImporter(), ['.scene', '.fire']);

    // 图片资源导入
    database.register(new TextureImporter(), ['.jpg', '.png', 'jpeg', 'webp']);

    // 动画资源导入
    database.register(new AnimationImporter(), ['.anim']);

    // 音频资源导入
    database.register(new AudioImporter(), ['.mp3', '.wav', '.ogg', '.aac', '.pcm', 'm4a']);

    // Bitmap Font 导入
    database.register(new BitmapFontImporter(), ['.fnt']);

    // Bitmap Font 导入
    database.register(new TTFFontImporter(), ['.ttf']);

    // labelatlas 导入
    database.register(new LabelAtlasImporter(), ['.labelatlas']);

    // auto-atlas 导入
    database.register(new AutoAtlasImporter(), '.pac');

    // 粒子系统导入
    database.register(new ParticleImporter(), '.plist');

    // texture packer 导入
    database.register(new TexturePackerImporter(), '.plist');

    // 虚拟的 sprite-frame 导入
    database.register(new SpriteFrameImporter());

    // .js | .coffee | .ts | .prefab | spine .json
    // dragonbones json | dragonbones-atlas json | tiled-map tmx |
}

export { TextureImporter, SpriteFrameImporter };
