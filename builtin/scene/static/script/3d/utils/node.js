'use strict';

/**
 * 爬取节点上的数据
 * @param children
 */
function walkChild(cache, entity) {
    cache[entity._id] = entity;
    entity.children && entity.children.forEach((child) => {
        walkChild(cache, child);
    });
}

/**
 * 爬取 engine 内打开的场景的节点数据
 * @param {*} cache 
 * @param {*} level
 */
function walk(cache, level) {
    cache = cache || {};
    walkChild(cache, level);
}

module.exports = {
    walk,
};