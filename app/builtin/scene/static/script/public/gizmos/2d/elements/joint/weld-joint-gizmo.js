'use strict';

const JointGizmo = require('./joint-gizmo');

class WeldJointGizmo extends JointGizmo {
    createAnchorGroup () {
        let root = this._root;
        let group = root.group();

        group.path()
            .plot( `
                M 0 -8 L 6 0 L 0 8 L -6 0
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
}

module.exports = WeldJointGizmo;
