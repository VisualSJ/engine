
const Chroma = require('chroma-js');
const Tools = require('../tools');
const NodeUtils = Editor.require('scene://utils/node');

let ToolType = {
    anchor: 0,
    connectedAnchor: 1
};

class JointGizmo extends Editor.Gizmo {
    visible () {
        return true;
    }

    rectHitTest (rect, testRectContains) {
        let tbox = this._root.tbox();
        let pos = NodeUtils.getWorldPosition( this.node );

        if (testRectContains) {
            return rect.containsRect(cc.rect(pos.x - tbox.width/2, pos.y - tbox.height/2, tbox.width, tbox.height));    
        }

        return false;
    }

    onCreateMoveCallbacks () {
        let pressx, pressy;
        return {
            start: (x, y) => {
                pressx = x;
                pressy = y;
            },

            update: (dx, dy, event, type) => {
                let x = pressx + dx;
                let y = pressy + dy;

                if (type === ToolType.anchor) {
                    let anchor = this.node.convertToNodeSpace( cc.v2(x, y) );
                    this.adjustValue(anchor);
                    this.target.anchor = anchor;
                }
                else if (type === ToolType.connectedAnchor) {
                    let anchor = this.target.connectedBody.node.convertToNodeSpace( cc.v2(x, y) );
                    this.adjustValue(anchor);
                    this.target.connectedAnchor = anchor;
                }
            }
        };
    }

    onCreateRoot () {
        let root = this._root;

        let createAnchorGroup = (type) => {
            let color;
            if (type === JointGizmo.ToolType.anchor) {
                color = '#4793e2';
            }
            else if (type === JointGizmo.ToolType.connectedAnchor) {
                color = '#cccc00';
            }

            // line
            let line = root.line(0, 0, 1, 1)
                .stroke( { width: 2, color: color } )
                ;

            // group
            let group = this.createAnchorGroup();

            group.style('pointer-events', 'bounding-box')
                .style('cursor', 'move')
                .stroke( { width: 2, color: color } )
                .fill( {color: color} )
                ;

            group.on( 'mouseover', function () {
                var lightColor = Chroma(color).brighter().hex();
                group.stroke( { color: lightColor } );
                line.stroke( { color: lightColor } );
            } );

            group.on( 'mouseout', function () {
                group.stroke( { color: color } );
                line.stroke( { color: color } );
            } );

            let originPlot = group.plot;
            group.plot = (args) => {
                if (originPlot) originPlot.apply(group, arguments);

                let x, y, ax, ay;

                if (type === ToolType.anchor) {
                    x = args.pos.x;
                    y = args.pos.y;
                    ax = args.anchor.x;
                    ay = args.anchor.y;
                }
                else {
                    if (!args.connectedPos) return;

                    x = args.connectedPos.x;
                    y = args.connectedPos.y;
                    ax = args.connectedAnchor.x;
                    ay = args.connectedAnchor.y;
                }

                group.move(ax, ay);

                if (this.editing || this.hovering) {
                    line.plot(x, y, ax, ay);
                    line.style('stroke-dasharray', Tools.dashLength());
                    line.show();
                }
                else {
                    line.hide();
                }
            };

            this.registerMoveSvg( group, type );
            return group;
        };

        root.anchorGroup = createAnchorGroup(ToolType.anchor);
        root.connectedAnchorGroup = createAnchorGroup(ToolType.connectedAnchor);

        if (this.createToolGroup) {
            root.toolGroup = this.createToolGroup();
        }
    }

    createArgs () {
        let args = {};

        let node = this.node;
        let anchor = node.convertToWorldSpaceAR(this.target.anchor);
        args.anchor = this.worldToPixel( anchor );
        args.pos = this.worldToPixel( node.convertToWorldSpaceAR(cc.Vec2.ZERO) );

        if (this.target.connectedBody) {
            let connectedNode = this.target.connectedBody.node;
            let connectedAnchor = connectedNode.convertToWorldSpaceAR(this.target.connectedAnchor);
            args.connectedAnchor = this.worldToPixel( connectedAnchor );
            args.connectedPos = this.worldToPixel( connectedNode.convertToWorldSpaceAR(cc.Vec2.ZERO) );
        }

        return args;
    }

    dirty () {
        let dirty = this._viewDirty() || this._nodeDirty() || this._dirty;

        if (this.target.connectedBody) {
            dirty = dirty || this._nodeDirty(this.target.connectedBody.node);
        }

        return dirty;
    }

    onUpdate () {
        let root = this._root;
        let args = this.createArgs();

        if (this.target.connectedBody) {
            root.connectedAnchorGroup.show();
        }
        else {
            root.connectedAnchorGroup.hide();
        }

        root.anchorGroup.plot(args);
        root.connectedAnchorGroup.plot(args);

        if (root.toolGroup) {
            root.toolGroup.plot(args);
        }
    }
}

JointGizmo.ToolType = ToolType;

module.exports = JointGizmo;
