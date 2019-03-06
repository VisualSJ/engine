'use strict';

import { readFileSync } from 'fs';
import { copy } from 'iclipboard';
import { join } from 'path';

const manager = require('../manager');
const outputList = manager.outputList;

export const template = readFileSync(
    join(__dirname, '../../static', '/template/list.html'),
    'utf8'
);

export const name = 'console-list';

export const props = {
    value: { type: Boolean },
    fontSize: { type: Number },
    lineHeight: { type: Number },
};

export function data() {
    return {
        // @ts-ignore
        change: this.value,
        timer: null,
        cacheListLength: 0,
        showList: [],
        wrapperStyle: { height: 0 },
    };
}

export const watch: any = {
    value(val: boolean) {
        this.change = val;
    },
    change(val: boolean) {
        if (val) {
            this.renderList();
            this.$emit('input', false);
        }
    },
    lineHeight(val: number) {
        if (val) {
            this.renderList();
        }
    },
};

export const methods: any = {
    /**
     * 切换消息具体内容显示
     * @param {number} translateY
     */
    toggleContent(translateY: number) {
        const index = outputList.findIndex(
            (item: IMessageItem) => item.translateY === translateY
        );
        const item = outputList[index];
        const height = !item.fold
            ? (item.rows * (this.lineHeight - 2) + 14 - this.lineHeight) * -1
            : item.rows * (this.lineHeight - 2) + 14 - this.lineHeight;

        item.fold = !item.fold;
        for (let i = index + 1; i < outputList.length; i++) {
            const item = outputList[i];
            item.translateY += height;
        }
        this.wrapperStyle.height = `${this.getHeight()}px`;
        this.onScroll();
    },
    createItem(): IMessageItem {
        return {
            content: [],
            rows: 0,
            message: '',
            type: '',
            title: '',
            texture: '',
            count: 1,
            fold: true,
            show: false,
            stack: [],
            translateY: -1000,
        };
    },
    /**
     * 计算所有消息内容高度
     * @returns {number}
     */
    getHeight(): number {
        let height = 0;
        outputList.forEach((item: IMessageItem) => {
            item.fold
                ? (height += this.lineHeight)
                : (height += item.rows * (this.lineHeight - 2) + 14);
        });
        return height;
    },
    /**
     * 获取滚动位置对应的消息index
     * @param {number} scrollTop
     * @param {number} lineHeight
     * @returns {number}
     */
    getScrollPosition(scrollTop: number, lineHeight: number): number {
        let height = 0;
        let index = 0;
        outputList.some((item: IMessageItem, i: number) => {
            if (item.fold) {
                height += lineHeight;
            } else {
                height += item.rows * (lineHeight - 2) + 14;
            }
            if (height > scrollTop) {
                index = i - 1;
                return true;
            }
        });
        return index;
    },
    /**
     * 渲染可见消息列表
     */
    renderList(): void {
        const showList = this.showList;
        const height = this.getHeight();
        const lineHeight = this.lineHeight;
        const itemCount: number = (this.$el.clientHeight / lineHeight + 3) | 0;
        this.wrapperStyle.height = `${height}px`;
        for (; showList.length > itemCount;) {
            showList.pop();
        }
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            const height = this.getHeight();
            const scrollTop = this.$el.scrollTop;
            const clientHeight = this.$el.clientHeight;
            const delta = outputList.length - this.cacheListLength;
            const isAtTop = scrollTop === 0;
            const isAtBottom =
                height - clientHeight - scrollTop <= delta * lineHeight;
            this.cacheListLength = outputList.length;
            // 未滚动或者在底部需要滚动到底部
            if (isAtTop || isAtBottom) {
                this.$el.scrollTop = height - clientHeight;
            }

            for (let i = 0; i < itemCount; i++) {
                const item = showList[i];
                if (item) {
                    item.show = false;
                    item.translateY = -1000;
                } else {
                    showList.push(this.createItem());
                }
            }

            this.onScroll();
        }, 10);
    },
    /**
     * 滚动事件
     */
    onScroll() {
        requestAnimationFrame(() => {
            const scrollTop = this.$el.scrollTop;
            const lineHeight = this.lineHeight;
            const index = this.getScrollPosition(scrollTop, lineHeight);
            // 遍历下要显示的列表元素对存在的item进行数据填充
            this.showList.forEach((item: IMessageItem, i: number) => {
                const outputItem = outputList[index + i];
                if (!outputItem) {
                    item.translateY = -1000;
                    item.show = false;
                } else {
                    item.date = outputItem.date;
                    item.type = outputItem.type;
                    item.rows = outputItem.rows;
                    item.title = outputItem.title;
                    item.content = outputItem.content;
                    item.count = outputItem.count;
                    item.fold = outputItem.fold;
                    item.translateY = outputItem.translateY;
                    item.texture = (index + i) % 2 === 0 ? 'dark' : 'light';
                    item.stack = outputItem.stack;
                    item.show = true;
                }
            });
        });
    },
    /**
     * 显示复制菜单
     * @param {*} event
     * @param {*} item
     */
    showMenuPast(event: any, item: any) {
        let info = item.title;
        if (item.rows > 1) {
            item.content.forEach((str: string) => {
                info += str;
            });
        }
        Editor.Menu.popup({
            x: event.pageX,
            y: event.pageY,
            menu: [
                {
                    label: '复制',
                    click() {
                        copy(info);
                        console.log(info);
                    },
                },
            ],
        });
    },
};

export async function beforeClose() {}

export async function close() {}
