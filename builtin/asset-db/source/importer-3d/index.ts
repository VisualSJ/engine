'use strict';

import JavascriptImporter from './importers/javascript';
import JsonImporter from './importers/json';
import SceneImporter from './importers/scene';
import ImageImporter from './importers/image';
import TextureImporter from './importers/texture';
import TextImporter from './importers/text';
import UnknownImporter from './importers/unknown';
import GltfImporter, { GltfMeshImporter, GltfAnimationImporter, GltfSkeletonImporter, GltfMaterialImporter } from './importers/gltf';

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

    // 虚拟的 sprite-frame 导入
    //database.register(new SpriteFrameImporter());

    // .js | .coffee | .ts | .prefab | spine .json
    // dragonbones json | dragonbones-atlas json | tiled-map tmx |

    database.register(new ImageImporter(), ['.jpg', '.png', 'jpeg', 'webp']);
    database.register(new TextureImporter(), '.texture');

    database.register(new GltfImporter(), '.gltf');
    database.register(new GltfMeshImporter(), '.gltf.mesh');
    database.register(new GltfAnimationImporter(), '.gltf.animation');
    database.register(new GltfSkeletonImporter(), '.gltf.skeleton');
    database.register(new GltfMaterialImporter(), '.gltf.material');
}
