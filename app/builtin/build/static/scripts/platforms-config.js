const CommonNative = {
    isNative        : true,
    pack            : true,
    useTemplate     : true,
    // 将引擎内建类的默认值从序列化数据中移除
    stripDefaultValues: true,
    exportSimpleProject: false,
};

const CommonWeb = {
    isNative        : false,
    pack            : true,
    useTemplate     : false,
    stripDefaultValues: true,
    exportSimpleProject: false,
};

module.exports = {

    android: CommonNative,
    ios: CommonNative,
    mac: CommonNative,
    win32: CommonNative,

    'web-mobile': CommonWeb,
    'web-desktop': CommonWeb,
    'fb-instant-games': CommonWeb,
    'wechat-game': CommonWeb,
    'wechat-game-subcontext': CommonWeb,
    qqplay: CommonWeb,

    export: {
        isNative        : true,
        pack            : false,
        useTemplate     : false,
        stripDefaultValues: false,
        exportSimpleProject: true,
    },

    editor: {
        isNative        : false,
    },
};

// for wechat subcontext, all json would be packed into js directly
module.exports['wechat-game-subcontext'].pack = false;
