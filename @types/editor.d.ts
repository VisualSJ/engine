declare const Editor: Editor;

interface Editor {
    App: App;
    Project: Project;
    I18n: I18n;
    Menu: Menu;
    Package: Package;
    Layout: Layout;
    Panel: Panel;
    Ipc: Ipc;
    UI: UI;
    Logger: Logger;
    Profile: Profile;
    History: History;
    Theme: Theme;
    Dialog: Dialog;
}

interface App {
    home: string;
    path: string;
}

interface Project {
    path: string;
    type: string;
}

interface I18n {
    t: Function;
    switch: Function;
    current: Function;
}

interface Menu {
    // browser
    add: Function;
    remove: Function;
    get: Function;
    apply: Function;
    //renderer
    popup: Function;
}

interface Package {
    // browser
    load: Function;
    unload: Function;
    reload: Function;
}

interface Layout {
    apply: Function;
}

interface Panel {
    open: Function;
    close: Function;
}


interface Theme {
    use: Function;
}

interface Ipc {
    sendToAll: Function,
    sendToAllPackages: Function,
    sendToAllPanels: Function,
    sendToPanel: Function,
    sendToPackage: Function,
    requestToPackage: Function,
    requestToPanel: Function,
}

interface UI {}

interface Logger {
    on: Function;
    removeListener: Function;
    query: Function;
}

interface Profile {
    load: Function;
}

interface History {
    record: Function;
    commit: Function;
    clear: Function;
    undo: Function;
    redo: Function;
}

interface Dialog {
    show: Function,
    openFiles: Function,
    openDirectory: Function,
    saveFiles: Function
}

declare const IPCEvent: IPCEvent;

interface IPCEvent {
    reply: Function;
}
