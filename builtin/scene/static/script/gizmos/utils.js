'use strict';

const NodeUtils = Editor.require('scene://utils/node');

var GizmosUtils = {};
module.exports = GizmosUtils;

GizmosUtils.addMoveHandles = function ( gizmo, opts, callbacks ) {
    var pressx, pressy;

    if (arguments.length === 2) {
        callbacks = opts;
        opts = {};
    }

    var cursor = opts.cursor || 'default';
    var ignoreWhenHoverOther = opts.ignoreWhenHoverOther || false;

    //
    var mousemoveHandle = function(event) {
        event.stopPropagation();

        // if no scene, should not do callback
        if (typeof _Scene !== 'undefined' && !cc.director.getScene()) {
            return;
        }

        var dx = event.clientX - pressx;
        var dy = event.clientY - pressy;

        if ( callbacks.update ) {
            callbacks.update.call( gizmo, dx, dy, event );
        }
    }.bind(gizmo);

    var mouseupHandle = function(event) {
        document.removeEventListener('mousemove', mousemoveHandle);
        document.removeEventListener('mouseup', mouseupHandle);
        Editor.UI.removeDragGhost();

        // HACK: when remove dragGhost, it will select a selectable node at the end of it.
        // I found this happends when you finish dragging a gizmos in the scene panel,
        // the text will be selected in the console panel.
        window.getSelection().removeAllRanges();

        if ( callbacks.end ) {
            callbacks.end.call( gizmo, event );
        }

        event.stopPropagation();
    }.bind(gizmo);

    gizmo.on( 'mousedown', function ( event ) {
        if (ignoreWhenHoverOther) {
            var selection = Editor.Selection.curSelection('node');
            var hovering = Editor.Selection.hovering('node');
            var index = selection.indexOf(hovering);

            if (index === -1) {
                return;
            }
        }

        if ( event.which === 1 ) {
            pressx = event.clientX;
            pressy = event.clientY;

            Editor.UI.addDragGhost(cursor);
            document.addEventListener ( 'mousemove', mousemoveHandle );
            document.addEventListener ( 'mouseup', mouseupHandle );

            if ( callbacks.start ) {
                callbacks.start.call ( gizmo, event.offsetX, event.offsetY, event );
            }
        }
        event.stopPropagation();
    } );
};

GizmosUtils.snapPixel = function (p) {
    return Math.floor(p) + 0.5;
};

GizmosUtils.snapPixelWihVec2 = function (vec2) {
    vec2.x = GizmosUtils.snapPixel(vec2.x);
    vec2.y = GizmosUtils.snapPixel(vec2.y);
    return vec2;
};

GizmosUtils.getCenter = function ( nodes ) {
  
    let centerWorld = GizmosUtils.getCenterWorldPos(nodes);

    var scene = cc.director.getScene();
    var scenePos = scene.convertToNodeSpace( centerWorld );
    return scenePos;
};

GizmosUtils.getCenterWorldPos = function ( nodes ) {
    var minX = null, minY = null, maxX = null, maxY = null;
    for ( var i = 0; i < nodes.length; ++i ) {
        var v, node = nodes[i];
        var bounds = NodeUtils.getWorldOrientedBounds(node);

        for ( var j = 0; j < bounds.length; ++j ) {
            v = bounds[j];

            if ( minX === null || v.x < minX )
                minX = v.x;
            if ( maxX === null || v.x > maxX )
                maxX = v.x;

            if ( minY === null || v.y < minY )
                minY = v.y;
            if ( maxY === null || v.y > maxY )
                maxY = v.y;
        }

        v = NodeUtils.getWorldPosition3D(node);

        if ( !minX || v.x < minX )
            minX = v.x;
        if ( !maxX || v.x > maxX )
            maxX = v.x;

        if ( !minY || v.y < minY )
            minY = v.y;
        if ( !maxY || v.y > maxY )
            maxY = v.y;
    }

    var centerX = (minX + maxX) * 0.5;
    var centerY = (minY + maxY) * 0.5;

    return cc.v2(centerX,centerY);
};

GizmosUtils.getCenterWorldPos3D = function ( nodes ) {
    var minX = null, minY = null, minZ = null, maxX = null, maxY = null, maxZ = null;
    for ( var i = 0; i < nodes.length; ++i ) {
        var v, node = nodes[i];
        var bounds = NodeUtils.getWorldOrientedBounds(node);

        for ( var j = 0; j < bounds.length; ++j ) {
            v = bounds[j];

            if ( minX === null || v.x < minX )
                minX = v.x;
            if ( maxX === null || v.x > maxX )
                maxX = v.x;

            if ( minY === null || v.y < minY )
                minY = v.y;
            if ( maxY === null || v.y > maxY )
                maxY = v.y;
            
            if ( minZ === null || v.z < minZ )
                minZ = v.z;
            if ( maxZ === null || v.z > maxZ )
                maxZ = v.z;
        }

        v = NodeUtils.getWorldPosition3D(node);

        if ( minX === null || v.x < minX )
            minX = v.x;
        if ( maxX === null || v.x > maxX )
            maxX = v.x;

        if ( minY === null || v.y < minY )
            minY = v.y;
        if ( maxY === null|| v.y > maxY )
            maxY = v.y;

        if ( minZ === null || v.z < minZ )
            minZ = v.z;
        if ( maxZ === null || v.z > maxZ )
            maxZ = v.z;
    }

    var centerX = (minX + maxX) * 0.5;
    var centerY = (minY + maxY) * 0.5;
    var centerZ = (minZ + maxZ) * 0.5;

    return cc.v3(centerX, centerY, centerZ);
};



