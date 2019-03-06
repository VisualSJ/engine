'use strict';

const JointGizmo = require('./joint-gizmo');
const NodeUtils = Editor.require('scene://utils/node');

class RevoluteJointGizmo extends JointGizmo {
    createAnchorGroup () {
        let root = this._root;
        let group = root.group();

        group.path()
            .plot( `
                M -6 -8 A 10 10, 0, 1, 0, 6 -8 L 6 -8
                M -6 -2 L -6 -8 L -12 -8
                M 6 -2 L 6 -8 L 12 -8
            `)
            .fill( 'none' )
            ;

        group.circle(5)
            .stroke('none')
            .center(0, 0)
            ;

        return group;
    }

    createToolGroup () {
        let group = this._root.group();

        group.style( 'pointer-events', 'none' );

        let upperLine = group.line()
            .stroke({width:2, color: '#4793e2'})
            ;
        let lowerLine = group.line()
            .stroke({width:2, color: '#4793e2'})
            ;

        let upperPoint = group.circle(5)
            .fill({color: '#4793e2'})
            ;
        let lowerPoint = group.circle(5)
            .fill({color: '#4793e2'})
            ;

        let arc = group.path()
            .fill({color: '#4793e2', opacity: 0.5})
            ;

        let lowerLength = 20;
        let upperLength = 30;
        let arcLength = 15;

        group.plot = (args) => {

            if (this.target.enableLimit) {
                let lowerAngle = args.lowerAngle * Math.PI / 180;
                let upperAngle = args.upperAngle * Math.PI / 180;

                let ax = args.anchor.x;
                let ay = args.anchor.y;

                let lx = ax + Math.cos(lowerAngle)*lowerLength;
                let ly = ay + Math.sin(lowerAngle)*lowerLength;

                let ux = ax + Math.cos(upperAngle)*upperLength;
                let uy = ay + Math.sin(upperAngle)*upperLength;

                lowerLine.plot(lx, ly, ax, ay);
                upperLine.plot(ux, uy, ax, ay);

                lowerPoint.center(lx, ly);
                upperPoint.center(ux, uy);

                let hlx = ax + Math.cos(lowerAngle)*arcLength;
                let hly = ay + Math.sin(lowerAngle)*arcLength;

                let hux = ax + Math.cos(upperAngle)*arcLength;
                let huy = ay + Math.sin(upperAngle)*arcLength;

                let large = ((args.upperAngle - args.lowerAngle) % 360) > 180 ? 1 : 0;

                arc.plot(`
                    M ${hlx} ${hly} A ${arcLength} ${arcLength} 0 ${large} 1 ${hux} ${huy}
                    L ${ax} ${ay}
                    Z
                `);

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
            let parentWorldRotation = NodeUtils.getWorldRotation(this.node.parent);
            args.lowerAngle = parentWorldRotation + this.target.lowerAngle;
            args.upperAngle = parentWorldRotation + this.target.upperAngle;
        }

        return args;
    }
}

module.exports = RevoluteJointGizmo;
