'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(
    join(__dirname, '../../static', '/template/list.html'),
    'utf8'
);

export const name = 'console-list';

export const props = {
    list: { type: Array },
    fontSize: { type: Number },
    lineHeight: { type: Number }
};

export function data() {
    return {
        timer: null,
        cacheListLength: 0,
        showList: [],
        wrapperStyle: { height: 0 }
    };
}

export const watch: any = {
    list() {
        this.renderList();
    }
};

export const methods: any = {
    /**
     * 切换消息具体内容显示
     * @param {number} translateY
     */
    toggleContent(translateY: number) {
        const index = this.list.findIndex(
            (item: IMessageItem) => item.translateY === translateY
        );
        const item = this.list[index];
        const height = !item.fold
            ? (item.rows * (this.lineHeight - 2) + 14 - this.lineHeight) * -1
            : item.rows * (this.lineHeight - 2) + 14 - this.lineHeight;

        item.fold = !item.fold;
        for (let i = index + 1; i < this.list.length; i++) {
            const item = this.list[i];
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
            translateY: -1000
        };
    },
    /**
     * 计算所有消息内容高度
     * @returns {number}
     */
    getHeight(): number {
        let height = 0;
        this.list.forEach((item: IMessageItem) => {
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
        this.list.some((item: IMessageItem, i: number) => {
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
            const delta = this.list.length - this.cacheListLength;
            const isAtTop = screenTop === 0;
            const isAtBottom =
                height - clientHeight - scrollTop <= delta * lineHeight;
            this.cacheListLength = this.list.length;
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
                const o = this.list[index + i];
                if (!o) {
                    item.translateY = -1000;
                    item.show = false;
                } else {
                    item.type = o.type;
                    item.rows = o.rows;
                    item.title = o.title;
                    item.content = o.content;
                    item.count = o.count;
                    item.fold = o.fold;
                    item.translateY = o.translateY;
                    item.texture = (index + i) % 2 === 0 ? 'dark' : 'light';
                    item.stack = o.stack;
                    item.show = true;
                }
            });
        });
    }
};

export async function beforeClose() {}

export async function close() {}
