
'use strict';

const NodeUtils = Editor.require('scene://utils/node');
class ColliderGizmo extends Editor.Gizmo {
    hide () {
        Editor.Gizmo.prototype.hide.call(this);
        this.target.editing = false;
    }

    visible () {
        return true;
    }

    rectHitTest (rect, testRectContains) {
        //锁定节点的时候没有root
        if(!this._root) return false;

        let tbox = this._root.tbox();
        let pos = NodeUtils.getWorldPosition( this.node );

        if (testRectContains) {
            return rect.containsRect(cc.rect(pos.x - tbox.width/2, pos.y - tbox.height/2, tbox.width, tbox.height));    
        }

        return false;
    }

    createMoveCallbacks (type) {
        let callbacks = Editor.Gizmo.prototype.createMoveCallbacks.call(this, type);
        let root = this._root;
        let self = this;
        return {
            start: function () {
                if (!self.target.editing) return;
                callbacks.start.apply(self, arguments);
            },
            update: function () {
                if (!self.target.editing) return;
                callbacks.update.apply(self, arguments);
            },
            end: function () {
                if (!self.target.editing) return;
                callbacks.end.apply(self, arguments);
            }
        };
    }

    dirty () {
        var dirty = Editor.Gizmo.prototype.dirty.call(this);

        if (this.target.editing) {
            if (!this._targetEditing) {
                this._targetEditing = true;
                this.enterEditing();
                dirty = true;
            }
        }
        else {
            if (this._targetEditing) {
                this._targetEditing = false;
                this.leaveEditing();
                dirty = true;
            }
        }

        return dirty;
    }
}

module.exports = ColliderGizmo;
