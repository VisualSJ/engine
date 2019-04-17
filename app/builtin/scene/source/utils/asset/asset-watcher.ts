'use strict';

declare const cc: any;

let ASSET_PROPS = 'A$$ETprops';
let DELIMETER = cc.Class.Attr.DELIMETER;
let ASSET_PROPS_KEY = ASSET_PROPS + DELIMETER + ASSET_PROPS;

// 如果该 component 不含任何需要检测的 asset，直接把 _assetsWatcher 置为该标记，这样能减少临时对象的创建。
let EmptyWatcher = Object.create(null);

function getPropertyDescriptorAndOwner(obj: any, name: any) {
    while (obj) {
        const pd = Object.getOwnPropertyDescriptor(obj, name);
        if (pd) {
            return { owner: obj, pd };
        }
        obj = Object.getPrototypeOf(obj);
    }
    return null;
}

function forceSetterNotify(obj: any, name: any) {
    const data = getPropertyDescriptorAndOwner(obj, name);
    if (!data) {
        console.warn('Failed to get property descriptor of %s.%s', obj, name);
        return;
    }
    const pd = data.pd;
    if (pd.configurable === false) {
        console.warn('Failed to register notifier for %s.%s', obj, name);
        return;
    }
    if ('value' in pd) {
        console.warn('Cannot watch instance variable of %s.%s', obj, name);
        return;
    }

    const setter = pd.set;
    pd.set = function(value, forceRefresh?) {
        // forceRefresh 如果为 true，那么哪怕资源的引用不变，也应该强制更新资源
        // @ts-ignore
        setter.call(this, value, forceRefresh);

        // this指向当前调用set的component
        // @ts-ignore
        if (this._watcherHandle && this._watcherHandle !== EmptyWatcher) {
            const uuids = getUuidsOfPropValue(value);

            // @ts-ignore
            this._watcherHandle.changeWatchAsset(name, uuids);
        }
    };
    Object.defineProperty(data.owner, name, pd);
}

function parseAssetProps(obj: any) {
    let assetProps = null;
    const ctor = obj.constructor;
    const attrs = cc.Class.Attr.getClassAttrs(ctor);
    for (let i = 0, props = ctor.__props__; i < props.length; i++) {
        const propName = props[i];
        const attrKey = propName + DELIMETER;

        // 需要筛选出是引擎内可编辑的属性
        if (attrs[attrKey + 'hasSetter'] && attrs[attrKey + 'hasGetter']) {
            const prop = obj[propName];
            const isAssetType = (prop instanceof cc.Asset ||
                cc.js.isChildClassOf(attrs[attrKey + 'ctor'], cc.RawAsset));
            const maybeAsset = prop == null;
            if (isAssetType || maybeAsset) {
                forceSetterNotify(obj, propName);
                if (assetProps) {
                    assetProps.push(propName);
                } else {
                    assetProps = [propName];
                }
            }
        }
    }
    return assetProps;
}

function invokeAssetSetter(obj: any, propName: string, assetOrUrl: any) {
    const pd = cc.js.getPropertyDescriptor(obj, propName);
    let newData = assetOrUrl;

    if (pd.get) {
        const data = pd.get.call(obj);
        if (Array.isArray(data)) {
            for (let i = 0; i < data.length; i++) {
                if (data[i] && assetOrUrl && data[i]._uuid === assetOrUrl._uuid) {
                    data[i] = assetOrUrl;
                }
            }

            newData = data;
        }

        if (pd && pd.set) {
            const forceRefresh = true;
            // 如果是数组，需要清空该数组，防止数组内判断资源是否修改的判断阻止更新
            if (Array.isArray(data)) {
                pd.set.call(obj, newData.map((item: any) => null), forceRefresh);
            }
            pd.set.call(obj, newData, forceRefresh);
        }
    }
}

function getUuidsOfPropValue(val: any): any[] {
    const uuids: any[] = [];
    if (Array.isArray(val)) {
        for (const data of val) {
            if (data instanceof cc.Asset && data._uuid) {
                uuids.push(data._uuid);
            }
        }
    } else if (val instanceof cc.Asset && val._uuid) {
        uuids.push(val._uuid);
    }

    return uuids;
}

class AssetWatcher {
    public static initComponent(obj: any) {
        obj._watcherHandle = null;
    }

    public static initHandle(obj: any) {
        let assetProps = cc.Class.Attr.getClassAttrs(obj.constructor)[ASSET_PROPS_KEY];
        if (assetProps === undefined) {
            assetProps = parseAssetProps(obj);
            cc.Class.Attr.setClassAttr(obj.constructor, ASSET_PROPS, ASSET_PROPS, assetProps);
        }
        obj._watcherHandle = assetProps ? (new AssetWatcher(obj)) : EmptyWatcher;
    }

    public static start(obj: any) {
        if (!obj._watcherHandle) {
            AssetWatcher.initHandle(obj);
        }
        if (obj._watcherHandle !== EmptyWatcher) {
            obj._watcherHandle.start();
        }
    }

    public static stop(obj: any) {
        // if active, stop it
        if (obj._watcherHandle && obj._watcherHandle !== EmptyWatcher) {
            obj._watcherHandle.stop();
        }
    }

    public owner: any = null;
    public watchingInfos: { [index: string]: any}  = Object.create(null);

    constructor(owner: any) {
        this.owner = owner;
    }

    public start() {
        const owner = this.owner;
        const assetProps = cc.Class.Attr.getClassAttrs(owner.constructor)[ASSET_PROPS_KEY];
        for (const propName of assetProps) {
            const val = owner[propName];
            const uuids = getUuidsOfPropValue(val);
            this.registerListener(uuids, owner, propName);
        }
    }

    public stop() {
        for (const name in this.watchingInfos) {
            if (!(name in this.watchingInfos)) {
                continue;
            }
            const info = this.watchingInfos[name];
            if (info) {
                for (const uuid of info.uuids) {
                    cc.AssetLibrary.assetListener.remove(uuid, info.callback);
                }
            }
        }
        this.watchingInfos = Object.create(null);
    }

    public changeWatchAsset(propName: string, newUuids: []) {
        // unRegister old
        this.unRegisterListener(propName);

        // register new
        if (newUuids.length > 0) {
            this.registerListener(newUuids, this.owner, propName);
        }
    }

    private registerListener(uuids: any[], owner: any, propName: any) {
        const onDirty = invokeAssetSetter.bind(null, owner, propName);

        for (const uuid of uuids) {
            cc.AssetLibrary.assetListener.add(uuid, onDirty);
        }

        this.watchingInfos[propName] = {
            uuids,
            callback: onDirty,
        };
    }

    private unRegisterListener(propName: any) {
        const info = this.watchingInfos[propName];

        if (info) {
            for (const uuid of info.uuids) {
                cc.AssetLibrary.assetListener.remove(uuid, info.callback);
            }

            this.watchingInfos[propName] = null;
        }
    }
}

module.exports = AssetWatcher;
