'use strict';

const JointGizmo = require('./joint-gizmo');
const NodeUtils = Editor.require('scene://utils/node');

class MotorJointGizmo extends JointGizmo {
    createAnchorGroup () {
        let root = this._root;
        let group = root.group();

        group.path()
            .plot( `
                M -4 4 L -10 0 L -4 -4
                L 0 -10 L 4 -4
                L 10 0 L 4 4
                L 0 10
                Z
            `)
            .fill( 'none' )
            ;

        group.circle(5)
            .stroke('none')
            .center(0, 0)
            ;

        return group;
    }

    // onCreateMoveCallbacks () {
    //     let pressx, pressy;
    //     return {
    //         start: (x, y) => {
    //             pressx = x;
    //             pressy = y;
    //         },

    //         update: (dx, dy, event, type) => {
    //             let x = pressx + dx;
    //             let y = pressy + dy;

    //             if (type === JointGizmo.ToolType.connectedAnchor) {
    //                 let anchor = this.target.connectedBody.node.convertToNodeSpaceAR( cc.v2(x, y) );
    //                 this.target.linearOffset = cc.v2(-anchor.x, -anchor.y);
    //             }
    //         }
    //     };
    // }

    createToolGroup () {
        let group = this._root.group();

        let line = group.line()
            .stroke({width:2, color: '#4793e2', opacity: 0.5})
            ;

        let upperLine = group.line()
            .stroke({width:3, color: '#4793e2'})
            ;

        group.plot = (args) => {
            if (args.offset) {
                line.plot(args.anchor.x, args.anchor.y, args.offset.x, args.offset.y);

                let vec = args.offset.sub(args.anchor).normalizeSelf();
                let temp = vec.y;
                vec.y = -vec.x;
                vec.x = temp;

                vec.rotateSelf(args.angularOffset * Math.PI / 180);

                let upperVec = vec.mul(20);
                upperLine.plot(args.offset.x + upperVec.x, args.offset.y + upperVec.y, args.offset.x - upperVec.x, args.offset.y - upperVec.y);

                group.show();
            }
            else {
                group.hide();
            }
        };

        return group;
    }

    createArgs () {
        let args = {};

        let node = this.node;
        let anchor = node.convertToWorldSpaceAR(this.target.anchor);
        args.anchor = this.worldToPixel( anchor );
        args.pos = this.worldToPixel( node.convertToWorldSpaceAR(cc.Vec2.ZERO) );

        if (this.target.connectedBody) {
            let connectedNode = this.target.connectedBody.node;
            args.connectedAnchor = args.connectedPos = this.worldToPixel( connectedNode.convertToWorldSpaceAR(cc.Vec2.ZERO) );

            let worldRotation = NodeUtils.getWorldRotation(this.node);
            args.angularOffset = worldRotation + this.target.angularOffset;

            args.offset = this.worldToPixel( node.convertToWorldSpaceAR( cc.v2(this.target.linearOffset.x, this.target.linearOffset.y) ) );
        }

        return args;
    }
}

module.exports = MotorJointGizmo;
