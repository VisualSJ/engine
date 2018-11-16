'use strict';

const Chroma = require('chroma-js');

const addMoveHandles = require('../utils').addMoveHandles;

var Tools = {};
module.exports = Tools;

Tools.scaleSlider = function ( svg, size, color, callbacks ) {
    var group = svg.group();
    var line = group.line( 0, 0, size, 0 )
                    .stroke( { width: 1, color: color } )
                    ;
    var rect = group.polygon ([ [size, 5], [size, -5], [size+10, -5], [size+10, 5] ])
                    .fill( { color: color } )
                    .stroke( { width: 1, color: color } )
                    ;
    var dragging = false;

    group.style( 'pointer-events', 'bounding-box' );

    group.resize = function ( size ) {
        line.plot( 0, 0, size, 0 );
        rect.plot([ [size, 5], [size, -5], [size+10, -5], [size+10, 5] ]);
    };

    
    group.on( 'mouseover', function ( event ) {
        var lightColor = Chroma(color).brighter().hex();
        line.stroke( { color: lightColor } );
        rect.fill( { color: lightColor } )
            .stroke( { width: 1, color: lightColor } )
            ;
    } );

    group.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            line.stroke( { color: color } );
            rect.fill( { color: color } )
                .stroke( { width: 1, color: color } )
                ;
        }
    } );

    addMoveHandles( group, {
        start: function (x, y, event) {
            dragging = true;
            line.stroke( { color: '#ff0' } );
            rect.fill( { color: '#ff0' } )
                .stroke( { width: 1, color: '#ff0' } )
                ;

            if ( callbacks.start )
                callbacks.start.call(group, x, y, event);
        },

        update: function ( dx, dy, event ) {
            if ( callbacks.update )
                callbacks.update.call(group, dx, dy, event);
        },

        end: function (event) {
            dragging = false;
            line.stroke( { color: color } );
            rect.fill( { color: color } )
                .stroke( { width: 1, color: color } )
                ;

            if ( callbacks.end )
                callbacks.end.call(group, event);
        }
    }  );

    return group;
};

Tools.freemoveTool = function ( svg, size, color, callbacks ) {
    // move rect
    var dragging = false;
    var circle = svg.circle( size, size )
                    .move( -size * 0.5, -size * 0.5 )
                    .fill( { color: color, opacity: 0.6 } )
                    .stroke( { width: 2, color: color } )
                    ;
    circle.on( 'mouseover', function ( event ) {
        var lightColor = Chroma(color).brighter().hex();
        this.fill( { color: lightColor } )
            .stroke( { color: lightColor } )
            ;
    } );
    circle.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            this.fill( { color: color } )
                .stroke( { color: color } )
                ;
        }
    } );
    addMoveHandles( circle, {
        start: function ( x, y, event ) {
            dragging = true;
            this.fill( { color: '#cc5' } )
                .stroke( { color: '#cc5' } )
                ;

            if ( callbacks.start )
                callbacks.start.call(circle, x, y, event);
        },

        update: function ( dx, dy, event ) {
            if ( callbacks.update )
                callbacks.update.call(circle, dx, dy, event);
        },

        end: function (event) {
            dragging = false;
            this.fill( { color: color } )
                .stroke( { color: color } )
                ;

            if ( callbacks.end )
                callbacks.end.call(circle, event);
        }
    } );

    return circle;
};

Tools.arrowTool = function ( svg, size, color, callbacks ) {
    var group = svg.group();
    var line = group.line( 0, 0, size, 0 )
                    .stroke( { width: 1, color: color } )
                    ;
    var arrow = group.polygon ([ [size, 5], [size, -5], [size+15, 0] ])
                     .fill( { color: color } )
                     .stroke( { width: 1, color: color } )
                     ;
    var dragging = false;

    group.style( 'pointer-events', 'bounding-box' );

    
    group.on( 'mouseover', function ( event ) {
        var lightColor = Chroma(color).brighter().hex();
        line.stroke( { color: lightColor } );
        arrow.fill( { color: lightColor } )
             .stroke( { width: 1, color: lightColor } )
             ;
    } );

    group.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            line.stroke( { color: color } );
            arrow.fill( { color: color } )
                 .stroke( { width: 1, color: color } )
                 ;
        }
    } );

    addMoveHandles( group, {
        start: function (x, y, event) {
            dragging = true;
            line.stroke( { color: '#ff0' } );
            arrow.fill( { color: '#ff0' } )
                 .stroke( { width: 1, color: '#ff0' } )
                 ;

            if ( callbacks.start )
                callbacks.start.call(group, x, y, event);
        },

        update: function ( dx, dy, event ) {
            if ( callbacks.update )
                callbacks.update.call(group, dx, dy, event );
        },

        end: function (event) {
            dragging = false;
            line.stroke( { color: color } );
            arrow.fill( { color: color } )
                 .stroke( { width: 1, color: color } )
                 ;

            if ( callbacks.end )
                callbacks.end.call(group, event);
        }
    }  );

    return group;
};

Tools.positionTool = function ( svg, callbacks ) {
    var group = svg.group();
    var xarrow, yarrow, moveRect;

    group.position = cc.v2(0,0);
    group.rotation = 0.0;

    // x-arrow
    xarrow = Tools.arrowTool( svg, 80, '#f00', {
        start: function (x, y, event) {
            if ( callbacks.start )
                callbacks.start.call(group, x, y, event);
        },
        update: function ( dx, dy, event ) {
            var radius = Editor.Math.deg2rad(group.rotation);
            var dirx = Math.cos(radius);
            var diry = Math.sin(radius);

            var length = Math.sqrt(dx * dx + dy * dy);
            var theta = Math.atan2( diry, dirx ) - Math.atan2( dy, dx );
            length = length * Math.cos(theta);

            if ( callbacks.update ) {
                callbacks.update.call(group, dirx * length, diry * length, event );
            }
        },
        end: function (event) {
            if ( callbacks.end )
                callbacks.end.call(group, event);
        },
    } );
    xarrow.translate( 20, 0 );
    group.add(xarrow);

    // y-arrow
    yarrow = Tools.arrowTool( svg, 80, '#5c5', {
        start: function (x, y, event) {
            if ( callbacks.start )
                callbacks.start.call(group, x, y, event);
        },
        update: function ( dx, dy, event ) {
            var radius = Editor.Math.deg2rad(group.rotation + 90.0);
            var dirx = Math.cos(radius);
            var diry = Math.sin(radius);

            var length = Math.sqrt(dx * dx + dy * dy);
            var theta = Math.atan2( diry, dirx ) - Math.atan2( dy, dx );
            length = length * Math.cos(theta);

            if ( callbacks.update ) {
                callbacks.update.call(group, dirx * length, diry * length, event );
            }
        },
        end: function (event) {
            if ( callbacks.end )
                callbacks.end.call(group, event);
        },
    } );
    yarrow.translate( 0, -20 );
    yarrow.rotate(-90, 0, 0 );
    group.add(yarrow);

    // move rect
    var color = '#05f';
    var dragging = false;
    moveRect = group.rect( 20, 20 )
                        .move( 0, -20 )
                        .fill( { color: color, opacity: 0.4 } )
                        .stroke( { width: 1, color: color } )
                        ;
    moveRect.on( 'mouseover', function ( event ) {
        var lightColor = Chroma(color).brighter().hex();
        this.fill( { color: lightColor } )
            .stroke( { color: lightColor } )
            ;
    } );
    moveRect.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            this.fill( { color: color } )
                .stroke( { color: color } )
                ;
        }
    } );
    addMoveHandles( moveRect, {
        start: function (x, y, event) {
            dragging = true;
            this.fill( { color: '#cc5' } )
                .stroke( { color: '#cc5' } )
                ;

            if ( callbacks.start )
                callbacks.start.call(group, x, y, event);
        },

        update: function ( dx, dy, event ) {
            if ( callbacks.update )
                callbacks.update.call(group, dx, dy, event );
        },

        end: function (event) {
            dragging = false;
            this.fill( { color: color } )
                .stroke( { color: color } )
                ;

            if ( callbacks.end )
                callbacks.end.call(group, event);
        }
    } );

    return group;
};

Tools.rotationTool = function ( svg, callbacks ) {
    var group = svg.group();
    var circle, line, arrow, arc, txtDegree;
    var dragging = false;
    var color = '#f00';

    group.position = new cc.Vec2(0,0);
    group.rotation = 0.0;

    // circle
    circle = group.path('M50,-10 A50,50, 0 1,0 50,10')
                  .fill( 'none' )
                  .stroke( { width: 2, color: color } )
                  ;

    arc = group.path()
               .fill( {color: color, opacity: 0.4} )
               .stroke( { width: 1, color: color } )
               ;
    arc.hide();

    // arrow
    var size = 50;
    line = group.line( 0, 0, size, 0 )
                .stroke( { width: 1, color: color } )
                ;
    arrow = group.polygon ([ [size, 5], [size, -5], [size+15, 0] ])
                 .fill( { color: color } )
                 .stroke( { width: 1, color: color } )
                 ;

    //
    txtDegree = group.text('0')
                     .plain('')
                     .fill( { color: 'white' } )
                     .font( {
                         anchor: 'middle',
                     })
                     .hide()
                     .translate( 30, 0 )
                     ;

    group.style( 'pointer-events', 'visibleFill' );
    
    group.on( 'mouseover', function ( event ) {
        var lightColor = Chroma(color).brighter().hex();
        circle.fill({ color: lightColor, opacity: 0.1 } )
              .stroke( { color: lightColor } )
              ;
        line.stroke( { color: lightColor } );
        arrow.fill( { color: lightColor } )
             .stroke( { width: 1, color: lightColor } )
             ;
    } );
    group.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            circle.fill( { color: 'none' } )
                  .stroke( { color: color } )
                  ;
            line.stroke( { color: color } );
            arrow.fill( { color: color } )
                 .stroke( { width: 1, color: color } )
                 ;
        }
    } );

    var x1, y1;
    addMoveHandles( group, {
        start: function ( x, y, event ) {
            dragging = true;
            circle.fill( { color: 'none' } )
                  .stroke( { color: '#cc5' } )
                  ;
            line.stroke( { color: '#cc5' } );
            arrow.fill( { color: '#cc5' } )
                 .stroke( { width: 1, color: '#cc5' } )
                 ;

            arc.show();
            arc.plot( 'M40,0 A40,40, 0 0,1 40,0 L0,0 Z' );

            txtDegree.plain('0\xB0');
            txtDegree.rotate(0, -30, 0);
            txtDegree.show();

            x1 = x - group.position.x;
            y1 = y - group.position.y;

            if ( callbacks.start )
                callbacks.start.call(group, x, y, event);
        },

        update: function ( dx, dy, event ) {
            var v1 = new cc.Vec2( x1,    y1    );
            var v2 = new cc.Vec2( x1+dx, y1+dy );

            var magSqr1 = v1.magSqr();
            var magSqr2 = v2.magSqr();

            //
            if ( magSqr1 > 0 && magSqr2 > 0 ) {
                var dot = v1.dot(v2);
                var cross = -v1.cross(v2);
                var alpha = Math.sign(cross) * Math.acos( dot / Math.sqrt(magSqr1 * magSqr2) );

                var dirx = Math.cos(alpha);
                var diry = Math.sin(alpha);
                var angle = Editor.Math.rad2deg(alpha);

                txtDegree.rotate(angle, -30, 0);

                // display angle needs invert
                // alpha = -alpha;
                // angle = -angle;

                if ( alpha > 0.0 ) {
                    arc.plot( 'M40,0 A40,40, 0 0,1 ' + dirx*40 + ',' + diry*40 + ' L0,0' );
                    txtDegree.plain( '+' + angle.toFixed(0) + '\xB0' );
                }
                else {
                    arc.plot( 'M40,0 A40,40, 0 0,0 ' + dirx*40 + ',' + diry*40 + ' L0,0' );
                    txtDegree.plain( angle.toFixed(0) + '\xB0' );
                }
            }

            //
            var theta = Math.atan2( v1.y, v1.x ) - Math.atan2( v2.y, v2.x );
            if ( callbacks.update )
                callbacks.update.call(group, Editor.Math.rad2deg(theta), event );
        },

        end: function (event) {
            dragging = false;
            circle.stroke( { color: color } );
            line.stroke( { color: color } );
            arrow.fill( { color: color } )
                 .stroke( { width: 1, color: color } )
                 ;

            arc.hide();
            txtDegree.hide();

            if ( callbacks.end )
                callbacks.end.call(group, event);
        }
    } );

    return group;
};

Tools.scaleTool = function ( svg, callbacks ) {
    var group = svg.group();
    var xarrow, yarrow, scaleRect;

    group.position = new cc.Vec2(0,0);
    group.rotation = 0.0;

    // x-slider
    xarrow = Tools.scaleSlider( svg, 100, '#f00', {
        start: function (x, y, event) {
            if ( callbacks.start )
                callbacks.start.call(group, x, y, event);
        },
        update: function ( dx, dy, event ) {
            var radius = group.rotation * Math.PI / 180.0;
            var dirx = Math.cos(radius);
            var diry = Math.sin(radius);

            var length = Math.sqrt(dx * dx + dy * dy);
            var theta = Math.atan2( diry, dirx ) - Math.atan2( dy, dx );
            length = length * Math.cos(theta);

            xarrow.resize( length + 100 );

            if ( callbacks.update ) {
                callbacks.update.call(group, length/100.0, 0.0, event );
            }
        },
        end: function (event) {
            xarrow.resize( 100 );

            if ( callbacks.end )
                callbacks.end.call(group, event);
        },
    } );
    group.add(xarrow);

    // y-slider
    yarrow = Tools.scaleSlider( svg, 100, '#5c5', {
        start: function (x, y, event) {
            if ( callbacks.start )
                callbacks.start.call(group, x, y, event);
        },
        update: function ( dx, dy, event ) {
            var radius = (group.rotation + 90.0) * Math.PI / 180.0;
            var dirx = Math.cos(radius);
            var diry = Math.sin(radius);

            var length = Math.sqrt(dx * dx + dy * dy);
            var theta = Math.atan2( diry, dirx ) - Math.atan2( dy, dx );
            length = length * Math.cos(theta);

            yarrow.resize( -1.0 * length + 100 );

            if ( callbacks.update ) {
                callbacks.update.call(group, 0.0, length/100.0, event );
            }
        },
        end: function (event) {
            yarrow.resize( 100 );

            if ( callbacks.end )
                callbacks.end.call(group, event);
        },
    } );
    yarrow.rotate(-90, 0, 0 );
    group.add(yarrow);


    // scaleRect
    var color = '#aaa';
    var dragging = false;
    scaleRect = group.rect( 20, 20 )
                        .move( -10, -10 )
                        .fill( { color: color, opacity: 0.4 } )
                        .stroke( { width: 1, color: color } )
                        ;
    scaleRect.on( 'mouseover', function ( event ) {
        var lightColor = Chroma(color).brighter().hex();
        this.fill( { color: lightColor } )
            .stroke( { color: lightColor } )
            ;
    } );
    scaleRect.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            this.fill( { color: color } )
                .stroke( { color: color } )
                ;
        }
    } );
    addMoveHandles( scaleRect, {
        start: function (x, y, event) {
            dragging = true;
            this.fill( { color: '#cc5' } )
                .stroke( { color: '#cc5' } )
                ;

            if ( callbacks.start )
                callbacks.start.call(group, x, y, event);
        },

        update: function ( dx, dy, event ) {
            var dirx = 1.0;
            var diry = -1.0;

            var length = Math.sqrt(dx * dx + dy * dy);
            var theta = Math.atan2( diry, dirx ) - Math.atan2( dy, dx );
            length = length * Math.cos(theta);

            xarrow.resize( length + 100 );
            yarrow.resize( length + 100 );

            if ( callbacks.update )
                callbacks.update.call(group, dirx * length/100.0, diry * length/100.0, event );
        },

        end: function (event) {
            dragging = false;
            this.fill( { color: color } )
                .stroke( { color: color } )
                ;

            xarrow.resize( 100 );
            yarrow.resize( 100 );

            if ( callbacks.end )
                callbacks.end.call(group, event);
        }
    } );

    return group;
};

Tools.circleTool = function ( svg, size, fill, stroke, cursor, callbacks ) {
    if (typeof cursor !== 'string') {
        callbacks = cursor;
        cursor = 'default';
    }

    let group = svg.group()
        .style('cursor', cursor)
        .fill(fill ? fill : 'none')
        .stroke(stroke ? stroke : 'none');

    let circle = group.circle()
        .radius(size / 2)
        ;

    // for stroke hit test
    let bgCircle;
    if (stroke) {
        bgCircle = group.circle()
            .stroke({ width: 8})
            .fill('none')
            .style('stroke-opacity', 0)
            .radius(size / 2)
            ;
    }

    let dragging = false;

    group.style( 'pointer-events', 'bounding-box' );

    group.on( 'mouseover', function () {
        if (fill) {
            let lightColor = Chroma(fill.color).brighter().hex();
            group.fill( { color: lightColor } );
        }

        if (stroke) {
            let lightColor = Chroma(stroke.color).brighter().hex();
            group.stroke( { color: lightColor } );
        }

    } );

    group.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            if (fill) group.fill(fill);
            if (stroke) group.stroke(stroke);
        }
    } );

    addMoveHandles( group, {cursor: cursor}, {
        start: function ( x, y, event ) {
            dragging = true;

            if (fill) {
                let superLightColor = Chroma(fill.color).brighter().brighter().hex();
                group.fill( { color: superLightColor } );
            }

            if (stroke) {
                let superLightColor = Chroma(stroke.color).brighter().brighter().hex();
                group.stroke( { color: superLightColor } );
            }

            if ( callbacks.start )
                callbacks.start (x, y, event);
        },

        update: function ( dx, dy, event ) {
            if ( callbacks.update )
                callbacks.update ( dx, dy, event );
        },

        end: function ( event ) {
            dragging = false;

            if (fill) group.fill(fill);
            if (stroke) group.stroke(stroke);

            if ( callbacks.end )
                callbacks.end (event);
        }
    }  );

    group.radius = function (radius) {
        circle.radius(radius);
        if (bgCircle) bgCircle.radius(radius);

        return this;
    };

    group.cx = function (x) {
        return this.x(x);
    };

    group.cy = function (y) {
        return this.y(y);
    };

    return group;
};

Tools.lineTool = function ( svg, from, to, color, cursor, callbacks ) {
    var group = svg.group().style('cursor', cursor).stroke({color: color});
    var line = group.line( from.x, from.y, to.x, to.y )
                    .style('stroke-width', 1)
                    ;
    // used for hit test
    var bgline = group.line( from.x, from.y, to.x, to.y)
                    .style('stroke-width', 8)
                    .style('stroke-opacity', 0)
                    ;
    var dragging = false;

    
    group.on( 'mouseover', function ( event ) {
        var lightColor = Chroma(color).brighter().hex();
        group.stroke( { color: lightColor } );
    } );

    group.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            group.stroke( { color: color } );
        }
    } );

    addMoveHandles( group, {cursor: cursor}, {
        start: function ( x, y, event ) {
            dragging = true;

            var superLightColor = Chroma(color).brighter().brighter().hex();
            group.stroke( { color: superLightColor } );

            if ( callbacks.start )
                callbacks.start (x, y, event);
        },

        update: function ( dx, dy, event ) {
            if ( callbacks.update )
                callbacks.update ( dx, dy, event );
        },

        end: function ( event ) {
            dragging = false;
            group.stroke( { color: color } );

            if ( callbacks.end )
                callbacks.end (event);
        }
    } );

    group.plot = function () {
        line.plot.apply(line, arguments);
        bgline.plot.apply(bgline, arguments);

        return this;
    };

    return group;
};

Tools.positionLineTool = function ( svg, origin, pos, local, lineColor, textColor ) {
    var group = svg.group();

    var xLine = group.line( origin.x, pos.y, pos.x, pos.y )
                    .stroke({ width: 1, color: lineColor });
    var yLine = group.line( pos.x, origin.y, pos.x, pos.y )
                    .stroke({ width: 1, color: lineColor });

    var xText = group.text('' + local.x).fill(textColor);
    var yText = group.text('' + local.y).fill(textColor);

    let filter = function (add) {
        let blur = add.offset(0, 0).in(add.sourceAlpha).gaussianBlur(1);
        add.blend(add.source, blur);
    };

    xText.filter(filter);
    yText.filter(filter);

    group.style('stroke-dasharray', '5 5');
    group.style('stroke-opacity', 0.8);

    group.plot = function (origin, pos, local) {
        xLine.plot.call(yLine, origin.x, pos.y, pos.x, pos.y);
        yLine.plot.call(xLine, pos.x, origin.y, pos.x, pos.y);

        xText.text('' + Math.floor(local.x)).move(origin.x + (pos.x - origin.x) / 2, pos.y);
        yText.text('' + Math.floor(local.y)).move(pos.x, origin.y + (pos.y - origin.y) / 2);

        return this;
    };

    return group;
};

var RectToolType = {
    None: 0,

    LeftBottom: 1,
    LeftTop: 2,
    RightTop: 3,
    RightBottom: 4,

    Left: 5,
    Right: 6,
    Top: 7,
    Bottom: 8,

    Center: 9,

    Anchor: 10
};

Tools.rectTool = function (svg, callbacks) {
    var group = svg.group();
    var sizeGroup = group.group();
    var lb, lt, rt, rb;     // size points
    var l, t, r, b;         // size sides
    var rect;               // center rect
    var anchor;             // anchor
    var positionLineTool;   // show dash line along x,y direction
    var sizeTextGroup, widthText, heightText;   // show size info when resize
    var smallDragCircle;    // show when rect is too small

    group.type = RectToolType.None;

    function creatToolCallbacks (type) {
        return {
            start: function ( x, y, event ) {
                group.type = type;

                if ( callbacks.start )
                    callbacks.start.call(group, x, y, event, type);
            },
            update: function ( dx, dy, event ) {
                if ( callbacks.update ) {
                    callbacks.update.call(group, dx, dy, event, type);
                }
            },
            end: function ( event ) {
                group.type = RectToolType.None;

                if ( callbacks.end )
                    callbacks.end.call(group, event, type);
            }
        };
    }


    // init center rect
    rect = group.polygon('0,0,0,0,0,0')
                .fill('none')
                .stroke('none')
                ;

    rect.style( 'pointer-events', 'fill' );
    rect.ignoreMouseMove = true;

    addMoveHandles( rect, {ignoreWhenHoverOther: true}, creatToolCallbacks(RectToolType.Center) );

    // init small darg circle
    var smallDragCircleSize = 20;

    smallDragCircle = Tools.circleTool(
        group,
        smallDragCircleSize,
        {color: '#eee', opacity: 0.3},
        {color: '#eee', opacity: 0.5, width: 2},
        creatToolCallbacks(RectToolType.Center)
    );

    // init sides
    function createLineTool(type, cursor) {
        return Tools.lineTool( sizeGroup, cc.v2(0,0), cc.v2(0,0), '#8c8c8c', cursor, creatToolCallbacks(type));
    }

    l = createLineTool(RectToolType.Left, 'col-resize');
    t = createLineTool(RectToolType.Top, 'row-resize');
    r = createLineTool(RectToolType.Right, 'col-resize');
    b = createLineTool(RectToolType.Bottom, 'row-resize');

    // init points
    var pointSize = 8;

    function createPointTool(type, cursor) {
        return Tools.circleTool( sizeGroup, pointSize, {color: '#0e6dde'}, null, cursor, creatToolCallbacks(type)).style('cursor', cursor);
    }

    lb = createPointTool(RectToolType.LeftBottom, 'nwse-resize');
    lt = createPointTool(RectToolType.LeftTop, 'nesw-resize');
    rt = createPointTool(RectToolType.RightTop, 'nwse-resize');
    rb = createPointTool(RectToolType.RightBottom, 'nesw-resize');

    // init position line tool
    positionLineTool = Tools.positionLineTool(group, cc.v2(0,0), cc.v2(0,0), cc.v2(0,0), '#8c8c8c', '#eee');

    // init anchor
    var anchorSize = 10;
    anchor = Tools.circleTool( group, anchorSize, null, {width: 3, color: '#0e6dde'}, creatToolCallbacks(RectToolType.Anchor))
        .style('cursor', 'pointer');

    //init size text
    sizeTextGroup = group.group();
    widthText = sizeTextGroup.text('0').fill('#eee');
    heightText = sizeTextGroup.text('0').fill('#eee');
    
    let filter = function (add) {
        let blur = add.offset(0, 0).in(add.sourceAlpha).gaussianBlur(1);
        add.blend(add.source, blur);
    };

    widthText.filter(filter);
    heightText.filter(filter);

    // set bounds
    group.setBounds = function (bounds) {

        if (Math.abs(bounds[2].x - bounds[0].x) < 10 &&
            Math.abs(bounds[2].y - bounds[0].y) < 10) {

            sizeGroup.hide();
            anchor.hide();
            smallDragCircle.show();

            smallDragCircle.center(
                bounds[0].x + (bounds[2].x - bounds[0].x)/2,
                bounds[0].y + (bounds[2].y - bounds[0].y)/2
            );
        }
        else {
            sizeGroup.show();
            smallDragCircle.hide();

            rect.plot([
                [bounds[0].x, bounds[0].y],
                [bounds[1].x, bounds[1].y],
                [bounds[2].x, bounds[2].y],
                [bounds[3].x, bounds[3].y]
            ]);

            l.plot(bounds[0].x, bounds[0].y, bounds[1].x, bounds[1].y);
            t.plot(bounds[1].x, bounds[1].y, bounds[2].x, bounds[2].y);
            r.plot(bounds[2].x, bounds[2].y, bounds[3].x, bounds[3].y);
            b.plot(bounds[3].x, bounds[3].y, bounds[0].x, bounds[0].y);

            lb.center(bounds[0].x, bounds[0].y);
            lt.center(bounds[1].x, bounds[1].y);
            rt.center(bounds[2].x, bounds[2].y);
            rb.center(bounds[3].x, bounds[3].y);

            if (bounds.anchor) {
                anchor.show();
                anchor.center(bounds.anchor.x, bounds.anchor.y);
            }
            else {
                anchor.hide();
            }
        }

        if (bounds.origin &&
            (group.type === RectToolType.Center ||
             group.type === RectToolType.Anchor)) {
            positionLineTool.show();
            positionLineTool.plot(bounds.origin, bounds.anchor, bounds.localPosition);
        }
        else {
            positionLineTool.hide();
        }

        if (bounds.localSize &&
            group.type >= RectToolType.LeftBottom &&
            group.type <= RectToolType.Bottom) {
            sizeTextGroup.show();

            widthText.text('' + Math.floor(bounds.localSize.width));
            heightText.text('' + Math.floor(bounds.localSize.height));

            widthText.center(bounds[1].x + (bounds[2].x - bounds[1].x)/2, bounds[1].y + (bounds[2].y - bounds[1].y)/2 + 5);
            heightText.center(bounds[2].x + (bounds[3].x - bounds[2].x)/2 + 15, bounds[2].y + (bounds[3].y - bounds[2].y)/2);
        }
        else {
            sizeTextGroup.hide();
        }
    };

    return group;
};

Tools.rectTool.Type = RectToolType;

Tools.icon = function ( svg, url, w, h ) {
    var icon = svg.image(url)
                         .move( -w * 0.5, -h * 0.5 )
                         .size( w, h )
                         ;

    icon.on( 'mouseover', function ( event ) {
        event.stopPropagation();
    } );

    // icon.on( 'mouseout', function ( event ) {
    //     event.stopPropagation();
    // } );

    return icon;
};

Tools.dashLength = function (dash) {
    let scale = _Scene.view.scale;
    if (scale < 1) {
        scale = 1;
    }

    if (typeof dash === 'number') {
        return dash * scale;
    }
    else if (Array.isArray(dash)) {
        return dash.map(n => {
            return n * scale;
        });
    }

    return 3 * scale;
};
