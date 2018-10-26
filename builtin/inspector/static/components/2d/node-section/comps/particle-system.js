'use strict';

const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/particle-system.html');

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    T,

    isGravityMode(emitterMode, multi) {
        if (multi) {
            // todo
            // return emitterMode.values.every((item) => {
            //     return item === 0;
            // });
        } else {
            return +emitterMode.value === 0;
        }
    },

    isRadiusMode(emitterMode, multi) {
        if (multi) {
            // todo
            // return emitterMode.values.every((item) => {
            //     return item === 1;
            // });
        } else {
            return +emitterMode.value === 1;
        }
    },

    saveCustomData() {
        // todo
    },

    applyPlistData() {
        // todo
        // let target = this.target;
        // if (target.custom.value) {
        //     let file = this.queryFileByUuid(target.file.value.uuid);
        //     if (file) {
        //         this.applyPlistData(file, target.uuid.value);
        //     }
        // }
    },

    queryFileByUuid(uuid) {
        if (!uuid) {
            return null;
        }
        // todo
        // let path = Editor.assetdb.remote.uuidToFspath(uuid);
        // return Plist.parse(Fs.readFileSync(path, 'utf8'));
    },

    applyPlistData(file, compId) {
        // todo
    },

    checkCustomMulti(custom, multi) {
        if (!multi) {
            return false;
        }
        // todo
        // return !custom.values.every((item) => {
        //     return !!item;
        // });
    },

    checkCustomShow(custom, multi) {
        if (multi) {
            // todo
            // return custom.values.every((item) => {
            //     return !!item;
            // });
        } else {
            return !!custom.value;
        }
    },

    updateMultiValues(target, multi) {
        if (!multi) {
            return false;
        }
        // todo
        // var values = target.values;
        // var src = values[0];
        // return !values.every((item) => {
        //     return item === src;
        // });
    }
};
