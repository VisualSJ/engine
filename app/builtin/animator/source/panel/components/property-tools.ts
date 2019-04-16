
export const template = `
<div class="flex-1 property-tools">
    <div class="left">属性列表</div>
    <div class="right" @mousedown="onMouseDown">
        <i :title="t('create_prop')" class="iconfont icon-add" name="createProp"></i>
    </div>
</div>
`;

export const props = [
    'uuid',
];

export function data() {
return {
    menu: [],
};
}

export const watch = {
    async uuid() {
        // @ts-ignore
        await this.refresh();
    },
};

export const computed = {

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
            if (!that.uuid) {
                console.warn('please select node first!');
                return;
            }
            Editor.Menu.popup({
                x: event.pageX,
                y: event.pageY,
                menu: that.menu,
            });
        } else {
            that.$emit('datachange', name);
        }
    },

    async refresh() {
        // @ts-ignore
        const that: any = this;
        const properties = await Editor.Ipc.requestToPanel('scene', 'query-animation-properties', that.uuid);
        const result = [];
        for (const item of properties) {
            const label = item.displayName.replace(/\./g, '_');
            result.push({
                label,
                click() {
                    that.$emit('datachange', 'createProp', [item.comp, item.prop]);
                },
            });
        }
        that.menu = result;
    },
};
export async function mounted() {}
