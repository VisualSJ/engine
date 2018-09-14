'use stict';

const types = {
    'cc.Vec2': {
        properties: ['x', 'y'],
    },
    'cc.Vec3': {
        properties: ['x', 'y', 'z'],
    },
    'cc.Size': {
        properties: ['width', 'height'],
    },
    'cc.Color': {
        properties: ['r', 'g', 'b', 'a'],
    },
};

/**
 * 获取一个对象的类型
 * @param {*} obj 
 */
function getTypeId (obj) {
    if (typeof obj === 'object') {
        obj = obj.constructor;
    }
    return cc.js._getClassId(obj);
}

/**
 * 获取一个对象上的继承链
 * @param {*} klass 
 */
function getInheritanceChain(klass) {
    return cc.Class.getInheritanceChain(klass)
        .map(x => {
            return getTypeId(x);
        })
        .filter(x => !!x);
}

/**
 * 获取一个数据的默认值
 * @param {*} defaultVal 
 */
function getDefault (defaultVal) {
    if (typeof defaultVal === 'function') {
        try {
            return defaultVal();
        } catch (error) {
            cc._throw(error);
            return undefined;
        }
    }
    return defaultVal;
}

module.exports = {
    types,

    getTypeId,
    getInheritanceChain,
    getDefault,
};