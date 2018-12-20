import { Asset, Importer } from '@editor/asset-db';
const TMX_ENCODING = { encoding: 'utf-8' };
const DOMParser = require('xmldom').DOMParser;
const fs = require('fs');
const path = require('path');

/**
 * 读取 tmx 文件内容，查找依赖的 texture 文件信息
 * @param tmxFile tmx 文件路径
 * @param tmxFileData tmx 文件内容
 */
function searchDependFiles(tmxFile: any, tmxFileData: any) {
    // 读取 xml 数据
    const doc = new DOMParser().parseFromString(tmxFileData);
    if (!doc) {
        // @ts-ignore
        return cb(new Error(cc.debug.getError(7222, tmxFile)));
    }
    let textures: any[] = [];
    const tsxFiles: any[] = [];
    let textureNames: any[] = [];
    const rootElement = doc.documentElement;
    const tilesetElements = rootElement.getElementsByTagName('tileset');
    // 读取内部的 source 数据
    Array.prototype.forEach.call(tilesetElements, (tileset: any) => {
        const sourceTSX = tileset.getAttribute('source');
        if (sourceTSX) {
            // 获取 texture 路径
            const tsxPath = path.join(path.dirname(tmxFile), sourceTSX);
            if (fs.existsSync(tsxPath)) {
                tsxFiles.push(sourceTSX);
                const tsxContent = fs.readFileSync(tsxPath, 'utf-8');
                const tsxDoc = new DOMParser().parseFromString(tsxContent);
                if (tsxDoc) {
                    const { srcs, names } = parseTilesetImages(tsxDoc, tsxPath);
                    textures.concat(srcs);
                    textureNames.concat(names);
                } else {
                    console.warn('Parse %s failed.', tsxPath);
                }
            }
        }
        // import images
        const { srcs, names } = parseTilesetImages(tileset, tmxFile);
        textures = textures.concat(srcs);
        textureNames = textureNames.concat(names);
    });
    return { textures, tsxFiles, textureNames };
}

/**
 * 读取文件路径下 image 的 source 路径信息以及对应的文件名
 * @param tilesetNode
 * @param sourcePath
 * @returns {srcs, names}
 */
function parseTilesetImages(tilesetNode: any, sourcePath: any) {
    const images = tilesetNode.getElementsByTagName('image');
    const srcs: any[] = [];
    const names: any[] = [];
    Array.prototype.forEach.call(images, (image: any) => {
        const imageCfg = image.getAttribute('source');
        if (imageCfg) {
            const imgPath = path.join(path.dirname(sourcePath), imageCfg);
            srcs.push(imgPath);
            const textureName = path.basename(imgPath);
            names.push(textureName);
        }
    });
    return { srcs, names };
}
export default class TiledMapImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.1';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'tiled-map';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: Asset) {
        return true;
    }

    /**
     * 实际导入流程
     * 需要自己控制是否生成、拷贝文件
     *
     * 返回是否更新的 boolean
     * 如果返回 true，则会更新依赖这个资源的所有资源
     * @param asset
     */
    public async import(asset: Asset) {
        let updated = false;

        // 如果当前资源没有导入，则开始导入当前资源
        if (!(await asset.existsInLibrary(asset.extname))) {
            await asset.copyToLibrary(asset.extname, asset.source);
            updated = true;
        }

        // 如果当前资源没有生成 tield-map，则开始生成 tield-map
        if (!(await asset.existsInLibrary('.json'))) {
            // @ts-ignore
            const tiledMap = new cc.TiledMap();
            // 读取 tield-map 文件内的数据
            const data = fs.readFileSync(asset.source, TMX_ENCODING);
            tiledMap.tmxXmlStr = data;
            // 查询获取对应的 texture 依赖文件信息
            const info = searchDependFiles(asset.source, data);
            tiledMap.textures = info.textures;
            tiledMap.tsxFiles = info.tsxFiles;
            tiledMap.textureNames = info.textureNames;
            asset.saveToLibrary('.json', JSON.stringify({
                __type__: 'cc.TiledMap',
                content: this.serialize(tiledMap, asset),
            }, null, 2));
            updated = true;
        }
        return updated;
    }

    /**
     * 序列化 TiledMap 数据
     * @private
     * @param {*} tiledMap
     * @param {Asset} asset
     * @returns {object} 序列化后的 tilrmap 数据
     * @memberof TiledMapImporter
     */
    private serialize(tiledMap: any, asset: Asset) {
        const { textures, tmxXmlStr, tsxFiles } = tiledMap;
        const textUuids: any[] = [];
        textures.map((src: string) => {
            // @ts-ignore
            textUuids.push({ __uuid__: this.assetDB.pathToUuid(src) });
        });
        return {
            _name: asset.basename,
            _objFlags: 0,
            _rawFiles: null,
            tmxXmlStr,
            tmxFolderPath: asset.source,
            textures: textUuids,
            tsxFiles,
        };
    }
}
