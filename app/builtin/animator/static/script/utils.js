function smoothScale(delta, scale) {
    scale = Math.pow(2, delta * 0.002) * scale;
    return scale;
}

function initNode(obj) {
    obj.uuid2path = {};
    obj.path2uuid = {};
    obj.nodes = [];
}

async function formatNodeDump(dump, path = '', indent = 0, obj = {}) {
    if (!path) {
        initNode(obj);
        obj.uuid2path[dump.uuid.value] = '/';
        obj.path2uuid['/'] = dump.uuid.value;

        obj.nodes.push({
            path: '/',
            uuid: dump.uuid.value,
            name: dump.name.value,
            indent,
        });
    } else {
        obj.uuid2path[dump.uuid.value] = path;
        obj.path2uuid[path] = dump.uuid.value;
        obj.nodes.push({
            path,
            uuid: dump.uuid.value,
            name: dump.name.value,
            indent,
        });
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
        const childDump = await formatNodeDump(dump, `${path}/${dump.name.value}`, indent + 2, obj);
        result.children.push(childDump);
    }
    if (!path) {
        result.uuid2path = obj.uuid2path;
        result.path2uuid = obj.path2uuid;
        result.nodes = obj.nodes;
        result.path = '/';
        result.clipInfo = queryClipUuid(dump.__comps__);
    }
    return result;
}

function queryClipUuid(comp) {
    if (!comp) {
        return;
    }
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
    for (const comp of Object.keys(dump.comps)) {
        for (const prop of Object.keys(dump.comps[comp])) {
            result[prop] = {
                prop,
                comp,
                dump: transKeyFrames(dump.comps[comp][prop], prop, comp),
            };
        }
    }
    for (const prop of Object.keys(dump.props)) {
        result[prop] = {
            prop,
            comp: null,
            dump: transKeyFrames(dump.props[prop], prop, null),
        };
    }
    return result;
}

function transKeyFrames(keyFrames, prop, comp) {
    const result = keyFrames.map((item) => {
        return {
            frame : item.frame,
            curve: item.curve,
            prop,
            comp,
            data: JSON.parse(JSON.stringify(item.dump)),
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

function timeToFrame(time, sample) {
    return Math.round(time * sample);
}

function frameToTime(frame, sample) {
    return frame / sample;
}

function sortSelectParams(params) {
    const result = {};
    for (const param of params) {
        const [path] = param;
        if (!result[path]) {
            result[path] = {};
        }
        const paramPath = calcParamPath(param);
        if (!result[path][paramPath]) {
            param[3] = [param[3]];
            result[path][paramPath] = param;
            continue;
        }

        result[path][paramPath][3].push(param[3]);
    }
    return result;
}

function calcParamPath(param) {
    let path;
    if (param[1]) {
        path = `comp_${param[1]}${param[2]}`;
    } else {
        path = `prop_${param[2]}`;
    }
    return path;
}

function isExitProperty(target, arr) {
    const index = arr.findIndex((item) => {
        if (target.comp) {
            return target.comp === item.comp && target.prop === item.prop;
        }
        if (!target.comp) {
            return target.prop === item.prop;
        }
    })
    return index !== -1;
}

module.exports = {
    smoothScale,
    formatNodeDump,
    transPropertyDump,
    formatClipDump,
    timeToFrame,
    frameToTime,
    sortSelectParams,
    isExitProperty,
};
