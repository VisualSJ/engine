'use strict';

/**
 * 生成一个 engine 3d node 的 dump 数据
 * @param node 
 */
export function dumpNode (node: any) : any {
    let children = [];

    for (let i=0; i<node._children.length; i++) {
        let child = node._children[i];
        if (!child) {
            break;
        }
        children.push(dumpNode(child));
    }

    return {
        uuid: node._id,

        active: node.active,
        name: node.name,
        layer: node.layer,
        lpos: node.lpos,
        lrot: node.lrot,

        children: children,
    };
};