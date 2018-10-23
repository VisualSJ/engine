'use stirct';

import { Asset, Importer } from 'asset-db';
import { readFile } from 'fs-extra';
import { dirname, join } from 'path';

const plist = require('plist');

const BRACE_REGEX = /[\{\}]/g;
const PATH_SEPERATOR = /[\\\/]/g;

function _parseSize(sizeStr: string) {
    sizeStr = sizeStr.slice(1, -1);
    const arr = sizeStr.split(',');
    const width = parseInt(arr[0], 10);
    const height = parseInt(arr[1], 10);

    // @ts-ignore
    return cc.size(width, height);
}

function _parseVec2(vec2Str: string) {
    vec2Str = vec2Str.slice(1, -1);
    const arr = vec2Str.split(',');
    const x = parseInt(arr[0], 10);
    const y = parseInt(arr[1], 10);

    // @ts-ignore
    return new cc.Vec2(x, y);
}

function _parseTriangles(trianglesStr: string) {
    return trianglesStr.split(' ').map((v) => parseInt(v, 10));
}

function _parseVertices(verticesStr: string) {
    return verticesStr.split(' ').map((v) => parseInt(v, 10));
}

function _parseRect(rectStr: string) {
    rectStr = rectStr.replace(BRACE_REGEX, '');
    const arr = rectStr.split(',');
    return {
        // @ts-ignore
        x: parseInt(arr[0] || 0, 10),
        // @ts-ignore
        y: parseInt(arr[1] || 0, 10),
        // @ts-ignore
        w: parseInt(arr[2] || 0, 10),
        // @ts-ignore
        h: parseInt(arr[3] || 0, 10),
    };
}

export default class TexturePackerImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'texture-packer';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: Asset) {
        const data = plist.parse(await readFile(asset.source, 'utf8'));
        return typeof data.frames !== 'undefined' && typeof data.metadata !== 'undefined';
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
        if (!(await asset.existsInLibrary('.json'))) {

            const data = plist.parse(await readFile(asset.source, 'utf8'));

            const info = data.metadata;

            const texturePath = join(dirname(asset.source), info.realTextureFileName || info.textureFileName);
            asset.rely(texturePath);

            let textureUuid;
            if (this.assetDB) {
                // @ts-ignore
                textureUuid = this.assetDB.pathToUuid(texturePath);
                if (!textureUuid) {
                    return false;
                }
            }

            asset.userData.size = _parseSize(info.size);

            const keys = Object.keys(data.frames);

            for (const key of keys) {
                const child = await this.createSubSpriteFrame(asset, key, data.frames[key], info);
                child.userData.textureUuid = textureUuid;
            }

            const packer = this.createSpriteAtlas(asset);

            // @ts-ignore
            asset.saveToLibrary('.json', Manager.serialize(packer));

            updated = true;
        }

        return updated;
    }

    private createSpriteAtlas(asset: Asset) {
        // @ts-ignore
        const atlas = new cc.SpriteAtlas();
        atlas._name = asset.basename + asset.extname;

        const keys = Object.keys(asset.subAssets);
        const ext_replacer = /\.[^.]+$/;

        for (let key of keys) {
            const subAsset = asset.subAssets[key];
            key = key.replace(ext_replacer, '');
            // @ts-ignore
            atlas._spriteFrames[key] = Manager.serialize.asAsset(subAsset.uuid);
        }

        return atlas;
    }

    private async createSubSpriteFrame(asset: Asset, key: string, frame: any, info: any) {

        // Format meta key
        const metaKey = key.replace(PATH_SEPERATOR, '-');

        // 创建一个 sprite-frame
        const child = await asset.createSubAsset(metaKey, 'sprite-frame');

        let rotated = false;
        let trimmed;
        let sourceSize;
        let offsetStr;
        let textureRect;
        switch (info.format) {
            case 0:
                rotated = false;
                sourceSize = `{${frame.originalWidth},${frame.originalHeight}}`;
                offsetStr = `{${frame.offsetX},${frame.offsetY}}`;
                textureRect = `{{${frame.x},${frame.y}},{${frame.width},${frame.height}}}`;
                break;
            case 1:
            case 2:
                rotated = frame.rotated;
                trimmed = frame.trimmed;
                sourceSize = frame.sourceSize;
                offsetStr = frame.offset;
                textureRect = frame.frame;
                break;
            case 3:
                rotated = frame.textureRotated;
                trimmed = frame.trimmed;
                sourceSize = frame.spriteSourceSize;
                offsetStr = frame.spriteOffset;
                textureRect = frame.textureRect;
                break;
        }

        child.userData.rotated = !!rotated;
        child.userData.trimType = trimmed ? 'custom' : 'auto';
        child.userData.spriteType = 'normal';

        const rawSize = _parseSize(sourceSize);
        child.userData.rawWidth = rawSize.width;
        child.userData.rawHeight = rawSize.height;

        const offset = _parseVec2(offsetStr);
        child.userData.offsetX = offset.x;
        child.userData.offsetY = offset.y;

        const rect = _parseRect(textureRect);
        child.userData.trimX = rect.x;
        child.userData.trimY = rect.y;
        child.userData.width = rect.w;
        child.userData.height = rect.h;

        child.userData.vertices = undefined;

        if (frame.triangles) {
            const triangles = _parseTriangles(frame.triangles);
            const vertices = _parseVertices(frame.vertices);
            const verticesUV = _parseVertices(frame.verticesUV);

            if (vertices.length !== verticesUV.length) {
              console.warn(`
                    [${key}] vertices. \
                    length [${vertices.length}] is different with verticesUV.length [${verticesUV.length}]\
                `);
            } else {
                child.userData.vertices = {
                    triangles,
                    x: [],
                    y: [],
                    u: [],
                    v: []
                };

                for (let i = 0; i < vertices.length; i += 2) {
                    child.userData.vertices.x.push(vertices[i]);
                    child.userData.vertices.y.push(vertices[i + 1]);
                }
                for (let i = 0; i < verticesUV.length; i += 2) {
                    child.userData.vertices.u.push(verticesUV[i]);
                    child.userData.vertices.v.push(verticesUV[i + 1]);
                }
            }
        }

        return child;
    }
}
