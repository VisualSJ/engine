'use strict';

module.exports = {
    mask: {
        loading: 'Loading resources...',
    },
    'debug-mode': 'Open Assets DevTools',

    createAsset: {
        fail: {
            unknown: 'Failed to create resource: unknown error',
            url: 'Failed to create resource: the incoming address is not recognized',
            exist: 'Failed to create resource: file already exists',
            drop: 'Failed to create a resource: the address of the imported resource does not exist',
            toUrl: 'Failed to create resource: file path cannot be converted to url',
            uuid: 'Failed to create the resource: unable to identify uuid of the url',
        },
    },

    saveAsset: {
        fail: {
            unknown: 'Failed to save resource: unknown error',
            uuid: 'Failed to save resource: unable to identify uuid',
        },
    },

    saveAssetMeta: {
        fail: {
            unknown: 'Failed to save resource META: unknown error',
        },
    },

    copyAsset: {
        fail: {
            unknown: 'Replication resource failure: unknown error',
            url: 'Replication resource failed: invalid parameter',
            source: 'Failed to copy resource: file does not exist at source address',
            target: 'Failed to copy resource: target file already exists',
            parent: 'Replication resource failed: source address cannot be contained by destination address',
        },
    },

    moveAsset: {
        fail: {
            unknown: 'Failed to move resource: unknown error',
            url: 'Failed to move resource: invalid parameter',
            same: 'Failed to move resource: same path',
            source: 'Failed to move resource: source address does not exist',
            target: 'Failed to move resource: destination address is not valid',
            exist: 'Failed to move the resource: the same file already exists at the destination address',
        },
    },

    deleteAsset: {
        fail: {
            unknown: 'Failed to delete resource: unknown error',
            url: 'Failed to delete resource: invalid parameter',
            unexist: 'Failed to delete resource: file does not exist',
        },
    },
};
