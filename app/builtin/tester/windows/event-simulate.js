const robot = require('@editor/robotjs');
class MouseSimulate {
    moveTo(x, y) {
        robot.moveMouse(x, y);
    }

    click() {
        robot.mouseClick('left', false);
    }

    rightClick() {
        robot.mouseClick('right', false);
    }

    doubleClick() {
        robot.mouseClick('left', true);
    }

    down() {
        robot.mouseToggle('down');
    }

    up() {
        robot.mouseToggle('up');
    }

    dragTo(x, y) {
        this.down();
        robot.dragMouse(x, y);
        this.up();
    }

    /**
     * 滚动的增减幅度
     * @param {*} x 正数往右，负数往左
     * @param {*} y 正数往上，负数往下
     */
    scroll(x, y) {
        robot.scrollMouse(x, y);
    }

}

/**
 * 快捷键的 Keys 请查阅 https://robotjs.io/docs/syntax#keys
 */
class KeyboardSimulate {
    press(key) {
        robot.keyTap(key);
    }
    ctrl(key) {
        robot.keyTap(key, ['command', 'control']);
    }
    shift(key) {
        robot.keyTap(key, ['shift']);
    }
    ctrlShift(key) {
        robot.keyTap(key, ['command', 'control', 'shift']);
    }
    /**
     * 状态保持模拟
     * @param {*} key
     * @param {*} modifier String or an array. Accepts alt, command (win), control, and shift.
     */
    keydown(key, modifier) {
        robot.keyToggle(key, 'down', modifier);
    }
    keyup(key, modifier) {
        robot.keyToggle(key, 'up', modifier);
    }

    type(str) {
        robot.typeString(str);
    }
}

class ScreenSimulate {
    size() {
        return robot.getScreenSize();
    }
    capture(x, y, width, height) {
        return robot.getScreenSize(x, y, width, height);
    }
    color(x, y) {
        return robot.getPixelColor(x, y);
    }
}

module.exports = {
    mouse: new MouseSimulate(),
    keyboard: new KeyboardSimulate(),
    screen: new ScreenSimulate(),
};
