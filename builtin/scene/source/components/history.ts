let currentIndex = -1; // 当前指针
const totalSteps: string[] = []; // 记录的步骤数据
let timeId: any; // 避免连续操作带来的全部执行，
let isRunning = false;

/**
 * 存档
 */
async function save() {
    const step = await ipcDump();
    const stepStr = JSON.stringify(step);

    // 最后一步的数据和要保存的新数据一样，就不用再保存了
    if (totalSteps[currentIndex] === stepStr) {
        return;
    }

    // 清除指针后面的数据
    totalSteps.splice(currentIndex + 1);

    // 存入新步骤
    totalSteps.push(stepStr);

    // 如果步骤数大于 100, 始终保持最大 100
    if (totalSteps.length > 100) {
        totalSteps.shift();
    }

    // 重设指针
    currentIndex = totalSteps.length - 1;
}

/**
 * 撤销
 */
function undo() {
    if (currentIndex <= 0) {
        return;
    }
    currentIndex--;

    const state = ipcRefresh();

    // 运行中，定时下次运行
    if (state === false) {
        clearTimeout(timeId);
        timeId = setTimeout(() => {
            ipcRefresh();
        }, 1000);
    }
}

/**
 * 重做
 */
function redo() {
    if (currentIndex === totalSteps.length - 1) {
        return;
    }
    currentIndex++;

    const state = ipcRefresh();

    // 运行中，定时下次运行
    if (state === false) {
        clearTimeout(timeId);
        timeId = setTimeout(() => {
            ipcRefresh();
        }, 1000);
    }
}

/**
 * ipc 新数据给场景刷新
 */
function ipcRefresh() {
    if (isRunning) {
        return false;
    }

    isRunning = true;
    const step = JSON.parse(totalSteps[currentIndex]);
    // console.log(step, totalSteps);

    // 保障一次运行
    setTimeout(() => {
        isRunning = false;
    }, 800); // 要不上面的 setTime 时间短，确保最后一次指令能执行

    // 数据发给场景刷新
    // Editor.Ipc.requestToPanel('scene', 'refresh', step);
}

/**
 * ipc 获取场景数据 dumpdata
 */
async function ipcDump() {
    const dumpdata = Math.random().toString();
    // const dumpdata=Editor.Ipc.requestToPanel('scene', 'dumpData');
    return dumpdata;
}

exports.save = save;
exports.undo = undo;
exports.redo = redo;
