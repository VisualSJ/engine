'use strict';

type WrapMode = 'repeat' | 'clamp-to-edge' | 'mirrored-repeat';

type Filter = 'nearest' | 'linear';

export interface TextureBaseAssetUserData {
    wrapModeS: WrapMode;
    wrapModeT: WrapMode;
    minfilter: Filter;
    magfilter: Filter;
    premultiplyAlpha: boolean;
    anisotropy: number;
}

export function makeDefaultTextureBaseAssetUserData(): TextureBaseAssetUserData {
    return {
        wrapModeS: 'clamp-to-edge',
        wrapModeT: 'clamp-to-edge',
        minfilter: 'linear',
        magfilter: 'linear',
        premultiplyAlpha: false,
        anisotropy: 1,
    };
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
        }
    };
    texture.setWrapMode(getWrapMode(userData.wrapModeS), getWrapMode(userData.wrapModeT));
    texture.setFilters(getFilter(userData.minfilter), getFilter(userData.magfilter));
    texture.setPremultiplyAlpha(userData.premultiplyAlpha);
    texture.setAnisotropy(userData.anisotropy);
}
