'use strict';

const { readTemplate } = require('../../../../utils');

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
        builtinEffects: {},
        dirty: false,
    };
};

exports.mounted = function() {
    this.refresh();
};

exports.computed = {
    effectTypes() {
        return Object.keys(this.builtinEffects);
    },

    propsList() {
        if (this.effectMap && this.effectMap.props) {
             const {props} = this.effectMap;
             const {_props = {}} = this.material || {};
             props.map((item) => {
                const {key} = item;
                if (key in _props && _props[key] !== undefined) {
                    item.value = _props[key];
                }
            });
             return props;
        }
        return [];
    },

    definesList() {
        if (this.effectMap && this.effectMap.defines) {
            const {defines} = this.effectMap;
            const {_defines = {}} = this.material || {};
            defines.map((item) => {
                const {key} = item;
                if (key in _defines && _defines[key] !== undefined) {
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
};

exports.methods = {
    async getEffectMap() {
        const {builtinEffects, effectName} = this;
        const effect = builtinEffects[effectName];
        if (!effect) {
            this.effectMap = {};
        }
        this.effectMap = await Editor.Ipc.requestToPackage('scene', 'query-effect-data-for-inspector', effectName);
    },

    async refresh() {
        if (!this.meta) {
            this.effectName = '';
            this.props = {};
            this.defines = {};
            return;
        }
        try {
            const builtinEffects = await Editor.Ipc.requestToPackage('scene', 'query-builtin-effects');
            this.material = await require(this.info.files[0]);
            this.effectName = this.material ?  this.material._effectName : '';
            this.builtinEffects = builtinEffects ? builtinEffects : {};
            this.dirty = false;
        } catch (err) {
            console.error(err);
        }
    },

    onSelected(event) {
        this.effectName = event.target.value;
        this.dirty = true;
    },

    onPropertyChanged(event) {
        const dump = event.detail ? event.detail.dump : event.target.__vue__.dump;
        const {path, value, compType} = dump || {};

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
                    if (compType === 'cc-dragable') {
                        item[key] = value.uuid;
                    } else {
                        item[key] = value;
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }
    },
    reset() {
        this.refresh();
    },

    async apply() {
        try {
            const {material, effectName} = this;
            const options = {
                effectName,
                _props: {},
                _defines: {},
            };
            this.propsList.map((item) => {
                const {key} = item;
                if (key in material._props) {
                    options._props[key] = material._props[key];
                }
            });

            this.definesList.map((item) => {
                const {key} = item;
                if (key in material._defines) {
                    options._defines[key] = material._defines[key];
                }
            });

            const result = await Editor.Ipc.requestToPackage('scene', 'query-serialized-material', options);
            const isSaved = await Editor.Ipc.requestToPackage(
                'asset-db',
                'save-asset',
                this.info.uuid,
                result
            );
            if (isSaved) {
                this.refresh();
            }

        } catch (err) {
            console.log(err);
        }
    },
};
