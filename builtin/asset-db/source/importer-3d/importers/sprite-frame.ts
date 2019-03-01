'use strict';

import { Asset } from '@editor/asset-db';
import { clamp, getTrimRect } from '../utils';
import { getImageData } from '../utils';
import TextureImporter from './texture';
import {
    applyTextureBaseAssetUserData,
    makeDefaultSpriteFrameBaseAssetUserData,
    SpriteFrameBaseAssetUserData,
    TextureBaseAssetUserData
} from './texture-base';
export interface SpriteFrameAssetUserData extends SpriteFrameBaseAssetUserData {
    isUuid?: boolean;
    imageUuidOrDatabaseUri: string;
}

export function makeDefaultSpriteFrameAssetUserData(): SpriteFrameBaseAssetUserData {
    return makeDefaultSpriteFrameBaseAssetUserData();
}

export function makeDefaultSpriteFrameAssetUserDataFromImageUuid(uuid: string): SpriteFrameAssetUserData {
    return Object.assign(makeDefaultSpriteFrameBaseAssetUserData(), {
        isUuid: true,
        imageUuidOrDatabaseUri: uuid,
    });
}

export default class SpriteFrameImporter extends TextureImporter {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.3';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'sprite-frame';
    }

    get assetType() {
        return 'cc.SpriteFrame';
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
        if (!asset.parent) {
            return false;
        }

        if (Object.getOwnPropertyNames(asset.userData).length === 0) {
            Object.assign(asset.userData, makeDefaultSpriteFrameBaseAssetUserData());
        }

        if (asset.parent.meta.importer === 'image') {
            const userData = asset.userData as SpriteFrameBaseAssetUserData;
            // @ts-ignore
            const file = asset.parent.source;

            const imageData = await getImageData(file);

            userData.trimThreshold = 1;
            userData.rotated = false;

            if (imageData) {
                userData.rawWidth = imageData.width;
                userData.rawHeight = imageData.height;

                const rect = getTrimRect(
                    Buffer.from(imageData.data.buffer),
                    userData.rawWidth,
                    userData.rawHeight,
                    userData.trimThreshold
                );
                userData.trimX = rect[0];
                userData.trimY = rect[1];
                userData.width = rect[2];
                userData.height = rect[3];
            }

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
        }

        // userData.vertices = undefined;

        const spriteFrame = this.createSpriteFrame(asset);
        applyTextureBaseAssetUserData(asset.userData as TextureBaseAssetUserData, spriteFrame);
        const imageAsset = this._getImageAsset(asset);
        if (imageAsset) {
            spriteFrame._mipmaps = [imageAsset];
        }

        // @ts-ignore
        await asset.saveToLibrary('.json', Manager.serialize(spriteFrame));

        return true;
    }

    private createSpriteFrame(asset: Asset) {
        const userData = asset.userData;

        // @ts-ignore
        const sprite = new cc.SpriteFrame();
        sprite.name = 'sprite-frame';

        // @ts-ignore
        sprite.setOriginalSize(cc.size(userData.rawWidth, userData.rawHeight));
        // @ts-ignore
        // sprite.setRect(cc.rect(0, 0, userData.width, userData.height));
        // sprite._textureFilename = userData.textureFile;
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

        sprite._setBorder(
            userData.borderLeft,
            userData.borderBottom,
            userData.borderRight,
            userData.borderTop
        );

        // sprite.vertices = userData.vertices;

        // @ts-ignore
        sprite.setOffset(cc.v2(userData.offsetX, userData.offsetY));

        return sprite;
    }

    // private serialize(sprite: any, asset: VirtualAsset | Asset) {
    //     const rect = sprite._rect;
    //     const offset = sprite._offset;
    //     const size = sprite._originalSize;
    //     const uuid = asset.userData.textureUuid;

    //     // if (uuid && exporting) {
    //     //     uuid = Editor.Utils.UuidUtils.compressUuid(uuid, true);
    //     // }

    //     let capInsets;
    //     if (
    //         sprite.insetLeft ||
    //         sprite.insetTop ||
    //         sprite.insetRight ||
    //         sprite.insetBottom
    //     ) {
    //         capInsets = [
    //             sprite.insetLeft,
    //             sprite.insetTop,
    //             sprite.insetRight,
    //             sprite.insetBottom,
    //         ];
    //     }

    //     let vertices;
    //     if (sprite.vertices) {
    //         vertices = {
    //             triangles: sprite.vertices.triangles,
    //             x: sprite.vertices.x,
    //             y: sprite.vertices.y,
    //             u: sprite.vertices.u,
    //             v: sprite.vertices.v,
    //         };
    //     }

    //     return {
    //         name: sprite._name,
    //         texture: uuid || undefined,
    //         atlas: sprite._atlasUuid || '', // strip from json if exporting
    //         rect: rect ? [rect.x, rect.y, rect.width, rect.height] : undefined,
    //         offset: offset ? [offset.x, offset.y] : undefined,
    //         originalSize: size ? [size.width, size.height] : undefined,
    //         rotated: sprite._rotated ? 1 : undefined,
    //         capInsets,
    //         vertices,
    //     };
    // }
}
