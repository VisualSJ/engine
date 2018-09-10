'use strict';

import ImageImporter from './image';
import SpriteImporter from './sprite';

export function register(database: any) {
    database.register(new ImageImporter(), '.jpg');
    database.register(new ImageImporter(), '.png');
    database.register(new SpriteImporter());
}

export { ImageImporter, SpriteImporter };
