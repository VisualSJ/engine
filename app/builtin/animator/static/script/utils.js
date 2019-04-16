function smoothScale(delta, scale) {
    scale = Math.pow(2, delta * 0.002) * scale;
    return scale;
}

let uuid2path = {};
let nodes = [];
async function formatNodeDump(dump, path = '', indent = 0) {
    if (!path) {
        uuid2path = {};
        nodes = [];
        uuid2path[dump.uuid.value] = '/';
        nodes.push('/');
    } else {
        uuid2path[dump.uuid.value] = path;
        nodes.push(path);
    }
    const result = {
        name: dump.name.value,
        children: [],
        uuid: dump.uuid.value,
        indent,
        path,
    };
    for (const node of dump.children) {
        const dump = await Editor.Ipc.requestToPanel('scene', 'query-node', node.value.uuid);
        const childDump = await formatNodeDump(dump, `${path}/${dump.name.value}`, indent + 2);
        result.children.push(childDump);
    }
    if (!path) {
        result.uuid2path = uuid2path;
        result.nodes = nodes;
        result.path = '/';
        result.clipInfo = queryClipUuid(dump.__comps__);
    }
    return result;
}

function queryClipUuid(comp) {
    if (comp.length < 1) {
        return null;
    }
    const compIndex = comp.findIndex((item) => {
        return item.type === 'cc.AnimationComponent';
    });
    const animComp = comp[compIndex];
    if (!animComp) {
        return null;
    }
    const clips = animComp.value.clips.value.map((item) => {
        return item.value.uuid;
    });
    return {
        defaultClip: animComp.value.defaultClip.value.uuid,
        clips,
        compIndex,
    };
}

function transPropertyDump(dump) {
    const result = {};
    if (!dump) {
        return result;
    }
    // comps 需要两层嵌套循环
    for (const compName of Object.keys(dump.comps)) {
        for (const name of Object.keys(dump.comps[compName])) {
            result[name] = transKeyFrames(dump.comps[compName][name], name, compName);
        }
    }
    for (const name of Object.keys(dump.props)) {
        result[name] = transKeyFrames(dump.props[name], name, 'props');
    }
    return result;
}

function transKeyFrames(keyFrames, name, type) {
    const result = keyFrames.map((item) => {
        return {
            frame : item.frame,
            name,
            type,
        };
    });
    return result;
}

function formatClipDump(dump) {
    const pathsDump = {};
    for (const path of Object.keys(dump.paths)) {
        pathsDump[path] = transPropertyDump(dump.paths[path]);
    }
    dump.pathsDump = pathsDump;
    return dump;
}

module.exports = {
    smoothScale,
    formatNodeDump,
    transPropertyDump,
    formatClipDump,
};
