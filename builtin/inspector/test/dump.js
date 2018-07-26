'use strict';

let dump = {
    layer: {
        type: {
            name: "number",
        },
        value: 1,
    },
    lpos: {
        type: {
            name: "vec3",
            props: {
                x: "number",
                y: "number",
                z: "number",
            },
        },
        value: {
            x: 0,
            y: 0,
            z: 0,
        },
    },
    lrot: {
        type: {
            name: "quat",
            props: {
                x: "number",
                y: "number",
                z: "number",
                w: "number",
            },
        },
        value: {
            x: 0,
            y: -0.9848078,
            z: 0,
            w: -0.173648089,
        },
    },
    lscale: {
        type: {
            name: "vec3",
            props: {
                x: "number",
                y: "number",
                z: "number",
            },
        },
        value: {
            x: 10,
            y: 10,
            z: 10,
        },
    },
    name: {
        type: {
            name: "string",
        },
        value: "skeleton",
    },

};

exports.dump = dump;