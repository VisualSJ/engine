'use strcit';

import { CallbacksInvoker } from '../callbacks-invoker';
const assetLibrary = cc.AssetLibrary;
// the asset changed listener
// 这里的回调需要完全由使用者自己维护，AssetLibrary只负责调用。
// @ts-ignore
const assetListener = assetLibrary.assetListener = new CallbacksInvoker();

function removeCaches(url: any) {
    cc.loader.release(url);
}

assetLibrary.onAssetMoved = (uuid: any, src: any, dest: any) => {

};

assetLibrary.onAssetChanged = (uuid: any) => {
    assetLibrary.queryAssetInfo(uuid, (err: any, url: any, isRawAsset: any, ctor: any) => {
        if (err) {
            return;
        }

        removeCaches(uuid);

        if (!assetListener.hasEventListener(uuid)) {
            return;
        }

        if (cc.js.isChildClassOf(ctor, cc.Scene)) {
            return;
        }

        if (isRawAsset) {
            assetListener.invoke(uuid, url);
        } else {
            assetLibrary.loadAsset(uuid, (err: any, asset: any) => {
                assetListener.invoke(uuid, asset);
            });
        }
    });
};

assetLibrary.onAssetRemoved = (uuid: any, url: any) => {
    removeCaches(url);
    // assetListener.invoke(uuid, null);
};
