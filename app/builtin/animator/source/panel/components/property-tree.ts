
export const template = `
<div class="content-item property">
    <span class="name">{{name}}</span>
    <span class="oprate" @mousedown="onMouseDown">
        <i class="key"
            :empty="isEmpty"
            :title="oprateTitle"
        ></i>
        <i class="iconfont icon-list"
            name="showPopMenu"
        ></i>
    </span>
</div>
`;

export const props = [
    'info',
    'name',
    'frame',
    'prop',
    'comp',
];

export function data() {
    return {

    };
}

export const watch = {

};

export const computed = {
    oprateTitle() {
        const that: any = this;
        if (that.isEmpty) {
            return that.t('remove_key');
        } else {
            return that.t('create_key');
        }
    },
    isEmpty() {
        const that: any = this;
        if (!that.info || that.info.length < 1) {
            return false;
        }
        const index = that.info.findIndex((item: any) => {
            return item.frame === that.frame;
        });
        return index !== -1;
    },
    params(): any {
        // @ts-ignore
        return [this.comp, this.prop, this.frame];
    },
};

export const components = {};

export const methods = {
    t(key: string) {
        return Editor.I18n.t(`animator.property.${key}`);
    },
    onMouseDown(event: any) {
        if (!event.target) {
            console.log(event);
            return;
        }
        const that: any = this;
        if (event.target.getAttribute('name') === 'showPopMenu') {
            Editor.Menu.popup({
                x: event.pageX,
                y: event.pageY,
                menu: [{
                        label: that.t('remove_prop'),
                        click() {
                            that.$emit('datachange', 'removeProp', that.params);
                        },
                    },
                    {
                        label: that.t('clear_keys'),
                        click() {
                            that.$emit('datachange', 'clearKeys', that.params);
                        },
                    },
                ],
            });
            return;
        }
        const isEmpty = event.target.getAttribute('empty');
        if (!isEmpty) {
            that.$emit('datachange', 'createKey', that.params);
        } else {
            that.$emit('datachange', 'removeKey', that.params);
        }
    },
};
