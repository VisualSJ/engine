'use strict';

module.exports = {
    mask: {
        startup: 'Starting the resource database - %s ...',
        loading: 'Loading resources...',
    },
    'debug-mode': 'Open Assets DevTools',

    operate: {
        dialogError: 'Error',
        dialogWaining: 'Warning',
        dialogQuestion: 'Confirm',
        dialogInfo: 'Tips',
    },

    createAsset: {
        fail: {
            unknown: 'Failed to create resource: unknown error',
            url: 'Failed to create resource: the incoming address is not recognized',
            exist: 'Failed to create resource: file already exists',
            drop: 'Failed to create a resource: the address of the imported resource does not exist',
            toUrl: 'Failed to create resource: file path cannot be converted to url',
            uuid: 'Failed to create the resource: unable to identify uuid of the url',
            content: 'Failed to create the resource: file content format is not correct',
        },
        warn: {
            overwrite: 'The same file already exists. Do you want to overwrite it?',
        },
    },

    saveAsset: {
        fail: {
            unknown: 'Failed to save resource: unknown error',
            uuid: 'Failed to save resource: unable to identify uuid',
            content: 'Failed to save the resource: file content format is not correct',
        },
    },

    saveAssetMeta: {
        fail: {
            unknown: 'Failed to save resource META: unknown error',
            uuid: 'Failed to save resource META: unable to identify uuid',
            content: 'Failed to save resource META: file content format is not correct',
        },
    },

    copyAsset: {
        fail: {
            unknown: 'Failed to copy resource: unknown error',
            url: 'Failed to copy resource: invalid parameter',
            source: 'Failed to copy resource: file does not exist at source address',
            target: 'Failed to copy resource: target file already exists',
            include: 'Failed to copy resource: source address cannot be contained by destination address',
            parent: 'Failed to copy resource: the parent address of the destination address is incorrect',
            readonly: 'Failed to copy resource: The parent address of the destination address is readonly',
        },
    },

    moveAsset: {
        fail: {
            unknown: 'Failed to move resource: unknown error',
            url: 'Failed to move resource: invalid parameter',
            source: 'Failed to move resource: source address does not exist',
            target: 'Failed to move resource: destination address is not valid',
            exist: 'Failed to move the resource: the same file already exists at the destination address',
            include: 'Failed to move the resource: source address cannot be contained by destination address',
            parent: 'Failed to move the resource: the parent address of the destination address is incorrect',
            readonly: 'Failed to copy resource: The parent address of the destination address is readonly',
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
