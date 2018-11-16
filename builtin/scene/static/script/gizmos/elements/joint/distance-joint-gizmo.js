'use strict';

const Tools = require('../tools');
const JointGizmo = require('./joint-gizmo');

class DistanceJointGizmo extends JointGizmo {
    createAnchorGroup () {
        let root = this._root;
        let group = root.group();

        group.circle(15)
            .fill('none')
            .center(0, 0)
            ;

        group.circle(5)
            .stroke('none')
            .center(0, 0)
            ;

        return group;
    }

    createToolGroup () {
        let group = this._root.group();
        let bgLine = group.line()
            .stroke({width:4, color: '#4793e2', opacity: 0.5})
            ;

        let fgLine = group.line()
            .stroke({width:3, color: '#cccc00', opacity: 0.5})
            ;

        let point = group.circle(6)
            .fill({color: '#cccc00', opacity: 0.5})
            ;

        group.plot = (args) => {
            if (args.distance) {
                bgLine.plot(args.anchor.x, args.anchor.y, args.connectedAnchor.x, args.connectedAnchor.y);
                
                fgLine.plot(args.anchor.x, args.anchor.y, args.distance.x, args.distance.y);
                fgLine.style('stroke-dasharray', Tools.dashLength());
                
                point.center(args.distance.x, args.distance.y);

                group.show();
            }
            else {
                group.hide();
            }
        };

        return group;
    }

    createArgs () {
        let args = JointGizmo.prototype.createArgs.call(this);

        if (this.target.connectedBody) {
            // distance
            let mat = cc.vmath.mat4.create();
            this.node.getWorldMatrix(mat);
            mat.m12 = mat.m13 = 0;
            
            let d = cc.v2(this.target.distance, 0);
            cc.vmath.vec2.transformMat4(d, d, mat);
            let dmag = d.mag();
            let distance = cc.v2(args.connectedAnchor.x - args.anchor.x, args.connectedAnchor.y - args.anchor.y);
            args.distance = distance.normalizeSelf().mulSelf(dmag).addSelf(args.anchor);
        }

        return args;
    }
}

module.exports = DistanceJointGizmo;
