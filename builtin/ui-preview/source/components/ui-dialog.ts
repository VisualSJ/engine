'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';
export const template = readFileSync(join(__dirname, '../../static/template/components/ui-dialog.html'), 'utf8');
export function data() {
    return {};
}

export const methods = {
  /**
   * 测试打开弹框
   */
  show(arg: string) {
    switch (arg) {
      case 'info':
        Editor.Dialog.show({
          type: 'info',
          message: '这里是显示内容',
          title: '弹框001:info',
          onOk() {
            console.log('点击了弹框001的确定按钮');
          },
          onCancel() {
            console.log('点击了弹框001的取消按钮');
          }
        });
        break;
      case 'warn':
        Editor.Dialog.show({
          type: 'warning',
          message: '这里是显示正文',
          title: '弹框002:warn',
          onOk() {
            console.log('点击了弹框002:warn的确定按钮');
          },
          onCancel() {
            console.log('点击了弹框002:warn的取消按钮');
          }
        });
        break;
      case 'error':
          Editor.Dialog.show({
            type: 'error',
            title: '弹框003:error',
            message: '这里是错误信息',
            // onOk() {
            //   console.log('点击了弹框003的确定按钮');
            // },
            onCancel() {
              console.log('点击了弹框003的取消按钮');
            }
          });
          break;
      case 'okText':
          Editor.Dialog.show({
            okText: '改了确认按钮的文本',
          });
          break;
      case 'both':
          Editor.Dialog.show({
            okText: '改了确认按钮的文本',
            cancelText: '改了取消按钮的文本'
          });
          break;
      case 'buttons':
        Editor.Dialog.show({
          buttons: ['按钮1', '按钮2', '按钮3', '按钮4'],
          callback(index: number) {
            switch (index) {
              case 0:
                console.log('button 1');
                break;
              case 1:
                console.log('button 2');
                break;
              case 2:
                console.log('button 3');
                break;
              case 3:
                console.log('button 4');
                break;
            }
          }
        });
    }
  },

  openFiles(filters = 'all') {
    Editor.Dialog.openFiles({
      title: '打开文件标题测试',
      filters,
      onOk(path: string[]) {
        if (!path) {
          console.log('取消选择');
          return;
        }
        console.log('选中的文件位置' + path);
      },
    });
  },

  openDirectory() {
    Editor.Dialog.openDirectory({
      title: '打开文件夹标题测试',
      onOk(path: string[]) {
        if (!path) {
          console.log('取消选择');
          return;
        }
        console.log('选中的文件夹位置' + path);
      },
    });
  },

  savefiles() {
    Editor.Dialog.saveFiles({
      title: '保存文件标题测试',
      onOk(path: string[]) {
        if (!path) {
          console.log('取消选择');
          return;
        }
        console.log('选中了某文件夹' + path);
      },
    });
  }
};

export async function beforeClose() {}

export async function close() {}
