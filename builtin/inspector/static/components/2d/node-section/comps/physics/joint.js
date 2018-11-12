'use strict';

const { readTemplate, T } = require('../../../../../utils');

exports.template = readTemplate(
    '2d',
    './node-section/comps/physics/joint.html'
);

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    T,

    prevRigidBody() {
        // todo
        const { connectedBody } = this.target;
        const { index } = this.$parent;

        const customEvent = new CustomEvent('property-changed', {
            bubbles: true,
            detail: {
                dump: {
                    type: 'choose-rigid-body',
                    path: connectedBody.path,
                    value: {
                        index,
                        position: 'prev'
                    }
                }
            }
        });

        this.$el.dispatchEvent(customEvent);
    },

    nextRigidBody() {
        // todo
        const { connectedBody } = this.target;
        const { index } = this.$parent;

        const customEvent = new CustomEvent('property-changed', {
            bubbles: true,
            detail: {
                dump: {
                    type: 'choose-rigid-body',
                    path: connectedBody.path,
                    value: {
                        index,
                        position: 'next'
                    }
                }
            }
        });

        this.$el.dispatchEvent(customEvent);
    }
};
