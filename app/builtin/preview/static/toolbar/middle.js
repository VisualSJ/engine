'use stirct';

exports.template = `
<style>
    .preview-info {
        display: flex;
    }

    .preview-info > select {
        cursor: pointer;
        outline: 0;
        margin: 0;
        padding: 0.2em 0.5em;
        border-radius: var(--border-radius-n);
        text-decoration: none;
        text-overflow: ellipsis;
        border: 1px solid var(--border-dark-c);
        background: var(--image-bg, linear-gradient(#585858, #444));
        color: inherit;
        height: 24px;
    }

    .preview-info > select::after {
        display: block;
        content: ' ';
        position: absolute;
        top: 50%;
        right: .8em;
        pointer-events: none;
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 7px solid var(--border-c);
        margin-top: -3px
    }

    .preview-info > select > option {
        background: var(--main-bg);
    }

    .preview-info > div {
        height: 24px;
        margin-left: 5px;
        background: #616161;
        border-radius: 4px;
        overflow: hidden;
        font-size: 0;
    }

    .preview-info > div > svg {
        width: 10px;
        height: 10px;
        padding: 6px 10px;
        cursor: pointer;
    }

    .preview-info > div > svg:hover {
        background: #777;
    }
</style>
<div class="preview-info">
    <select class="platform">
        <option value="browser">浏览器</option>
    </select>

    <div>
        <svg class="play" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
            <path fill="currentColor" d="M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z"></path>
        </svg>
        <svg class="reload" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path fill="currentColor" d="M256.455 8c66.269.119 126.437 26.233 170.859 68.685l35.715-35.715C478.149 25.851 504 36.559 504 57.941V192c0 13.255-10.745 24-24 24H345.941c-21.382 0-32.09-25.851-16.971-40.971l41.75-41.75c-30.864-28.899-70.801-44.907-113.23-45.273-92.398-.798-170.283 73.977-169.484 169.442C88.764 348.009 162.184 424 256 424c41.127 0 79.997-14.678 110.629-41.556 4.743-4.161 11.906-3.908 16.368.553l39.662 39.662c4.872 4.872 4.631 12.815-.482 17.433C378.202 479.813 319.926 504 256 504 119.034 504 8.001 392.967 8 256.002 7.999 119.193 119.646 7.755 256.455 8z"></path>
        </svg>
    </div>
</div>
`;

exports.$ = {
    platform: '.platform',
    play: '.play',
    reload: '.reload',
};

exports.ready = function() {
    this.$.platform.addEventListener('change', () => {
        Editor.Ipc.sendToPackage('preview', 'change-platform', this.$.platform.value);
    });
    this.$.play.addEventListener('click', () => {
        Editor.Ipc.sendToPackage('preview', 'open-terminal');
    });
    this.$.reload.addEventListener('click', () => {
        Editor.Ipc.sendToPackage('preview', 'reload-terminal');
    });

};
