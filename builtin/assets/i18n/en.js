'use strict';

module.exports = {
    title: 'assets',

    menu: {
        createMenu: 'Create asset context menu',
        searchPlaceholder_name: 'Search Name...',
        searchPlaceholder_uuid: 'Search UUID...',
        searchPlaceholder_type: 'Search Type...',
        search: 'Search',
        searchName: 'Search Name',
        searchUuid: 'Search UUID',
        searchType: 'Search Type',
        sort: 'Sort',
        sortName: 'Sort by Name',
        sortExtension: 'Sort by Extension',
        refresh: 'Refresh',
        allExpand: 'All Expand',
        allCollapse: 'All Collapse',

        new: 'Create',
        newFolder: 'Folder',
        newJavaScript: 'JavaScript',
        newTypeScript: 'TypeScript',
        newCoffeeScript: 'CoffeeScript',
        newScene: 'Scene',
        newAnimationClip: 'Animation Clip',
        newAutoAtlas: 'Auto Atlas',
        newLabelAtlas: 'Label Atlas',
        newMaterials: 'Materials',
        newEffect: 'Effect',
        copy: 'Copy',
        paste: 'Paste',
        delete: 'Delete',
        rename: 'Rename',
        readOnly: 'Read Only',
        revealInlibrary: 'Reveal In Library',
        revealInExplorer: 'Reveal In Explorer',
        showUuid: 'Show Asset UUID and PATH',

        errorNewnameDuplicate: 'The name of the file or folder already exists. Please select another name',
        errorNewnameEmpty: 'The name cannot be empty',
    },

    operate: {
        dialogError: 'Error',
        dialogWaining: 'Warning',
        dialogQuestion: 'Confirm',
        dialogInfo: 'Tips',
        refreshing: 'Now refreshing assets...',
        sureDelete: 'Sure delete these assets?',
        renameFail: 'Rename Fail: The new file name already exists.',
        pasteFail_parent_into_child: 'subAsset cannot paste ancestry',
    },

    deprecate: {
        fire: '.fire extension has been discarded. Please save the file as .scene file',
    },
};
