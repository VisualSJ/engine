'use strcit';

import { CallbacksInvoker } from '../callbacks-invoker';
const assetLibrary = cc.AssetLibrary;
// the asset changed listener
// 这里的回调需要完全由使用者自己维护，AssetLibrary只负责调用。
// @ts-ignore
const assetListener = assetLibrary.assetListener = new CallbacksInvoker();
const dependListener = assetLibrary.dependListener = new CallbacksInvoker();

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

        if (!assetListener.hasEventListener(uuid) && !dependListener.hasEventListener(uuid)) {
            return removeCaches(uuid);
        }

        if (cc.js.isChildClassOf(ctor, cc.Scene)) {
            return removeCaches(uuid);
        }

        if (isRawAsset) {
            removeCaches(uuid);
            assetListener.invoke(uuid, url);
            dependListener.invoke(uuid, url);
        } else {
            const id = cc.loader._getReferenceKey(uuid);
            const oldItem = cc.loader.removeItem(id);
            const oldAsset = oldItem.content;
            if (oldAsset instanceof cc.Asset) {
                const nativeUrl = oldAsset.nativeUrl;
                if (nativeUrl) {
                    removeCaches(nativeUrl);
                }
            }
            assetLibrary.loadAsset(uuid, (err: any, asset: any) => {
                assetListener.invoke(uuid, asset);
                dependListener.invoke(uuid, oldAsset, asset);
                if (oldAsset instanceof cc.Asset) {
                    oldAsset.destroy();
                }
            });
        }
    });
};

assetLibrary.onAssetRemoved = (uuid: any, url: any) => {
    removeCaches(url);
    // assetListener.invoke(uuid, null);
};
