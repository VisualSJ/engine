'use strict';
const { readFile } = require('fs');
const { readTemplate } = require('../../../../utils');
const { eventBus } = require('../../../../utils/eventBus');

exports.template = readTemplate('3d', './asset-section/assets/material.html');

exports.props = ['meta', 'info'];

exports.data = function() {
    return {
        cssHost: {
            display: 'flex',
            flex: 'none',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '3px 10px 5px',
            borderBottom: '1px solid #666',
            height: '24px',
            overflow: 'hidden',
        },
        cssIcon: { marginRight: '5px' },
        cssTitle: { fontWeight: 'bold', textOverflow: 'ellipsis', overflow: 'hidden' },
        effectName: '',
        effectMap: {},
        dirty: false,
        // 当前材质
        material: null,
        allEffects: {},
        dirty: false,
    };
};

exports.mounted = function() {
    this.refresh();
    eventBus.addListener('effect-update', this.onEffectChanged);
};

exports.beforeDestroy = function() {
    eventBus.removeListener('effect-update', this.onEffectChanged);
};

exports.computed = {
    effectTypes() {
        return Object.keys(this.allEffects).filter((key) => !key.startsWith('_'));
    },

    displayList() {
        const { propsList: props, definesList: defs } = this;
        let tree = {};
        const curDefs = {};

        // sort props by define dependencies
        for (let prop of props) {
            // let prop = props[name];
            let cur = tree;
            prop.defines.forEach((d) => {
                if (!cur[d]) {
                    cur[d] = {};
                }
                cur = cur[d];
                curDefs[d] = true;
            });
            if (!cur.props) {
                cur.props = [];
            }
            cur.props.push(prop);
        }
        // add dangling defines
        for (let def of defs) {
            // let def = defs[name];
            if (curDefs[def.key] || def.key[0] === '_') {
                continue;
            }
            def.defines.concat(def.key).reduce((node, d) => node[d] || (node[d] = {}), tree);
        }

        // harvest from the tree
        let traverse = (node) => {
            let list = node.props || [];
            delete node.props;
            for (let def in node) {
                if (true) {
                    list.push(defs.find((d) => d.key === def));
                    list = list.concat(traverse(node[def]));
                }
            }
            return list;
        };

        return traverse(tree);
    },

    propsList() {
        if (this.effectMap && this.effectMap.props) {
            const { props } = this.effectMap;
            const { _props = {} } = this.material || {};
            props.forEach((item) => {
                const { key } = item;
                if (key in _props && _props[key] !== null) {
                    item.value = _props[key];
                    if (item.value.__uuid__) {
                        item.value.uuid = item.value.__uuid__;
                        delete item.value.__uuid__;
                    }
                }
            });
            return props;
        }
        return [];
    },

    definesList() {
        if (this.effectMap && this.effectMap.defines) {
            const { defines } = this.effectMap;
            const { _defines = {} } = this.material || {};
            defines.forEach((item) => {
                const { key } = item;
                if (key in _defines && _defines[key]) {
                    item.value = _defines[key];
                }
            });
            return defines;
        }
        return [];
    },
};

exports.watch = {
    effectName(newVal, oldVal) {
        this.getEffectMap();
    },
    'meta.uuid'() {
        this.refresh('reset');
    },
};

exports.methods = {
    async onEffectChanged() {
        await this.refresh('effect');
    },

    async getEffectMap() {
        const { allEffects, effectName } = this;
        const effect = allEffects[effectName];
        if (!effect) {
            this.effectMap = {};
        }
        this.effectMap = await Editor.Ipc.requestToPackage('scene', 'query-effect-data-for-inspector', effectName);
    },

    async getEffects() {
        try {
            const effects = await Editor.Ipc.requestToPackage('scene', 'query-all-effects');
            this.allEffects = effects || {};
        } catch (err) {
            console.error(err);
            this.allEffects = {};
        }
    },

    async refresh(type) {
        if (!this.meta) {
            this.effectName = '';
            this.props = {};
            this.defines = {};
            return;
        }
        try {
            await this.getEffects();
            if (type !== 'effect') {
                const path = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-path', this.meta.uuid);
                await new Promise((resolve, reject) => {
                    readFile(path, (err, data) => {
                        if (err) {
                            return reject(err);
                        }
                        const material = JSON.parse(data);
                        this.material = material;
                        const uuid = material && material._effectAsset ? material._effectAsset.__uuid__ : '';
                        if (!uuid) {
                            this.effectName = '';
                        } else {
                            const effect = Object.values(this.allEffects).find((item) => item.uuid === uuid);
                            if (!effect) {
                                throw new Error('The effect specified by the material does not exist');
                            }
                            this.effectName = effect._name;
                        }
                        this.dirty = false;
                        resolve();
                    });
                });
            }
            // refresh is done by listening asset-change
            //  else {
            //     Editor.Ipc.requestToPackage('scene', 'soft-reload');
            // }
            // reset、effect变更需要刷新 effectMap
            if (['reset', 'effect'].includes(type)) {
                this.getEffectMap();
            }
        } catch (err) {
            console.warn(err);
            this.effectName = '';
            this.props = {};
            this.defines = {};
        }
    },

    onSelected(event) {
        this.effectName = event.target.value;
        this.dirty = true;
    },

    onPropertyChanged(event) {
        const dump = event.detail ? event.detail.dump : event.target.__vue__.dump;
        const { path, value } = dump || {};

        if (path && path.includes('.')) {
            try {
                const paths = path.split('.');
                const key = paths.pop();
                const item = paths.reduce((acc, cur) => {
                    if (acc && acc[cur] !== undefined) {
                        return acc[cur];
                    }
                    return null;
                }, this.material);

                if (item) {
                    this.dirty = true;
                    item[key] = value;
                }
            } catch (err) {
                console.error(err);
            }
        }
    },
    reset() {
        this.refresh('reset');
    },

    async apply() {
        try {
            const { material, effectName, effectMap } = this;
            const options = {
                effectName,
                _props: {},
                _defines: {},
                effectMap,
            };
            this.propsList.map((item) => {
                const { key } = item;
                if (key in material._props) {
                    options._props[key] = material._props[key];
                }
            });

            this.definesList.map((item) => {
                const { key } = item;
                if (key in material._defines) {
                    options._defines[key] = material._defines[key];
                }
            });

            const result = await Editor.Ipc.requestToPackage('scene', 'query-serialized-material', options);
            const isSaved = await Editor.Ipc.requestToPackage('asset-db', 'save-asset', this.info.uuid, result);
            if (isSaved) {
                this.refresh();
                // refresh is done by listening asset-change
                // Editor.Ipc.requestToPackage('scene', 'soft-reload');
            }
        } catch (err) {
            console.log(err);
        }
    },
};
