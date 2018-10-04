'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');

const { getOptions, getType, T } = require('../../utils');

export const template = readFileSync(join(__dirname, '../../../static/2d/comps/sprite.html'), 'utf8');

export const props: string[] = ['target'];

export function data() {
    return {
        atlasUuid: '',
        atlasUuids: '',
        atlasMulti: false,

        spriteUuid: '',
        spriteUuids: '',
        spriteMulti: false
    };
}

export const methods = {
    getOptions,
    getType,
    T,

    /**
     * 选择 atlas
     */
    selectAtlas() {
        // todo
    },

    /**
     * 编辑 sprite
     */
    editSprite() {
        // todo
    },

    /**
     * 更新 atlas
     * @returns
     */
    updateAtlas(this: any) {
        // todo
        if (!this.target) {
            this.atlasUuid = '';
            this.atlasUuids = '';
            this.atlasMulti = false;
            return;
        }

        this.atlasUuid = this.target._atlas.value.uuid;
        this.atlasUuids = this.target._atlas.values.map((item: any) => {
            return item.uuid;
        });

        const src = this.atlasUuids[0];
        this.atlasMulti = !this.atlasUuids.every((item: string, index: number) => {
            return index === 0 || item === src;
        });
    },

    /**
     * 更新sprite
     * @returns
     */
    updateSprite(this: any) {
        if (!this.target) {
            this.spriteUuid = '';
            this.spriteUuids = '';
            this.spriteMulti = false;
            return;
        }

        this.spriteUuid = this.target.spriteFrame.value.uuid;
        this.spriteUuids = this.target.spriteFrame.values.map((item: any) => {
            return item.uuid;
        });

        const src = this.spriteUuids[0];
        this.spriteMulti = !this.spriteUuids.every((item: string, index: number) => {
            return index === 0 || item === src;
        });
    },

    /**
     * 判断当前 sprite 的 type 是否为 filled
     * @returns {boolean}
     */
    isFilledType(this: any): boolean {
        return this.target.value.type.value === '3';
    },

    /**
     * 判断当前 sprite 的 fillType 是否为 radia
     * @returns {boolean}
     */
    isRadialFilled(this: any): boolean {
        return this.target.value.fillType.value === '2';
    }
};
