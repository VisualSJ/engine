'use strict';

import JavascriptImporter from './importers/javascript';
import SceneImporter from './importers/scene';

export function register(database: any) {

    // 场景文件导入
    database.register(new SceneImporter(), ['.scene', '.fire']);

    // // javascript 导入
    // database.register(new JavascriptImporter(), '.js');
}
