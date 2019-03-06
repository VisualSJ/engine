'use strict';

const JointGizmo = require('./joint-gizmo');

class WheelJointGizmo extends JointGizmo {
    createAnchorGroup () {
        let root = this._root;
        let group = root.group();

        group.path()
            .plot( `
                M -8 8 L 8 8 L 8 -8 L -8 -8 Z
            `)
            .fill( 'none' )
            ;

        group.circle(10)
            .stroke('none')
            .center(0, 0)
            ;

        return group;
    }
}

module.exports = WheelJointGizmo;
