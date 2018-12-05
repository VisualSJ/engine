'use strict';

let v2 = cc.v2;
let addMoveHandles = Editor.GizmosUtils.addMoveHandles;

function SegmentTool (svg, segment, callbacks) {
    let tool = svg.group();
    tool.segment = segment;
    tool.curveTools = [];

    let controls = tool.group();

    let pos = segment.pos;
    let inPos = segment.inControl;
    let outPos = segment.outControl;

    function selectStyle(svg) {
        return svg.fill({color: '#fff'}).stroke({color: '#000'});
    }

    let inLine = controls.line(pos.x, pos.y, inPos.x, inPos.y).stroke({color: '#eee', width: 1});
    let outLine = controls.line(pos.x, pos.y, outPos.x, outPos.y).stroke({color: '#eee', width: 1});

    let rect = tool.rect(5, 5).style('cursor', 'move');
    rect.center(pos.x, pos.y);

    let inControl = selectStyle(controls.circle(8, 8)).style('cursor', 'move');
    inControl.center(inPos.x, inPos.y);

    let outControl = selectStyle(controls.circle(8, 8)).style('cursor', 'move');
    outControl.center(outPos.x, outPos.y);

    // selection

    tool.select = function () {
        if (callbacks.beforeSelected) {
            callbacks.beforeSelected(tool);
        }

        selectStyle(rect);

        if (!segment.keyframe) {
            controls.show();
        }
    };

    tool.unselect = function () {
        rect.fill({color: '#4793e2'});

        if (!segment.keyframe) {
            controls.hide();
        }
    };

    let originShow = tool.show;
    tool.show = function () {
        let pos = segment.pos;
        rect.width(10);
        rect.height(10);
        rect.center(pos.x, pos.y);
        rect.stroke({color: '#000'});

        if (!segment.keyframe) {
            originShow.call(tool);
        }
    };

    let originHide = tool.hide;
    tool.hide = function () {
        let pos = segment.pos;
        rect.width(5);
        rect.height(5);
        rect.center(pos.x, pos.y);
        rect.stroke('none');

        if (!segment.keyframe) {
            originHide.call(tool);
        }
    };

    controls.hide();

    tool.unselect();
    tool.hide();

    // plot
    tool.plot = function () {
        let pos = segment.pos;
        let inPos = segment.inControl;
        let outPos = segment.outControl;

        rect.center(pos.x, pos.y);
        inLine.plot(pos.x, pos.y, inPos.x, inPos.y);
        inControl.center(inPos.x, inPos.y);
        outLine.plot(pos.x, pos.y, outPos.x, outPos.y);
        outControl.center(outPos.x, outPos.y);
    };

    // add move callbacks

    let startSegment = null;

    function creatToolCallbacks (type) {
        return {
            start: function () {
                tool.select();

                startSegment = segment.clone();

                if ( callbacks.start )
                    callbacks.start(tool, type);
            },
            update: function ( dx, dy ) {
                if (dx === 0 && dy === 0) {
                    return;
                }

                let d = v2(dx, dy);
                segment[type] = startSegment[type].add(d);

                if (type === 'pos') {
                    segment.inControl = startSegment.inControl.add(d);
                    segment.outControl = startSegment.outControl.add(d);
                }

                tool.plot();

                if ( callbacks.update ) {
                    callbacks.update(tool, type, dx, dy);
                }
            },
            end: function () {
                if ( callbacks.end )
                    callbacks.end(tool, type);
            }
        };
    }

    addMoveHandles(rect, creatToolCallbacks('pos'));
    addMoveHandles(inControl, creatToolCallbacks('inControl'));
    addMoveHandles(outControl, creatToolCallbacks('outControl'));

    // delete event
    tool.node.tabIndex = -1;

    function deleteCallbak (event) {
        event.stopPropagation();

        if (!segment.keyframe && callbacks.onDelete) {
            callbacks.onDelete(tool);
        }
    }

    let mouseTrap = Mousetrap(tool.node);
    mouseTrap.bind('command+backspace', deleteCallbak);
    mouseTrap.bind('del', deleteCallbak);

    return tool;
}


function CurveTool (svg, path, callbacks) {
    let tool = svg.group();
    tool.segmentTools = [];

    function dashLength() {
        let scale = _Scene.view.scale;
        if (scale < 1) {
            scale = 1;
        }
        return 3 * scale;
    }

    let selectLine = tool.path(path).fill('none').stroke({color: '#4793e2', width: 5});
    let dashLine = tool.path(path).fill('none').stroke({color: '#4793e2', width: 1}).style('stroke-dasharray', dashLength());

    tool.select = function () {
        if (callbacks.beforeSelected) {
            callbacks.beforeSelected(tool);
        }

        tool.segmentTools.forEach(function (segTool) {
            segTool.show();
        });

        selectLine.style('stroke-opacity', 1).style('cursor', 'copy');
        tool._selected = true;
    };

    tool.unselect = function () {
        tool.segmentTools.forEach(function (segTool) {
            segTool.unselect();
            segTool.hide();
        });

        selectLine.style('stroke-opacity', 0).style('cursor', 'default');
        tool._selected = false;
    };

    tool.on('mouseover', function () {
        if (!tool._selected) {
            selectLine.style('stroke-opacity', 0.5);
        }
    });

    tool.on('mouseout', function () {
        if (!tool._selected) {
            selectLine.style('stroke-opacity', 0);
        }
    });

    tool.on('mousedown', function (event) {
        event.stopPropagation();

        if (!tool._selected)
            tool.select();
        else {
            if (callbacks.addSegment) {
                callbacks.addSegment(event.offsetX, event.offsetY);
            }
        }
    });

    tool.plot = function () {
        let segmentTools = tool.segmentTools;
        if (!segmentTools[segmentTools.length - 1].segment.keyframe) {
            return;
        }

        let path = '';
        for (let i = 0, l = segmentTools.length; i < l; i++) {
            let seg = segmentTools[i].segment;
            let pos = seg.pos;

            if (i === 0) {
                path = `M ${pos.x} ${pos.y}`;
                continue;
            }

            let preSeg = segmentTools[i - 1].segment;
            let outControl = preSeg.outControl;
            let inControl = seg.inControl;

            path += ` C ${outControl.x} ${outControl.y} ${inControl.x} ${inControl.y} ${pos.x} ${pos.y}`;
        }

        selectLine.plot(path);
        dashLine.plot(path).style('stroke-dasharray', dashLength());
    };

    tool.unselect();

    return tool;
}

module.exports = {
    SegmentTool: SegmentTool,
    CurveTool: CurveTool
};
