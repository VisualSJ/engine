'use strict';

module.exports = {
    mask: {
        startup: 'Starting the asset database - %s ...',
        loading: 'Loading resources...',
    },
    'debug-mode': 'Open Assets DevTools',

    operate: {
        dialogError: 'Error',
        dialogWaining: 'Warning',
        dialogQuestion: 'Confirm',
        dialogInfo: 'Tips',
    },

    fail: {
        readonly: '',
    },

    createAsset: {
        fail: {
            unknown: 'Failed to create asset: unknown error',
            url: 'Failed to create asset: the incoming address is not recognized',
            exist: 'Failed to create asset: file already exists',
            drop: 'Failed to create a asset: the address of the imported asset does not exist',
            toUrl: 'Failed to create asset: file path cannot be converted to url',
            uuid: 'Failed to create the asset: unable to identify uuid of the url',
            content: 'Failed to create the asset: file content format is not correct',
            readonly: 'Failed to create the asset: cannot operate on a readonly asset',
        },
        warn: {
            overwrite: 'The same file already exists. Do you want to overwrite it?',
        },
    },

    saveAsset: {
        fail: {
            unknown: 'Failed to save asset: unknown error',
            uuid: 'Failed to save asset: unable to identify uuid',
            content: 'Failed to save the asset: file content format is not correct',
            readonly: 'Failed to save the asset: cannot operate on a readonly asset',
        },
    },

    saveAssetMeta: {
        fail: {
            unknown: 'Failed to save asset META: unknown error',
            uuid: 'Failed to save asset META: unable to identify uuid',
            content: 'Failed to save asset META: file content format is not correct',
            readonly: 'Failed to save the asset META: cannot operate on a readonly asset',
        },
    },

    copyAsset: {
        fail: {
            unknown: 'Failed to copy asset: unknown error',
            url: 'Failed to copy asset: invalid parameter',
            source: 'Failed to copy asset: file does not exist at source address',
            target: 'Failed to copy asset: target file already exists',
            include: 'Failed to copy asset: source address cannot be contained by destination address',
            parent: 'Failed to copy asset: the parent address of the destination address is incorrect',
            readonly: 'Failed to copy asset: The parent address of the destination address is readonly',
        },
    },

    moveAsset: {
        fail: {
            unknown: 'Failed to move asset: unknown error',
            url: 'Failed to move asset: invalid parameter',
            source: 'Failed to move asset: source address does not exist',
            target: 'Failed to move asset: destination address is not valid',
            exist: 'Failed to move the asset: the same file already exists at the destination address',
            include: 'Failed to move the asset: source address cannot be contained by destination address',
            parent: 'Failed to move the asset: the parent address of the destination address is incorrect',
            readonly_source: 'Failed to move the asset: the source address is readonly',
            readonly: 'Failed to copy asset: The parent address of the destination address is readonly',
        },
    },

    deleteAsset: {
        fail: {
            unknown: 'Failed to delete asset: unknown error',
            url: 'Failed to delete asset: invalid parameter',
            unexist: 'Failed to delete asset: the file does not exist',
            readonly: 'Failed to delete asset: the file is readonly',
        },
    },

    preferences: {
        log_level: 'Log level',

        log_level_debug: 'Debug',
        log_level_log: 'Log',
        log_level_warn: 'Warn',
        log_level_error: 'Error',
    }
};
