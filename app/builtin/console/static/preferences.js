'use strict';

const profile = Editor.Profile.load('profile://global/packages/console.json');

exports.template = `
<ui-prop
    label="${Editor.I18n.t('console.preferences.display_date')}"
>
    <ui-checkbox class="date" slot="content"></ui-checkbox>
</ui-prop>
<ui-prop
    label="${Editor.I18n.t('console.preferences.font_size')}"
>
    <ui-select class="size" slot="content">
        <option>9</option>
        <option>10</option>
        <option>11</option>
        <option>12</option>
        <option>13</option>
        <option>14</option>
        <option>15</option>
        <option>16</option>
        <option>17</option>
        <option>18</option>
        <option>19</option>
        <option>20</option>
    </ui-select>
</ui-prop>
<ui-prop
    label="${Editor.I18n.t('console.preferences.line_height')}"
>
    
    <ui-select class="height" slot="content">
        <option>18</option>
        <option>20</option>
        <option>22</option>
        <option>24</option>
        <option>26</option>
        <option>28</option>
        <option>30</option>
        <option>32</option>
        <option>34</option>
        <option>36</option>
        <option>38</option>
        <option>40</option>
    </ui-select>
</ui-prop>
`;

exports.methods = {
    /**
     * 修改 profile 内的设置
     * @param {*} key 
     * @param {*} value 
     * @param {*} type 
     */
    changeProfile(key, value, type) {

        if (type) {
            switch(type) {
                case 'number':
                    value -= 0;
                    if (isNaN(value)) {
                        value = 0;
                    }
                    break;
                case 'booleab':
                    value = !!value;
                    break;
            }
        }

        profile.set(key, value);
        profile.save();
    },
};

exports.$ = {
    date: '.date',
    size: '.size',
    height: '.height',
};

exports.ready = function() {

    // 获取初始化参数
    this.$.date.value = profile.get('panel.displayDate');
    this.$.size.value = profile.get('panel.fontSize');
    this.$.height.value = profile.get('panel.lineHeight');

    this.$.date.addEventListener('confirm', (event) => {
        this.changeProfile('panel.displayDate', event.target.value, 'boolean');
        Editor.Ipc.sendToPackage('console', 'refresh-panel');
    });

    this.$.size.addEventListener('confirm', (event) => {
        this.changeProfile('panel.fontSize', event.target.value, 'number')
        Editor.Ipc.sendToPackage('console', 'refresh-panel');
    });

    this.$.height.addEventListener('confirm', (event) => {
        this.changeProfile('panel.lineHeight', event.target.value, 'number')
        Editor.Ipc.sendToPackage('console', 'refresh-panel');
    });
};

exports.close = function() {};