'use stirct';

const { readFileSync, readdirSync } = require('fs');
const { join, basename, extname } = require('path');

module.exports = {
    readTemplate,
    readComponent,
    T,
    getComponentType,
    build2DProp,
    build3DProp,
    getFitSize
};

const publicCompsPath = join(__dirname, '../components/public/');

const publicComps = readdirSync(publicCompsPath).reduce(
    (prev, next) => {
        const key = basename(next, extname(next));
        prev[key] = require(join(publicCompsPath, next));

        return prev;
    },
    {}
);

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

/**
 * 比对图片和容器的宽高返回合适的尺寸
 * @param {number} imgWidth
 * @param {number} imgHeight
 * @param {number} boxWidth
 * @param {number} boxHeight
 * @returns {number[]}
 */
function getFitSize(imgWidth, imgHeight, boxWidth, boxHeight) {
    let width = imgWidth;
    let height = imgHeight;

    if (imgWidth > boxWidth && imgHeight > boxHeight) {
        // 图片宽高均大于容器
        width = boxWidth;
        height = (imgHeight * boxWidth) / imgWidth;
        if (height > boxHeight) {
            // 高度比例大于宽度比例
            height = boxHeight;
            width = (imgWidth * boxHeight) / imgHeight;
        }
    } else {
        if (imgWidth > boxWidth) {
            // 图片宽度大于容器宽度
            width = boxWidth;
            height = (imgHeight * boxWidth) / imgWidth;
        } else if (imgHeight > boxHeight) {
            // 图片高度大于容器高度
            height = boxHeight;
            width = (imgWidth * boxHeight) / imgHeight;
        }
    }
    return [width, height];
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
function getComponentType(target) {
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

    if (publicComps[type]) {
        return type;
    }

    return false;
}

/**
 * 2d 属性处理
 * @param {string} path
 * @param {string} key
 * @param {object} item
 * @param {object} attrs
 */
function build2DProp(path, key, item, attrs) {
    // 将原有 type 保存到 originType 以便处理结束后恢复原有 type
    const {
        properties,
        type: originType,
        value,
        extends: extendTypes,
        default: defaultVal
    } = item;
    const hasCompType = getComponentType(item);

    let isAsset = false;
    let isNode = false;
    let typeNull = false;
    let typeError = false;

    item.name = attrs.displayName ? attrs.displayName : key;
    item.path = path;
    item.compType = hasCompType;
    item.attrs = { ...attrs };

    if (!originType) {
        attrs.visible = false;
    } else {
        if ('visible' in item) {
            item.attrs.visible = item.visible;
        }

        if (extendTypes) {
            isAsset = [originType, ...extendTypes].some((item) =>
                ['cc.Asset', 'cc.RawAsset'].includes(item)
            );

            isNode = extendTypes.includes('cc.Object');
        }
    }

    isAsset && (item.compType = 'cc.Asset');
    isNode && (item.compType = 'cc.Node');

    if (
        Array.isArray(value) &&
        (Reflect.has(item, 'default') || Array.isArray(defaultVal))
    ) {
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

    if (
        item.type === 'Object' &&
        (value === null || value === undefined)
    ) {
        typeNull = true;
        // console.log(`refresh ${item} typenull is ${typeNull}`);
    }

    if (
        !typeNull &&
        item.attrs.type &&
        item.attrs.type !== originType
    ) {
        if (extendTypes) {
            if (!extendTypes.includes(item.attrs.type)) {
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
                // Array 子元素的 buildProp 需要 extends、properties 类型判断
                extendTypes &&
                    !item.extends &&
                    (item.extends = [...extendTypes]);
                properties &&
                    !item.properties &&
                    (item.properties = { ...properties });
                buildProp(`${path}.${i}`, `[${i}]`, item, attrs);
            }
        } else if (item.type === 'Object') {
            if (originType === 'cc.ClickEvent') {
                item.compType = 'event-prop';
            } else {
                item.compType = 'object-prop';
            }

            Object.keys(item.value).map((key) => {
                const subItemAttrs = properties && properties[key];
                if (subItemAttrs) {
                    item.value[key] &&
                        buildProp(
                            `${path}.${key}`,
                            key,
                            item.value[key],
                            subItemAttrs
                        );
                }
            });
        }
    }

    item.type = originType;
}

function build3DProp(path, key, item, attrs) {
    item.path = path;
    item.name = attrs.displayName ? attrs.displayName : key;
    item.compType = getComponentType(item);
}
