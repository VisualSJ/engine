'use strict';

import SceneImporter from './scene';
import SpriteFrameImporter from './sprite-frame';
import TextureImporter from './texture';

export function register(database: any) {

    database.register(new SceneImporter(), '.scene');

    // database.register(new TextureImporter(), '.jpg');
    database.register(new TextureImporter(), '.png');

    database.register(new SpriteFrameImporter());
}

export { TextureImporter, SpriteFrameImporter };
