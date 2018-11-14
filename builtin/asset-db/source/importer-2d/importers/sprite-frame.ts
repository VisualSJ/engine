'use strict';

import { Asset, Importer, VirtualAsset } from 'asset-db';
import { existsSync } from 'fs';
import { clamp, getTrimRect } from '../utils';

const imageUtils = require('../../../static/utils/image');

export default class SpriteImporter extends Importer {
    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.1';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'sprite-frame';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: VirtualAsset | Asset) {
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
        // 如果没有生成 json 文件，则重新生成
        if ((await asset.existsInLibrary('.json')) || !asset.parent) {
            return updated;
        }

        // 如果是 texture 导入的，则自动识别一些配置参数
        if (asset.parent.meta.importer === 'texture') {
            // @ts-ignore
            const file = asset.parent.library + (asset.parent.extname || '');

            if (!file || !existsSync(file)) {
                throw new Error(
                    `Spriteframe import failed: The picture file [${
                        asset.userData.textureUuid
                    }] does not exist`
                );
            }

            const userData = asset.userData;
            const imageData = await imageUtils.getImageData(file);

            userData.trimThreshold = 1;
            userData.rotated = false;

            userData.rawWidth = imageData.width;
            userData.rawHeight = imageData.height;

            const rect = getTrimRect(
                imageData.data,
                userData.rawWidth,
                userData.rawHeight,
                userData.trimThreshold
            );
            userData.trimX = rect[0];
            userData.trimY = rect[1];
            userData.width = rect[2];
            userData.height = rect[3];

            userData.offsetX =
                userData.trimX + userData.width / 2 - userData.rawWidth / 2;
            userData.offsetY = -(
                userData.trimY +
                userData.height / 2 -
                userData.rawHeight / 2
            );

            userData.borderTop = clamp(
                userData.borderTop || 0,
                0,
                userData.height - (userData.borderBottom || 0)
            );
            userData.borderBottom = clamp(
                userData.borderBottom || 0,
                0,
                userData.height - (userData.borderTop || 0)
            );
            userData.borderLeft = clamp(
                userData.borderLeft || 0,
                0,
                userData.width - (userData.borderRight || 0)
            );
            userData.borderRight = clamp(
                userData.borderRight || 0,
                0,
                userData.width - (userData.borderLeft || 0)
            );

            userData.vertices = undefined;
        }

        const sprite = this.createSpriteFrame(asset);
        asset.saveToLibrary(
            '.json',
            JSON.stringify(
                {
                    __type__: 'cc.SpriteFrame',
                    content: this.serialize(sprite, asset)
                },
                null,
                2
            )
        );

        updated = true;

        return updated;
    }

    private createSpriteFrame(asset: Asset) {
        const userData = asset.userData;

        // @ts-ignore
        const sprite = new cc.SpriteFrame();
        sprite.name = 'sprite-frame';

        // @ts-ignore
        sprite.setOriginalSize(cc.size(userData.rawWidth, userData.rawHeight));
        // @ts-ignore
        sprite.setRect(cc.rect(0, 0, userData.width, userData.height));
        sprite._textureFilename = userData.textureFile;
        // @ts-ignore
        sprite.setRect(
            // @ts-ignore
            cc.rect(
                userData.trimX,
                userData.trimY,
                userData.width,
                userData.height
            )
        );
        sprite.setRotated(userData.rotated);

        sprite.insetTop = userData.borderTop;
        sprite.insetBottom = userData.borderBottom;
        sprite.insetLeft = userData.borderLeft;
        sprite.insetRight = userData.borderRight;

        sprite.vertices = userData.vertices;

        // @ts-ignore
        sprite.setOffset(cc.v2(userData.offsetX, userData.offsetY));

        return sprite;
    }

    private serialize(sprite: any, asset: VirtualAsset | Asset) {
        const rect = sprite._rect;
        const offset = sprite._offset;
        const size = sprite._originalSize;
        const uuid = asset.userData.textureUuid;

        // if (uuid && exporting) {
        //     uuid = Editor.Utils.UuidUtils.compressUuid(uuid, true);
        // }

        let capInsets;
        if (
            sprite.insetLeft ||
            sprite.insetTop ||
            sprite.insetRight ||
            sprite.insetBottom
        ) {
            capInsets = [
                sprite.insetLeft,
                sprite.insetTop,
                sprite.insetRight,
                sprite.insetBottom
            ];
        }

        let vertices;
        if (sprite.vertices) {
            vertices = {
                triangles: sprite.vertices.triangles,
                x: sprite.vertices.x,
                y: sprite.vertices.y,
                u: sprite.vertices.u,
                v: sprite.vertices.v
            };
        }

        return {
            name: sprite._name,
            texture: uuid || undefined,
            atlas: sprite._atlasUuid || '', // strip from json if exporting
            rect: rect ? [rect.x, rect.y, rect.width, rect.height] : undefined,
            offset: offset ? [offset.x, offset.y] : undefined,
            originalSize: size ? [size.width, size.height] : undefined,
            rotated: sprite._rotated ? 1 : undefined,
            capInsets,
            vertices
        };
    }
}
