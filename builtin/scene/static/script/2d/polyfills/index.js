// 适配 cc.engine
cc.engine = {
    attachedObjsForEditor: {},
    on () {},
    off () {},
    emit () {},
    getDesignResolutionSize () {
        return { width: 1280, height: 760 };  // 手写的设计分辨率
    },
    setDesignResolutionSize () {},
};

// 适配 _Scene
window._Scene = {
    AssetsWatcher: {
        start () {},
        initComponent () {},
        stop () {},
    },
    Sandbox: {},
    DetectConflict: {
        beforeAddChild () {},
    },
}

// 适配 cc._throw
cc._throw = cc.error;

