'use strict';

module.exports = {
    title: 'preferences',
    nav: {
        gneneral: 'Gneneral',
        dataEditor: 'Data Editor',
        nativeDevelop: 'Native Develop',
        previewRun: 'Preview Run'
    },
    gneneral: {
        treeState: {
            option: ['Expand All', 'Collapse All', 'Memory Last State'],
            label: 'Defalut Node Tree State'
        },
        theme: {
            option: ['default'],
            label: 'theme'
        },
        language: {
            option: ['English', '中文'],
            label: 'Language'
        },
        ipAdress: {
            option: ['Auto', '192.168.52.11'],
            label: ' IP Address'
        },
        showBuildLog: {
            label: 'Show native build log in Console'
        },
        step: {
            label: 'Spin step'
        },
        showDialog: {
            label: 'Show dialog when meta files backed up.'
        },
        autoTrim: {
            label: 'Auto trims when importing image'
        }
    },
};
