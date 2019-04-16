
export const template = `
<div class="content-item property">
    <span class="name">{{name}}</span>
    <span class="oprate" @mousedown="onMouseDown">
        <i class="key"
            :empty="isEmpty"
            :title="oprateTitle"
        ></i>
        <i class="iconfont icon-del"
            name="removeProp"
            :title="t('remove_prop')"
        ></i>
    </span>
</div>
`;

export const props = [
    'info',
    'name',
    'frame',
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
    params() {
        const that: any = this;
        if (that.info[0] && that.info[0].type === 'props') {
            return [null, that.name, that.frame];
        }

        return [that.name, that.name, that.frame];
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
        if (event.target.getAttribute('name') === 'removeProp') {
            that.$emit('datachange', 'removeProp', that.params);
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
