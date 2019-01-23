'use strict';

import { AssetDB } from '@editor/asset-db';
import BufferImporter from './importers/buffer';
import EffectImporter from './importers/effect';
import FbxImporter from './importers/fbx';
import GltfImporter, {
    GltfAnimationImporter,
    GltfImageImporter,
    GltfMaterialImporter,
    GltfMeshImporter,
    GltfPrefabImporter,
    GltfSkeletonImporter
} from './importers/gltf';
import ImageImporter from './importers/image';
import JavascriptImporter from './importers/javascript';
import JsonImporter from './importers/json';
import MaterialImporter from './importers/material';
import PrefabImporter from './importers/prefab';
import SceneImporter from './importers/scene';
import SpriteFrameImporter from './importers/sprite-frame';
import TextImporter from './importers/text';
import TextureImporter from './importers/texture';
import TextureCubeImporter, { TextureCubeFaceImporter } from './importers/texture-cube';
import TTFFontImporter from './importers/ttf-font';
import UnknownImporter from './importers/unknown';

export function register(database: AssetDB) {
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
        '.tsx',
    ]);

    // json 导入
    database.register(new JsonImporter(), ['.json']);

    // javascript 导入
    database.register(new JavascriptImporter(), '.js');

    // 场景文件导入
    database.register(new SceneImporter(), ['.scene', '.fire']);

    // 虚拟的 sprite-frame 导入
    database.register(new SpriteFrameImporter());

    // .js | .coffee | .ts | .prefab | spine .json
    // dragonbones json | dragonbones-atlas json | tiled-map tmx |

    // bin 文件导入
    database.register(new BufferImporter(), ['.bin']);

    database.register(new ImageImporter(), ['.jpg', '.png', 'jpeg', 'webp']);
    database.register(new TextureImporter(), '.texture');
    database.register(new TextureCubeImporter(), '.texture-cube');
    database.register(new TextureCubeFaceImporter(), '.texture-cube-face');

    database.register(new GltfImporter(), '.gltf');
    database.register(new GltfMeshImporter());
    database.register(new GltfAnimationImporter());
    database.register(new GltfSkeletonImporter());
    database.register(new GltfMaterialImporter());
    database.register(new GltfPrefabImporter());
    database.register(new GltfImageImporter());

    database.register(new FbxImporter(), '.fbx');

    database.register(new MaterialImporter(), '.mtl');
    database.register(new PrefabImporter(), '.prefab');
    database.register(new EffectImporter(), '.effect');
    database.register(new TTFFontImporter(), '.ttf');
}
