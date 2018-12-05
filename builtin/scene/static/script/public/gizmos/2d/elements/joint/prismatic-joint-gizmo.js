'use strict';

const JointGizmo = require('./joint-gizmo');

class PrismaticJointGizmo extends JointGizmo {
    createAnchorGroup () {
        let root = this._root;
        let group = root.group();

        group.path()
            .plot( `
                M -8 -8 L 0 -7 L 8 -8 L 7 0 L 8 8 L 0 7 L -8 8 L -7 0
                Z
            `)
            .fill( 'none' )
            ;

        group.rect(5, 5)
            .stroke('none')
            .center(0, 0)
            ;

        return group;
    }

    createToolGroup () {
        let group = this._root.group();
        let midLine = group.line()
            .stroke({width:2, color: '#4793e2', opacity: 0.5})
            ;

        let lowerLine = group.line()
            .stroke({width:2, color: '#4793e2', opacity: 0.5})
            ;

        let upperLine = group.line()
            .stroke({width:2, color: '#4793e2', opacity: 0.5})
            ;

        group.plot = (args) => {
            if (this.target.enableLimit) {
                midLine.plot(args.lowerPos.x, args.lowerPos.y, args.upperPos.x, args.upperPos.y);

                let vec = args.upperPos.sub(args.lowerPos).normalizeSelf();
                let temp = vec.y;
                vec.y = -vec.x;
                vec.x = temp;

                let lowerVec = vec.mul(10);
                lowerLine.plot(args.lowerPos.x + lowerVec.x, args.lowerPos.y + lowerVec.y, args.lowerPos.x - lowerVec.x, args.lowerPos.y - lowerVec.y);

                let upperVec = vec.mul(20);
                upperLine.plot(args.upperPos.x + upperVec.x, args.upperPos.y + upperVec.y, args.upperPos.x - upperVec.x, args.upperPos.y - upperVec.y);

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

        if (this.target.enableLimit) {
            // distance
            let mat = cc.vmath.mat4.create();
            this.node.getWorldMatrix(mat);
            mat.m12 = mat.m13 = 0;
            
            let lower = cc.v2(this.target.lowerLimit, 0),
                upper = cc.v2(this.target.upperLimit, 0);
            cc.vmath.vec2.transformMat4(lower, lower, mat);
            let lmag = lower.mag();
            cc.vmath.vec2.transformMat4(upper, upper, mat);
            let umag = upper.mag();

            let localAxisA = this.target.localAxisA.normalize();
            localAxisA.y *= -1;

            let lowerPos = localAxisA.mul(lmag);
            let upperPos = localAxisA.mul(umag);

            args.lowerPos = args.anchor.add(lowerPos);
            args.upperPos = args.anchor.add(upperPos);
        }

        return args;
    }
}

module.exports = PrismaticJointGizmo;
