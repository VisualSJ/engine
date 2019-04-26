declare const Editor: Editor;

interface Editor {
    dev: boolean;
    App: App;
    Task: Task;
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
    Theme: Theme;
    Dialog: Dialog;
    Utils: Utils;
    Selection: Selection;
}

interface App {
    home: string;
    path: string;
    project: string;
}

interface Task {
    addSyncTask: Function;
    removeSyncTask: Function;
}

interface Project {
    path: string;
    type: string;
    tmpDir: string;
}

interface I18n {
    language: string;
    t: Function;
    switch: Function;
    current: Function;
    on: Function;
    removeListener: Function;
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
    getPackages: Function,
    load: Function;
    loadFolder: Function;
    unload: Function;
    reload: Function;
    disabled: Function;
    enabled: Function;
    on: Function;
}

interface Layout {
    apply: Function;
}

interface Panel {
    open: Function;
    close: Function;
    has: Function;
}

interface Theme {
    use: Function;
    useColor: Function;
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

interface UI {
    NumInput: any;
    DragArea: any,
}

interface Logger {
    on: Function;
    removeListener: Function;
    query: Function;
    clear: Function;
}

interface Profile {
    load: Function;
}


interface Dialog {
    show: Function,
    openFile: Function,
    openDirectory: Function,
    saveFile: Function
}
interface Utils {
    path:string,
    File: fileUtils,
    Path: pathUtils,
    Uuid: uuidUtils,
    Math: mathUtils,
}
interface fileUtils {
    getName:Function
}
interface pathUtils {
    basenameNoExt :Function
    contains  :Function
}
interface uuidUtils {
    compressUuid: Function,
    compressHex: Function,
    decompressUuid: Function,
    isUuid: Function,
    getUuidFromLibPath: Function,
    uuid: Function,
}
interface mathUtils {
    clamp: Function,
    add: Function,
    sub: Function,
    mul: Function,
    div: Function,
}

interface Selection {
    select: Function;
    unselect: Function;
    clear: Function;
    hover: Function;
    getLastSelectedType: Function;
    getLastSelected: Function;
    getSelected: Function;
}

declare const IPCEvent: IPCEvent;

interface IPCEvent {
    reply: Function;
}
