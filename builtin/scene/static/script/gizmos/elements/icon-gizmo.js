'use strict';

const Tools = require('./tools');
const NodeUtils = Editor.require('scene://utils/node');

class IconGizmo extends Editor.Gizmo {
    init () {
        this._style = '';
    }

    url () {
        return '';
    }

    onCreateRoot () {
        this._icon = Tools.icon(this._root, this.url(), 40, 40, this.node);
    }

    visible () {
        return true;
    }

    onUpdate () {
        let style = '';
        if (this.editing || this.selecting) {
            style = 'editing';
        }
        else if (this.hovering) {
            style = 'hovering'
        }
        
        if (style !== this._style) {
            if (style === '') {
                this._icon.unfilter();
            }
            else if (style === 'editing') {
                this._icon.filter(function(add) {
                    add.componentTransfer({
                        rgb: { type: 'linear', slope: 0.2 }
                    });
                });
            }
            else if (style === 'hovering') {
                this._icon.filter(function(add) {
                    add.componentTransfer({
                        rgb: { type: 'linear', slope: 0.4 }
                    });
                });
            }
            
            this._style = style;
        }

        let s = Editor.Math.clamp(this._view.scale, 0.5, 2);

        let scenePos = NodeUtils.getScenePosition( this.node );
        let screenPos = this.sceneToPixel(scenePos);

        this._icon
            .scale(s,s)
            .translate(screenPos.x, screenPos.y)
            ;
    }

    rectHitTest (rect, testRectContains) {
        let tbox = this._icon.tbox();
        let pos = NodeUtils.getWorldPosition( this.node );

        if (testRectContains) {
            return rect.containsRect(cc.rect(pos.x - tbox.width/2, pos.y - tbox.height/2, tbox.width, tbox.height));    
        }

        return rect.intersects(cc.rect(pos.x - tbox.width/2, pos.y - tbox.height/2, tbox.width, tbox.height));    
    }
}

module.exports = IconGizmo;
