const {join} = require('path');
const {readFileSync} = require('fs-extra');

export const template = readFileSync(join(__dirname, './../../../static/template/components/event-editor.html'), 'utf-8');

export const props = [
    'events',
    'frame',
    'uuid',
];

export function data() {
return {
    default: [{
      func: 'functionName',
      params: ['param', 0, false],
    }],
    toast: '',
    toastTask: [],
    value: [],
    dirty: false,
    defaultParams: {
        string: 'param',
        number: 0,
        boolean: false,
    },
};
}

export const watch = {};

export const computed = {

};

export const components = {};

export const methods = {
    t(key: string, type = 'event_editor.') {
        return Editor.I18n.t(`animator.${type}${key}`);
    },
    onConfirm(event: any) {
        const that: any = this;
        const name = event.target.getAttribute('name');
        if (!name) {
            return;
        }
        let index = event.target.getAttribute('index');
        that.dirty = true;
        const value = event.target.value;
        switch (name) {
            case 'funcName':
                that.value[index].func = value;
                break;
            case 'changeParamType':
                index = JSON.parse(index);
                let params = that.value[index[0]].params;
                params.splice(index[1], 1, that.defaultParams[value]);
                break;
            case 'param':
                index = JSON.parse(index);
                params = that.value[index[0]];
                params.splice(index[1], 1, value);
                break;
        }
    },
    async onMouseDown(event: any) {
        const that: any = this;
        const name = event.target.getAttribute('name');
        let index = event.target.getAttribute('index');
        switch (name) {
            case 'addFunc':
                that.value.push(JSON.parse(JSON.stringify(that.default[0])));
                break;
            case 'save':
                that.saveData();
                break;
            case 'close':
                if (that.dirty) {
                    const t = function(key: string) {
                        return that.t(key, '');
                    };
                    const result = await Editor.Dialog.show({
                        type: 'info',
                        title: t('is_save'),
                        message: t('is_save_message'),
                        buttons: [t('cancel'), t('save'), t('abort')],
                        default: 0,
                        cancel: 0,
                    });
                    if (result === 0) {
                        return;
                    }
                    if (result === 1) {
                        that.saveData();
                        that.$emit('close');
                        return;
                    }
                }
                that.$emit('close');
                break;
            case 'delFunc':
                that.value.spilce(index, 1);
                break;
            case 'addParams':
                const params = that.value[index].params;
                params.push('param');
                break;
            case 'delParams':
                index = JSON.parse(index);
                const temp = that.value[index[0]].params;
                temp.splice(index[1], 1);
                break;
            case 'clearParams':
                that.value[index].params = [];
                break;
        }
    },
    showToast(msg: string) {
        const that: any = this;
        if (that.toast) {
            that.toastTask.push(msg);
            return;
        }
        that.toast = msg;
        requestAnimationFrame(() => {
            that.toast = null;
            if (that.toastTask.length > 0) {
                that.showToast(that.toastTask.shift());
            }
        });
    },

    async saveData() {
        const that: any = this;
        const result = that.value.map((item: any) => {
            return {
                frame: item.frame,
                func: item.func,
                params: item.params,
            };
        });
        Editor.Ipc.sendToPanel('scene', 'update-clip-event', that.uuid, that.frame, result);
        // that.showToast('save succuss');
    },

    refresh() {
        const that: any = this;
        let data = JSON.parse(JSON.stringify(that.events));
        data = data.filter((item: any) => {
            return item.frame === that.frame;
        });
        if (data.length < 1) {
            data = JSON.parse(JSON.stringify(that.default));
            data[0].frame = that.frame;
        }
        that.value = data;
    },
};

export function mounted() {
    // @ts-ignore
    this.refresh();
}
