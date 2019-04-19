
export const template = `
    <div class="contrl-pointer"
        name = "pointer"
        :style="calcStyle()"
        v-if="display"
    >
        <i class="iconfont icon-arrow-right"></i>
        <span></span>
    </div>
`;

export const props = [
    'position',
    'offset',
];

export function data() {
    return {

    };
}

export const watch = {

};

export const computed = {
    display(): boolean {
        // @ts-ignore
        return this.position + this.offset >= 0;
    },
};

export const components = {};

export const methods = {
    calcStyle(): string {
        // @ts-ignore
        return `transform: translateX(${(this.position) | 0}px);`;
    },
    /**
     * 刷新组件
     */
    async refresh() {

    },
};

export function mounted() {

}
