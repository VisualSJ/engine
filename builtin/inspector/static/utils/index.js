'use stirct';

const { readFileSync, readdirSync } = require('fs');
const { join, basename, extname } = require('path');

module.exports = {
    readTemplate,
    readComponent,
    T,
    getComponentType,
    buildProp
};

const publicCompsPath = join(__dirname, '../components/public/');

const publicComps = readdirSync(publicCompsPath).reduce((prev, next) => {
    const key = basename(next, extname(next));
    prev[key] = require(join(publicCompsPath, next));

    return prev;
}, {});

/**
 * 读取模版文件
 * @param {*} type 模版类型
 * @param {*} file 模版相对于目录的相对地址
 */
function readTemplate(type, file) {
    file = join(__dirname, '../template', type, file);
    // todo exists
    return readFileSync(file, 'utf8');
}

/**
 * require 一个指定的组件
 * @param  {...any} paths
 */
function readComponent(...paths) {
    const comp = require(join(...paths));
    const keys = Object.keys(publicComps);

    comp.components = comp.components || {};
    keys.map((item) => (comp.components[item] = publicComps[item]));

    return comp;
}

/**
 * 提供 Editor 的多语言功能
 * @param {...string[]} rest
 * @returns
 */
function T(...rest) {
    const prefix = 'inspector';
    rest.unshift(prefix);
    return Editor.I18n.t(rest.join('.'));
}

function checkIsAsset(types) {
    return types.includes('cc.Asset');
}

function checkIsNumber(type) {
    return ['Integer', 'Float'].includes(type);
}

const convertMap = {
    'cc.Node': 'cc-dragable'
};

/**
 * 获取 target 类型对应的 component 类型
 * @param {*} target
 */
function getComponentType(target, $options) {
    if (!target || !target.type) {
        return false;
    }
    let { type, extends: extendTypes = [] } = target;

    if (checkIsNumber(type)) {
        return 'number';
    }

    if (checkIsAsset([type, ...extendTypes])) {
        return 'cc-dragable';
    }

    type = convertMap[type] || type;
    type = type.toLocaleLowerCase();
    type = type.replace(/\./, '-');

    if ($options && $options.components) {
        return $options.components[type] ? type : false;
    }

    if (publicComps[type]) {
        return type;
    }

    return false;
}

function buildProp(path, key, item) {
    // 将原有 type 保存到 originType 以便处理结束后恢复原有 type
    const {properties, type: originType, value, extends: extendTypes, default: defaultVal} = item;
    const hasCompType = getComponentType(item);

    let isAsset = false;
    let isNode = false;
    let typeNull = false;
    let typeError = false;

    item.name = item.displayName ? item.displayName : key;
    item.path = path;
    item.compType = hasCompType;

    if (!originType) {
        properties && (properties.visible = false);
    } else {
        if (extendTypes) {
            isAsset = [originType, ...extendTypes].some((item) => [
                'cc.Asset',
                'cc.RawAsset'
            ].includes(item));

            isNode = extendTypes.includes('cc.Object');
        }
    }

    isAsset && (item.compType = 'cc.Asset');
    isNode && (item.compType = 'cc.Node');

    if (Array.isArray(value) && (Reflect.has(item, 'default') || Array.isArray(defaultVal))) {
        item.type = 'Array';

        if (isAsset) {
            item.compType = 'cc-dragable';
        } else if (isNode) {
            item.compType = 'cc-dragable';
        } else if (!hasCompType) {
            item.compType = 'Object';
        }
    } else {
        if (isAsset) {
            item.type = 'cc.Asset';
            item.compType = 'cc-dragable';
        } else if (isNode) {
            item.type = 'cc.Node';
            item.compType = 'cc-dragable';
        } else if (!hasCompType) {
            item.type = 'Object';
            // item.compType = 'Object';
        }
    }

    if (item.type === 'Object' && (value === null || value === undefined)) {
        typeNull = true;
        // console.log(`refresh ${item} typenull is ${typeNull}`);
    }

    if (!typeNull && properties && properties.type && properties.type !== originType) {
        if (extendTypes) {
            if (!extendTypes.includes(properties.type)) {
                typeError = true;
            }
        } else {
            typeError = true;
        }
        // console.log(`refresh ${item} typeerror is ${typeError}`);
    }

    if (typeNull) {
        item.compType = 'null-prop';
    } else if (typeError) {
        item.compType = 'type-error-prop';
    } else {
        if (item.type === 'Array') {
            item.compType = 'array-prop';

            for (let i = 0; i < value.length; i++) {
                const item = value[i];
                buildProp(`${path}.${i}`, `[${i}]`, item);
            }
        } else if (item.type === 'Object') {
            if (originType === 'cc.ClickEvent') {
                item.compType = 'event-prop';
            } else {
                item.compType = 'object-prop';
            }

            Object.keys(item.value).map((key) => {
                item.value[key] && buildProp(`${path}.${key}`, key, item.value[key]);
            });
        }
    }

    item.type = originType;
}
