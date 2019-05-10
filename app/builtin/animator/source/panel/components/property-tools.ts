
export const template = `
<div class="property-tools">
    <div class="left">属性列表</div>
    <div class="right" @mousedown="onMouseDown">
        <i :title="t('create_prop')" class="iconfont icon-add" name="createProp"></i>
    </div>
</div>
`;

export const props = [
    'updataFlag',
    'menu',
];

export function data() {
    return {
    };
}

export const watch = {

    async updateFlag() {
        // @ts-ignore
        await this.refresh();
    },
};

export const computed = {
    propertiesMenu() {
        const that: any = this;
        if (!that.menu) {
            return;
        }
        let result = [];
        for (const item of that.menu) {
            const label = item.displayName.replace(/\./g, '_');
            result.push({
                label,
                click() {
                    that.$emit('datachange', 'createProp', [item.comp, item.prop]);
                },
            });
        }
        return result;
    }
};

export const components = {};

export const methods = {
    t(key: string) {
        return Editor.I18n.t(`animator.property.${key}`);
    },

    async onMouseDown(event: any) {
        const that: any = this;
        const name = event.target.getAttribute('name');
        if (name === 'createProp') {
            if (!that.menu) {
                console.warn('please select node first!');
                return;
            }
            Editor.Menu.popup({
                x: event.pageX,
                y: event.pageY,
                menu: that.propertiesMenu,
            });
        } else {
            that.$emit('datachange', name);
        }
    },

    async refresh() {
    },
};
export async function mounted() {}
