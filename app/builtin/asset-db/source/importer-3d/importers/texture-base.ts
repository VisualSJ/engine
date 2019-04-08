'use strict';

export type WrapMode = 'repeat' | 'clamp-to-edge' | 'mirrored-repeat';

export type Filter = 'none' | 'nearest' | 'linear';

export interface TextureBaseAssetUserData {
    wrapModeS: WrapMode;
    wrapModeT: WrapMode;
    minfilter: Filter;
    magfilter: Filter;
    mipfilter: Filter;
    premultiplyAlpha: boolean;
    anisotropy: number;
}

export const defaultMinFilter: Filter = 'linear';
export const defaultMagFilter: Filter = 'linear';
export const defaultMipFilter: Filter = 'linear';
export const defaultWrapModeS: WrapMode = 'repeat';
export const defaultWrapModeT: WrapMode = 'repeat';

export function makeDefaultTextureBaseAssetUserData(): TextureBaseAssetUserData {
    return {
        wrapModeS: defaultWrapModeS,
        wrapModeT: defaultWrapModeT,
        minfilter: defaultMinFilter,
        magfilter: defaultMagFilter,
        mipfilter: defaultMipFilter,
        premultiplyAlpha: false,
        anisotropy: 1,
    };
}

export interface SpriteFrameBaseAssetUserData extends TextureBaseAssetUserData {
    trimType: string;
    trimThreshold: number;
    rotated: boolean;
    offsetX: number;
    offsetY: number;
    trimX: number;
    trimY: number;
    width: number;
    height: number;
    rawWidth: number;
    rawHeight: number;
    borderTop: number;
    borderBottom: number;
    borderLeft: number;
    borderRight: number;
}

export function makeDefaultSpriteFrameBaseAssetUserData(): SpriteFrameBaseAssetUserData {
    const res = makeDefaultTextureBaseAssetUserData() as SpriteFrameBaseAssetUserData;
    res.trimType = 'auto';
    res.trimThreshold = 1;
    res.rotated = false;
    res.offsetX = 0;
    res.offsetY = 0;
    res.trimX = 0;
    res.trimY = 0;
    res.width = 80;
    res.height = 80;
    res.rawWidth = 80;
    res.rawHeight = 80;
    res.borderTop = 0;
    res.borderBottom = 0;
    res.borderLeft = 0;
    res.borderRight = 0;
    return res;
}

// @ts-ignore
export function applyTextureBaseAssetUserData(userData: TextureBaseAssetUserData, texture: cc.Texture2D) {
    const getWrapMode = (wrapMode: WrapMode) => {
        switch (wrapMode) {
            // @ts-ignore
            case 'clamp-to-edge': return cc.TextureBase.WrapMode.CLAMP_TO_EDGE;
            // @ts-ignore
            case 'repeat': return cc.TextureBase.WrapMode.REPEAT;
            // @ts-ignore
            case 'mirrored-repeat': return cc.TextureBase.WrapMode.MIRRORED_REPEAT;
        }
    };
    const getFilter = (filter: Filter) => {
        switch (filter) {
            // @ts-ignore
            case 'nearest': return cc.TextureBase.Filter.NEAREST;
            // @ts-ignore
            case 'linear': return cc.TextureBase.Filter.LINEAR;
            // @ts-ignore
            case 'none': return cc.TextureBase.Filter.NONE;
        }
    };
    texture.setWrapMode(getWrapMode(userData.wrapModeS), getWrapMode(userData.wrapModeT));
    texture.setFilters(getFilter(userData.minfilter), getFilter(userData.magfilter));
    texture.setMipFilter(getFilter(userData.mipfilter));
    texture.setPremultiplyAlpha(userData.premultiplyAlpha);
    texture.setAnisotropy(userData.anisotropy);
}
