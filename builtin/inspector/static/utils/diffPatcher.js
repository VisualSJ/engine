const diffPatch = require('jsondiffpatch');
const diffpatcher = diffPatch.create({
    objectHash(obj, index) {
        if (obj.uuid) {
            return obj.uuid;
        }

        // if this is an item in __props__
        if (obj.name && obj.attrs) {
            return obj.name;
        }

        // otherwise just use the index in the array
        return `$$index:${index}`;
    },
    arrays: {
        detectMove: true,
    },
});

module.exports = diffpatcher;
