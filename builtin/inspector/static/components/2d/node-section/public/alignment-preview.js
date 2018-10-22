'use strict';

const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/alignment-preview.html');

exports.props = ['target'];

exports.data = function() {
    return {
        cssContainer: {
            margin: '8px 9px',
            backgroundColor: '#555556',
            border: '1px solid #2a2a2a',
            boxShadow: '0px 0px 4px #333',
            boxSizing: 'content-box',
            position: 'relative',
            width: '120px',
            height: '120px'
        },

        cssContainerSize: {
            width: '120px',
            height: '120px',
            visibility: 'hidden'
        },

        cssWidget: {
            width: '80px',
            height: '80px',
            margin: '20px 20px 20px 20px',
            backgroundColor: '#7d7d7d',
            border: '1px solid #2a2a2a',
            borderRadius: '5px',
            boxSizing: 'border-box',
            position: 'absolute',
            left: '0',
            top: '0'
        },

        cssLine: {
            border: 'dashed 0px #ccc',
            width: '0',
            height: '0',
            position: 'absolute'
        },

        cssLineH: {
            width: '120px',
            borderTopWidth: '1px'
        },

        cssLineV: {
            height: '120px',
            borderLeftWidth: '1px'
        },

        cssTopLine: {
            top: '15px',
            left: '0'
        },

        cssLeftLine: {
            left: '15px',
            top: '0'
        },

        cssRightLine: {
            right: '15px',
            top: '0'
        },

        cssBottomLine: {
            bottom: '15px',
            left: '0'
        },

        cssHCLine: {
            top: '0',
            left: '50%',
            zIndex: '1'
        },

        cssVCLine: {
            top: '50%',
            left: '0',
            zIndex: '1'
        }
    };
};

exports.methods = {
    T,

    alignStyle() {
        let top = this.target.isAlignTop.value;
        let left = this.target.isAlignLeft.value;
        let right = this.target.isAlignRight.value;
        let bottom = this.target.isAlignBottom.value;

        const MinMargin = 15;
        const WidgetSize = 60;
        const ContainerSize = 120;
        const FarMargin = ContainerSize - MinMargin - WidgetSize;
        const FreeMargin = (ContainerSize - WidgetSize) / 2;

        function getMargin(isAlign, isOppositeAlign) {
            if (isAlign) {
                return MinMargin;
            }
            return isOppositeAlign ? FarMargin : FreeMargin;
        }

        const marginTop = getMargin(top, bottom);
        const marginBottom = getMargin(bottom, top);
        const marginLeft = getMargin(left, right);
        const marginRight = getMargin(right, left);
        const height = ContainerSize - marginTop - marginBottom;
        const width = ContainerSize - marginLeft - marginRight;

        return {
            width: `${width}px`,
            height: `${height}px`,
            marginRight: `${marginRight}px`,
            marginLeft: `${marginLeft}px`,
            marginTop: `${marginTop}px`,
            marginBottom: `${marginBottom}px`
        };
    }
};
