'use strict';

const NodeUtils = Editor.require('scene://utils/node');

let _tempMatrix = cc.vmath.mat4.create();

class NodeGizmo extends Editor.Gizmo {
    init () {
        this._currentName = this.target.name;
    }

    onCreateRoot () {
        let root = this._root;
        root.bounds = root.polygon();
        root.compGroup = root.group();
        root.compGroup.compBounds = [];

        let labelBG = root.rect({
            fill: 'none',
        });
        let label = root.text(this._currentName);
        label.font({
            family: 'Helvetica',
            size: '12px',
            anchor: 'left',
            weight: 'bold',
        });

        let labelBBox = label.bbox();
        labelBG.width(labelBBox.width+10);
        labelBG.height(labelBBox.height);

        root.labelBG = labelBG;
        root.label = label;

        let errorInfo = root.errorInfo = root.group();
        errorInfo.l1 = errorInfo.line( 0, 0, 0, 0 ).stroke( { width: 1, color: '#f00' } );
        errorInfo.l2 = errorInfo.line( 0, 0, 0, 0 ).stroke( { width: 1, color: '#f00' } );
    }

    visible () {
        // TODO: #1076
        let sizeNegative = false; //this.target.width < 0 || this.target.height < 0;
        return this.selecting || this.editing || this.hovering || sizeNegative;
    }

    onUpdate () {
        let editing  = this.selecting || this.editing;
        let hovering = this.hovering;

        // TODO: #1076
        let sizeNegative = false; //this.target.width < 0 || this.target.height < 0;

        let node = this.target;
        let bounds = NodeUtils.getWorldOrientedBounds(node);
        let v1 = this.worldToPixel(bounds[0]);
        let v2 = this.worldToPixel(bounds[1]);
        let v3 = this.worldToPixel(bounds[2]);
        let v4 = this.worldToPixel(bounds[3]);

        // draw error info
        if (sizeNegative) {
            let errorInfo = this._root.errorInfo.show();
            errorInfo.l1.plot(v1.x, v1.y, v3.x, v3.y);
            errorInfo.l2.plot(v4.x, v4.y, v2.x, v2.y);
        }
        else {
            this._root.errorInfo.hide();
        }

        if (editing || hovering) {
            // draw node bounds
            this._root.bounds.show();

            this._root.bounds.plot([
                [v1.x, v1.y],
                [v2.x, v2.y],
                [v3.x, v3.y],
                [v4.x, v4.y]
            ])
            .fill('none');

            // draw component local bounds
            let comps = node._components.filter(comp => {
                return !!comp._getLocalBounds;
            });

            let compGroup = this._root.compGroup;
            let compBounds = compGroup.compBounds;

            if (compBounds.length > comps.length) {
                for (let i = comps.length, l = compBounds.length; i < l; i++) {
                    compBounds[i].remove();
                }
                compBounds.length = comps.length;
            }
            else if (compBounds.length < comps.length) {
                for (let i = compBounds.length, l = comps.length; i < l; i++) {
                    let polygon = compGroup.polygon();
                    compBounds.push(polygon);
                }
            }

            compBounds.forEach((bounds, index) => {
                let comp = comps[index];
                let rect = cc.rect();
                comp._getLocalBounds(rect);

                node.getWorldMatrix(_tempMatrix);
                let obb = NodeUtils.getObbFromRect(_tempMatrix, rect);
                obb[0] = this.worldToPixel(obb[0]);
                obb[1] = this.worldToPixel(obb[1]);
                obb[2] = this.worldToPixel(obb[2]);
                obb[3] = this.worldToPixel(obb[3]);

                bounds.plot(obb)
                .fill('none');

                if ( editing ) {
                    bounds.stroke({color: '#09f', width: 1});
                }
                else if (hovering) {
                    bounds.stroke({color: '#999', width: 1});
                }
            });


            // update label and labelBG
            let quat = new cc.Quat(0, 0, 0, 1);
            let rotation = -node.getWorldRotation(quat).getYaw();
            let rad = Editor.Math.deg2rad(rotation);
            this._root.label
                .translate(
                    v1.x + 19 * Math.sin(rad) + 5 * Math.cos(rad),
                    v1.y - 19 * Math.cos(rad) + 5 * Math.sin(rad)
                )
                .rotate(rotation, 0.0, 0.0)
                ;
            this._root.labelBG
                .translate(
                    v1.x + 14 * Math.sin(rad),
                    v1.y - 14 * Math.cos(rad)
                )
                .rotate(rotation, 0.0, 0.0)
                ;
            if ( this._currentName !== node.name ) {
                this._currentName = node.name;
                this._root.label.text(this._currentName);
                let labelBBox = this._root.label.bbox();
                this._root.labelBG.width(labelBBox.width+10);
                this._root.labelBG.height(labelBBox.height);
            }

            if ( editing ) {
                this._root.bounds.stroke({color: '#09f', width: 1});

                // this._root.label.fill('#fff');
                // this._root.labelBG.fill('#09f');
                // this._root.labelBG.stroke({color: '#09f', width: 1});
                this._root.label.fill('none');
                this._root.labelBG.fill('none');
                this._root.labelBG.stroke({color: 'none', width: 1});
            }
            else if ( hovering ) {
                this._root.bounds.stroke({color: '#999', width: 1});
                this._root.label.fill('#333');
                this._root.labelBG.fill('#999');
                this._root.labelBG.stroke({color: '#999', width: 1});
            }
        }
        else {
            this._root.bounds.hide();
        }
    }
}

module.exports = NodeGizmo;
