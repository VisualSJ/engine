'use strict';

const { shell } = require('electron');

exports.template = `
<style>
    .project-operation > span {
        display: inline-block;
        white-space: nowrap;
        background: var(--image-bg);
        border: 1px solid var(--border-dark-c);
        border-radius: 4px;
        height: 20px;
        line-height: 20px;
        padding: 0 10px;
        margin-right: 6px;
        cursor: pointer;
    }

    .project-operation > span:last-child {
        margin-right: 0;
    }

    .project-operation > span > svg {
        width: 14px;
        position: relative;
        top: 1px;
    }
</style>

<div class="project-operation">
    <span class="open-project">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M572.694 292.093L500.27 416.248A63.997 63.997 0 0 1 444.989 448H45.025c-18.523 0-30.064-20.093-20.731-36.093l72.424-124.155A64 64 0 0 1 152 256h399.964c18.523 0 30.064 20.093 20.73 36.093zM152 224h328v-48c0-26.51-21.49-48-48-48H272l-64-64H48C21.49 64 0 85.49 0 112v278.046l69.077-118.418C86.214 242.25 117.989 224 152 224z"></path></svg>
        项目路径
        </span>
    <span class="open-editor">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M572.694 292.093L500.27 416.248A63.997 63.997 0 0 1 444.989 448H45.025c-18.523 0-30.064-20.093-20.731-36.093l72.424-124.155A64 64 0 0 1 152 256h399.964c18.523 0 30.064 20.093 20.73 36.093zM152 224h328v-48c0-26.51-21.49-48-48-48H272l-64-64H48C21.49 64 0 85.49 0 112v278.046l69.077-118.418C86.214 242.25 117.989 224 152 224z"></path></svg>
        安装路径
    </span>
</div>
`;

exports.$ = {
    project: '.open-project',
    editor: '.open-editor',
};

exports.ready = function() {
    this.$.project.addEventListener('click', () => {
        shell.showItemInFolder(Editor.Project.path);
    });
    this.$.editor.addEventListener('click', () => {
        shell.showItemInFolder(Editor.App.path);
    });
};
