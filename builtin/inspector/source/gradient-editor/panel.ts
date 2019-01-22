'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const d3 = require('d3');
const Vue = require('vue/dist/vue.js');
const { cloneDeep } = require('lodash');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let vm: any = null;
let cache: any;

export const style = readFileSync(join(__dirname, '../index.css'));

export const template = readFileSync(
    join(__dirname, '../../static', '/template/gradient-editor.html')
);

/**
 * 配置 inspector 的 iconfont 图标
 */
export const fonts = [
    {
        name: 'inspector',
        file: 'packages://inspector/static/iconfont.woff',
    },
];

export const $ = { content: '.gradient-editor' };

export const messages = {
    data(data: any) {
        if (data) {
            cache = data;
            vm.init({
                colorKeys: data.colorKeys,
                alphaKeys: data.alphaKeys,
                mode: data.mode,
            });
        }
    },
};

export const listeners = {
    resize() {
        vm.resize();
    },
};

/**
 * 根据模式计算出需要的 stop
 *
 * @param {any[]} colors
 * @param {any[]} alphas
 * @param {number} mode
 * @returns
 */
function mergeStops(colors: any[], alphas: any[], mode: number) {
    const times = colors.concat(alphas).map((item: any) => item.time).sort((a, b) => a - b);
    const stops = [...new Set(times)].reduce((acc: any[], cur: number) => {
        const color = colors.find((item: any) => !item.hide && item.time === cur) || {};
        const alpha = alphas.find((item: any) => !item.hide && item.time === cur) || {};
        if (color.time !== undefined || alpha.time !== undefined) {
            acc.push({ ...color, ...alpha });
        }
        return acc;
    }, []);

    // console.log('stops', stops, colors, alphas, times);
    cache.colorKeys = colors;
    cache.alphaKeys = alphas;
    cache.mode = mode;
    Editor.Ipc.sendToPanel('inspector', 'gradient:change', cache);

    for (const [index, stop] of stops.entries()) {
        const { time, color, alpha } = stop;
        if (color === undefined) {
            stop.color = getValByType(index, time, stops, 'color', mode);
        }
        if (alpha === undefined) {
            stop.alpha = getValByType(index, time, stops, 'alpha', mode);
        }
    }
    if (mode === 1) {
        // mode fixed
        const repeatStops = [];
        for (const [index, stop] of stops.entries()) {
            const { time } = stop;
            repeatStops.push(stop);
            if (index < stops.length - 1) {
                const nextStop = stops[index + 1];
                repeatStops.push({ ...nextStop, time });
            }
        }
        return repeatStops;
    } else {
        // mode blend
        return stops;
    }
}

/**
 * 根据类型计算值
 *
 * @param {number} index
 * @param {number} time
 * @param {any[]} stops
 * @param {string} type
 * @param {number} mode
 * @returns
 */
function getValByType(index: number, time: number, stops: any[], type: string, mode: number) {
    let next: any;
    let prev: any;
    for (let i = index + 1; i < stops.length; i++) {
        const stop = stops[i];
        if (stop[type] !== undefined) {
            next = stop;
            break;
        }
    }
    for (let i = index - 1; i >= 0; i--) {
        const stop = stops[i];
        if (stop[type] !== undefined) {
            prev = stop;
            break;
        }
    }

    if (!prev) {
        prev = next;
    }
    if (!next) {
        next = prev;
    }
    if (mode === 1) {
        return next[type];
    }

    if (!prev) {
        prev = {color: [255, 255, 255], time: 0};
    }

    if (!next) {
        next = {color: [255, 255, 255], time: 1};
    }

    let val = prev[type];
    if (prev !== next) {
        val = interpolateStopProperty(prev, next, time, type);
    }

    return val;
}

/**
 * 计算插值
 *
 * @param {*} prev
 * @param {*} next
 * @param {number} current
 * @param {string} type
 * @returns
 */
function interpolateStopProperty(prev: any, next: any, current: number, type: string) {
    const { time: start } = prev;
    const { time: end } = next;
    const total = end - start;
    const delta = current - start;
    const ratio = delta / total;
    const left = 1 - ratio;
    if (type === 'color') {
        return [0, 1, 2].map((key: number) => Math.round(
            prev.color[key] * left + next.color[key] * ratio
        ));
    } else {
        return Math.round(prev.alpha * 100 * left + next.alpha * 100 * ratio) / 100;
    }
}

export async function ready() {

    // @ts-ignore
    panel = this;

    // 初始化 vue
    vm = new Vue({
        el: panel.$.content,

        data: {
            enumList: [{
                name: 'Blend',
                value: 0,
            }, {
                name: 'Fixed',
                value: 1,
            }],
            gradient: {
                mode: 0,
                alphaKeys: [{ time: 0, alpha: 0, hide: false }, { time: 1, alpha: 1, hide: false }],
                colorKeys: [
                    {
                        time: 0.5, color: [249, 49, 83], hide: false,
                    }, {
                        time: 1, color: [255, 255, 255], hide: false,
                    },
                ],
            },
            margin: {
                top: 15,
                bottom: 15,
                left: 5,
                right: 5,
            },
            config: {
                anchorWidth: 10,
                anchorHeight: 15,
                width: 0,
                height: 75,
                defaultColor: [255, 255, 255],
                defaultAlpha: 1,
                colorLength: 8,
                alphaLength: 8,
            },
            selectedItem: null,
        },

        async mounted() {
            // const data = await Editor.Ipc.requestToPackage('inspector', 'get-gradient-data');
            // if (data) {
            //     this.init(data);
            // }
        },
        methods: {

            init(this: any, data: { colorKeys: any[], alphaKeys: any[], mode: number }) {
                data.colorKeys.map((item: any) => item.type = 'color');
                data.alphaKeys.map((item: any) => item.type = 'alpha');
                this.gradient = data;
                this.resize();
            },

            /**
             * 根据 type 获取对应的数据
             *
             * @param {*} this
             * @param {string} type
             * @returns
             */
            getVal(this: any, type: string) {
                if (this.selectedItem) {
                    switch (type) {
                        case 'color':
                            return JSON.stringify([...this.selectedItem.color, 255]);
                        case 'time':
                            return `${(this.selectedItem.time * 100).toFixed()}`;
                        case 'alpha':
                            return `${(this.selectedItem.alpha * 255).toFixed()}`;
                        default:
                            return this.selectedItem[type];
                    }
                }
            },

            /**
             * 根据 type 更新数据
             *
             * @param {*} this
             * @param {string} type
             * @param {*} event
             */
            confirm(this: any, type: string, event: any) {

                const { value } = event.target;
                this.update({ operation: 'assign', data: { value, type } });
            },

            getAnchors(this: any) {
                const { gradient: { alphaKeys, colorKeys } } = this;
                const colors = colorKeys.map((item: any, index: number) => {
                    return { ...item, index };
                });
                const alphas = alphaKeys.map((item: any, index: number) => {
                    return { ...item, index };
                });

                return colors.concat(alphas).sort((a: any, b: any) => {
                    if (a.time === b.time) {
                        if (a.active) {
                            return true;
                        }
                        if (b.active) {
                            return false;
                        }
                    }
                    return a.time - b.time;
                });
            },

            getStops(this: any) {
                const { gradient: { alphaKeys, colorKeys, mode } } = this;
                const colors = cloneDeep(colorKeys).sort((a: any, b: any) => {
                    if (a.time === b.time) {
                        if (a.active) {
                            return false;
                        }
                        if (b.active) {
                            return true;
                        }
                    }
                    return a.time - b.time;
                });
                const alphas = cloneDeep(alphaKeys).sort((a: any, b: any) => {
                    if (a.time === b.time) {
                        if (a.active) {
                            return false;
                        }
                        if (b.active) {
                            return true;
                        }
                    }
                    return a.time - b.time;
                });

                return mergeStops(colors, alphas, mode);
            },

            /**
             * 绘制渐变
             *
             * @param {*} this
             * @param {string} type
             * @param {number} index
             */
            drawStops(this: any, type: string, index: number) {
                const stops = this.getStops(type, index);
                const gradient = this._grad.selectAll('stop')
                    .data(stops, (d: any, i: number) => {
                        const { color, alpha, time } = d;
                        return `${time}${alpha}${color}${i}`;
                    });
                gradient.exit().remove();

                gradient.enter().append('stop')
                    .merge(gradient)
                    .attr('offset', (d: any) => {
                        return d.time * 100 + '%';
                    })
                    .style('stop-color', (d: any) => d3.rgb(...d.color))
                    .style('stop-opacity', (d: any) => d.alpha !== undefined ? d.alpha : 1);

            },

            /**
             * 绘制控制点
             *
             * @param {*} this
             * @param {string} [tag]
             */
            drawAnchors(this: any, tag?: string) {
                const anchors = this.getAnchors();
                const { config: { width }, margin } = this;
                const rectWidth = width - margin.left - margin.right;
                const self = this;

                const paths = this._svg.selectAll('path')
                    .data(anchors, (d: any, index: number) => {
                        const { color, alpha, time, type } = d;
                        return `${type}${time}${alpha}${color}${index}`;
                    });

                paths.exit().remove();
                let enable = false;
                paths.enter()
                    .append('path')
                    .merge(paths)
                    .attr('class', (d: any) => {
                        return ['hide', 'add', 'active'].filter((key: string) => d[key]).concat(['anchor']).join(' ');
                    })
                    .attr('index', (d: any) => {
                        return d.index;
                    })
                    .attr('type', (d: any) => {
                        return d.type;
                    })
                    .attr('d', (d: any) => {
                        return this.drawAnchor(d);
                    })
                    .attr('transform', (d: any) => {
                        return `translate(${d.time * rectWidth}, 0)`;
                    })
                    .attr('fill', (d: any) => {
                        if (d.type === 'color') {
                            return d3.rgb(...d.color);
                        }
                        return d3.rgb(...Array.from({ length: 3 }, () => d.alpha * 255));
                    }).order().call(
                        d3.drag().filter(['dragstart', 'drag'])
                            .on('start', function(this: any) {
                                const anchor = d3.select(this);
                                const data = anchor.datum();
                                self.update({ data, operation: 'active' });
                            })
                            .on('drag', function(this: any) {
                                if (d3.event.dx || d3.event.dy) {
                                    enable = true;
                                    self.update({ operation: 'move' });
                                }

                            })
                            .on('end', function(this: any) {
                                if (enable) {
                                    enable = false;
                                    self.update({ operation: 'drop' });
                                }
                            })
                    );
            },

            /**
             * 根据操作类型更新
             *
             * @param {*} this
             * @param {{
             *                 data?: any, operation: string,
             *             }} options
             * @returns
             */
            update(this: any, options: {
                data?: any, operation: string,
            }) {
                const { config: { width, height }, margin } = this;
                const { data, operation } = options;

                switch (operation) {
                    case 'active': {
                        // 取消选中
                        this.gradient.colorKeys.map((item: any) => { item.active = false; });
                        this.gradient.alphaKeys.map((item: any) => { item.active = false; });

                        const { type, index } = data;
                        const group = this.gradient[`${type}Keys`];
                        const item = group[index];
                        item.active = true;
                        this.selectedItem = item;
                        this.drawAnchors();
                        break;
                    }
                    case 'move': {
                        const { type, index } = this._svg.select('.anchor.active').datum();
                        const group = this.gradient[`${type}Keys`];
                        const item = group[index];
                        const [x, y] = d3.mouse(this._svg.node());
                        const hide = type === 'color' ? (y < height - margin.bottom || y > height)
                            : (y > margin.top || y < 0);
                        const ratio = Math.round(
                            (x - margin.left)
                            / (width - margin.left - margin.right) * 100
                        ) / 100;
                        const time = Math.max(Math.min(ratio, 1), 0);
                        item.time = time;

                        if (item.hide && hide) {
                            return;
                        }

                        item.hide = group.length > 1 && hide;
                        this.drawAnchors();
                        this.drawStops();

                        break;
                    }
                    case 'drop': {
                        const { type, index } = this._svg.select('.anchor.active').datum();
                        const group = this.gradient[`${type}Keys`];
                        const item = group[index];
                        const [x, y] = d3.mouse(this._svg.node());
                        const hide = type === 'color' ? (y < height - margin.bottom || y > height)
                            : (y > margin.top || y < 0);
                        const ratio = Math.round(
                            (x - margin.left)
                            / (width - margin.left - margin.right) * 100
                        ) / 100;
                        const time = Math.max(Math.min(ratio, 1), 0);
                        item.time = time;
                        item.hide = group.length > 1 && hide;

                        if (item.hide) {
                            group.splice(index, 1);
                            this.selectedItem = null;
                        } else {
                            const uniqueItems = [...new Set(group.map((item: any) => item.time))];
                            if (group.length > uniqueItems.length) {
                                let repeatItemIndex;
                                for (const [i, o] of group.entries()) {
                                    if (o.time === time && i !== index) {
                                        repeatItemIndex = i;
                                        break;
                                    }
                                }
                                group.splice(repeatItemIndex, 1);
                            }
                        }

                        this.drawAnchors();
                        this.drawStops();
                        break;
                    }
                    case 'create': {
                        const [x, y] = d3.mouse(this._svg.node());
                        if (y > margin.top && y < height - margin.bottom) {
                            return false;
                        }
                        const type = y > margin.top ? 'color' : 'alpha';
                        const group = this.gradient[`${type}Keys`];
                        const index = group.length;
                        if (index >= this.config[`${type}Length`]) {
                            return false;
                        }

                        const ratio = Math.round(
                            (x - margin.left)
                            / (width - margin.left - margin.right) * 100
                        ) / 100;
                        const time = Math.max(Math.min(ratio, 1), 0);

                        const val = type === 'color' ? [...this.config.defaultColor] : this.config.defaultAlpha;
                        const data = { time, type, [type]: val, index };

                        group.push(data);
                        this.drawStops();
                        this.update({ data, operation: 'active' });

                        return true;
                    }

                    case 'assign': {
                        const { type, value } = data;
                        if (type === 'mode') {
                            this.gradient.mode = parseInt(value, 10);
                            return this.drawStops();
                        }
                        if (this.selectedItem) {
                            switch (type) {
                                case 'time': {
                                    this.selectedItem.time = value / 100;
                                    break;
                                }
                                case 'alpha': {
                                    this.selectedItem.alpha = Math.floor(value * 100 / 255) / 100;
                                    break;
                                }
                                case 'color': {
                                    this.selectedItem.color = value.slice(0, -1);
                                    break;
                                }
                                default:
                                    break;
                            }
                            this.drawAnchors();
                            this.drawStops();
                        }
                        break;
                    }

                    default:
                        break;
                }
            },

            resize(this: any) {
                const self = this;
                const el = this.$el.querySelector('.gradient');
                this.config.width = el.clientWidth;
                const {
                    config: { width, height }, margin,
                } = this;
                const rectWidth = width - margin.left - margin.right;
                const rectHeight = height - margin.top - margin.bottom;

                if (!this._svg) {

                    this._svg = d3.select(el).append('svg')
                        .attr('width', width)
                        .attr('height', height);

                    this._grad = this._svg.append('defs')
                        .append('linearGradient')
                        .attr('id', 'grad')
                        .attr('x1', '0')
                        .attr('x2', '100%')
                        .attr('y1', '0')
                        .attr('y2', 0);

                    this._rect = this._svg.append('rect')
                        .attr('class', 'canvas')
                        .attr('x', margin.left)
                        .attr('y', margin.top)
                        .attr('width', rectWidth)
                        .attr('height', rectHeight)
                        .attr('fill', 'url(#grad)');

                } else {
                    this._svg.attr('width', width);
                    this._rect.attr('width', rectWidth)
                        .attr('height', rectHeight)
                        .attr('fill', 'url(#grad)');
                }
                let enable = false;
                this._svg.call(
                    d3.drag()
                        .on('start', function(this: any) {
                            enable = self.update({ operation: 'create' });
                        })
                        .on('drag', function(this: any) {
                            if (enable) {
                                self.update({ operation: 'move' });
                            }
                        })
                        .on('end', function(this: any) {
                            if (enable) {
                                enable = false;
                                self.update({ operation: 'drop' });
                            }
                        })
                );

                this.drawStops();
                this.drawAnchors();
            },

            drawAnchor(this: any, item: any) {
                const { margin, config: { height, anchorWidth, anchorHeight } } = this;
                const { type } = item;
                const isDown = type === 'color';
                const x = margin.left;
                const y = isDown ? height - margin.bottom : margin.top;
                const t = isDown ? 1 : -1;

                return `M${x} ${y}
                    L${x - anchorWidth / 2} ${y + anchorHeight / 3 * t}
                    ${x - anchorWidth / 2} ${y + anchorHeight * t}
                    ${x + anchorWidth / 2} ${y + anchorHeight * t}
                    ${x + anchorWidth / 2} ${y + anchorHeight / 3 * t}z`;
            },
        },
    });

    Editor.Ipc.sendToPanel('inspector', 'gradient:state', true);
}

export async function beforeClose() { }

export async function close() {
    Editor.Ipc.sendToPackage('inspector', 'gradient:state', false);
}
