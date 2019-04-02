'use strict';
var ControllerShape = {};
module.exports = ControllerShape;

const { PrimitiveMode, createMesh } = require('../../../utils/engine');
const { vec3, quat } = cc.vmath;
const External = require('../../../utils/external');
const MathUtil = External.EditorMath;
const Utils = require('../../../utils');

ControllerShape.cylinder = function(radiusTop = 0.5, radiusBottom = 0.5, height = 2, opts = {}) {
    let halfHeight = height * 0.5;
    let radialSegments = opts.radialSegments || 16;
    let heightSegments = opts.heightSegments || 1;
    let capped = opts.capped !== undefined ? opts.capped : true;
    let arc = opts.arc || 2.0 * Math.PI;

    let cntCap = 0;
    if (!capped) {
        if (radiusTop > 0) {
            cntCap++;
        }

        if (radiusBottom > 0) {
            cntCap++;
        }
    }

    // calculate vertex count
    let vertCount = (radialSegments + 1) * (heightSegments + 1);
    if (capped) {
        vertCount += ((radialSegments + 1) * cntCap) + (radialSegments * cntCap);
    }

    // calculate index count
    let indexCount = radialSegments * heightSegments * 2 * 3;
    if (capped) {
        indexCount += radialSegments * cntCap * 3;
    }

    let indices = new Array(indexCount);
    let positions = new Array(vertCount);
    let normals = new Array(vertCount);
    let uvs = new Array(vertCount);
    let maxRadius = Math.max(radiusTop, radiusBottom);
    let minPos = cc.v3(-maxRadius, -halfHeight, -maxRadius);
    let maxPos = cc.v3(maxRadius, halfHeight, maxRadius);

    let index = 0;
    let indexOffset = 0;

    generateTorso();

    if (capped) {
        if (radiusBottom > 0) {
            generateCap(false);
        }

        if (radiusTop > 0) {
            generateCap(true);
        }
    }

    // =======================
    // internal fucntions
    // =======================

    function generateTorso() {
        let indexArray = [];

        // this will be used to calculate the normal
        let slope = (radiusTop - radiusBottom) / height;

        // generate positions, normals and uvs
        for (let y = 0; y <= heightSegments; y++) {
            let indexRow = [];
            let v = y / heightSegments;

            // calculate the radius of the current row
            let radius = v * (radiusTop - radiusBottom) + radiusBottom;

            for (let x = 0; x <= radialSegments; ++x) {
                let u = x / radialSegments;
                let theta = u * arc;

                let sinTheta = Math.sin(theta);
                let cosTheta = Math.cos(theta);

                // vertex
                positions[index] = cc.v3(radius * sinTheta, v * height - halfHeight, radius * cosTheta);

                // normal
                normals[index] = cc.v3(sinTheta, -slope, cosTheta).normalizeSelf();

                // uv
                uvs[index] = cc.v2((1 - u) * 2 % 1, v);

                // save index of vertex in respective row
                indexRow.push(index);

                // increase index
                ++index;
            }

            // now save positions of the row in our index array
            indexArray.push(indexRow);
        }

        // generate indices
        for (let y = 0; y < heightSegments; ++y) {
            for (let x = 0; x < radialSegments; ++x) {
                // we use the index array to access the correct indices
                let i1 = indexArray[y][x];
                let i2 = indexArray[y + 1][x];
                let i3 = indexArray[y + 1][x + 1];
                let i4 = indexArray[y][x + 1];

                // face one
                indices[indexOffset] = i1; ++indexOffset;
                indices[indexOffset] = i4; ++indexOffset;
                indices[indexOffset] = i2; ++indexOffset;

                // face two
                indices[indexOffset] = i4; ++indexOffset;
                indices[indexOffset] = i3; ++indexOffset;
                indices[indexOffset] = i2; ++indexOffset;
            }
        }
    }

    function generateCap(top) {
        let centerIndexStart;
        let centerIndexEnd;

        let radius = top ? radiusTop : radiusBottom;
        let sign = top ? 1 : - 1;

        // save the index of the first center vertex
        centerIndexStart = index;

        // first we generate the center vertex data of the cap.
        // because the geometry needs one set of uvs per face,
        // we must generate a center vertex per face/segment

        for (let x = 1; x <= radialSegments; ++x) {
            // vertex
            positions[index] = cc.v3(0, halfHeight * sign, 0);

            // normal
            normals[index] = cc.v3(0, sign, 0);

            // uv
            uvs[index] = cc.v2(0.5, 0.5);

            // increase index
            ++index;
        }

        // save the index of the last center vertex
        centerIndexEnd = index;

        // now we generate the surrounding positions, normals and uvs

        for (let x = 0; x <= radialSegments; ++x) {
            let u = x / radialSegments;
            let theta = u * arc;

            let cosTheta = Math.cos(theta);
            let sinTheta = Math.sin(theta);

            // vertex
            positions[index] = cc.v3(radius * sinTheta, halfHeight * sign, radius * cosTheta);

            // normal
            normals[index] = cc.v3(0, sign, 0);

            // uv
            uvs[index] = cc.v2(0.5 - (sinTheta * 0.5 * sign), 0.5 + (cosTheta * 0.5));

            // increase index
            ++index;
        }

        // generate indices

        for (let x = 0; x < radialSegments; ++x) {
            let c = centerIndexStart + x;
            let i = centerIndexEnd + x;

            if (top) {
                // face top
                indices[indexOffset] = i + 1; ++indexOffset;
                indices[indexOffset] = c; ++indexOffset;
                indices[indexOffset] = i; ++indexOffset;
            } else {
                // face bottom
                indices[indexOffset] = c; ++indexOffset;
                indices[indexOffset] = i + 1; ++indexOffset;
                indices[indexOffset] = i; ++indexOffset;
            }
        }
    }

    return createMesh({
        positions,
        normals,
        uvs,
        indices,
        minPos,
        maxPos,
    });
};

ControllerShape.cone = function(radius, height, opts) {
    return ControllerShape.cylinder(0, radius, height, opts);
};

ControllerShape.calcQuadData = function(center, width, height) {
    let hw = width / 2;
    let hh = height / 2;
    let points = [];
    points[0] = center.add(cc.v3(-hw, hh, 0));
    points[1] = center.add(cc.v3(-hw, -hh, 0));
    points[2] = center.add(cc.v3(hw, -hh, 0));
    points[3] = center.add(cc.v3(hw, hh, 0));

    let indices = [0, 3, 1, 1, 3, 2];

    let minPos = center.add(cc.v3(-hw, -hh, -1));
    let maxPos = center.add(cc.v3(hw, hh, 1));

    let uvs = [
        cc.v2(0, 1),
        cc.v2(0, 0),
        cc.v2(1, 0),
        cc.v2(1, 1),
    ];

    return {vertices: points, indices: indices, minPos: minPos, maxPos: maxPos, uvs};
};

ControllerShape.quad = function(center, width, height) {
    let quadData = ControllerShape.calcQuadData(center, width, height);

    return createMesh({
        positions: quadData.vertices,
        normals: Array(4).fill(cc.v3(0, 0, 1)),
        indices: quadData.indices,
        minPos: quadData.minPos,
        maxPos: quadData.maxPos,
        uvs: quadData.uvs,
        doubleSided: true,
    });
};

ControllerShape.line = function(startPos, endPos) {
    return createMesh({
        positions: [cc.v3(startPos.x, startPos.y, startPos.z),
        cc.v3(endPos.x, endPos.y, endPos.z)],
        normals: Array(2).fill(cc.v3(0, 1, 0)),
        indices: [0, 1],
        primitiveType: PrimitiveMode.LINE_LIST,
    });
};

ControllerShape.lineWithBoundingBox = function(length, size = 3) {
    return createMesh({
        positions: [cc.v3(), cc.v3(length, 0, 0)],
        normals: Array(2).fill(cc.v3(0, 1, 0)),
        indices: [0, 1],
        minPos: cc.v3(0, -size, -size),
        maxPos: cc.v3(length, size, size),
        primitiveType: PrimitiveMode.LINE_LIST,
    });
};

ControllerShape.circle = function(center, normal, radius) {

    let biNormal = ControllerShape.getBiNormalByNormal(normal);

    return ControllerShape.arc(center, normal, biNormal, MathUtil.TWO_PI, radius, 60);
};

ControllerShape.cube = function(width, height, length, opts = {}) {
    let ws = opts.widthSegments ? opts.widthSegments : 1;
    let hs = opts.heightSegments ? opts.heightSegments : 1;
    let ls = opts.lengthSegments ? opts.lengthSegments : 1;

    let hw = width * 0.5;
    let hh = height * 0.5;
    let hl = length * 0.5;

    let corners = [
        cc.v3(-hw, -hh, hl),
        cc.v3(hw, -hh, hl),
        cc.v3(hw, hh, hl),
        cc.v3(-hw, hh, hl),
        cc.v3(hw, -hh, -hl),
        cc.v3(-hw, -hh, -hl),
        cc.v3(-hw, hh, -hl),
        cc.v3(hw, hh, -hl),
    ];

    let faceAxis = [
        [2, 3, 1], // FRONT
        [4, 5, 7], // BACK
        [7, 6, 2], // TOP
        [1, 0, 4], // BOTTOM
        [1, 4, 2], // RIGHT
        [5, 0, 6],  // LEFT
    ];

    let faceNormals = [
        cc.v3(0, 0, 1), // FRONT
        cc.v3(0, 0, -1), // BACK
        cc.v3(0, 1, 0), // TOP
        cc.v3(0, -1, 0), // BOTTOM
        cc.v3(1, 0, 0), // RIGHT
        cc.v3(-1, 0, 0),  // LEFT
    ];

    let positions = [];
    let normals = [];
    let uvs = [];
    let indices = [];
    let minPos = cc.v3(-hw, -hh, -hl);
    let maxPos = cc.v3(hw, hh, hl);

    function _buildPlane(side, uSegments, vSegments) {
        let u;
        let v;
        let ix;
        let iy;
        let offset = positions.length;
        let idx = faceAxis[side];
        let faceNormal = faceNormals[side];

        for (iy = 0; iy <= vSegments; iy++) {
            for (ix = 0; ix <= uSegments; ix++) {
                u = ix / uSegments;
                v = iy / vSegments;

                let t1 = corners[idx[0]].lerp(corners[idx[1]], u);
                let t2 = corners[idx[0]].lerp(corners[idx[2]], v);
                positions.push(t1.add(t2.sub(corners[idx[0]])));
                normals.push(faceNormal.clone());
                uvs.push(cc.v2(u, v));

                if ((ix < uSegments) && (iy < vSegments)) {
                    let useg1 = uSegments + 1;
                    let a = ix + iy * useg1;
                    let b = ix + (iy + 1) * useg1;
                    let c = (ix + 1) + (iy + 1) * useg1;
                    let d = (ix + 1) + iy * useg1;

                    indices.push(offset + a, offset + d, offset + b);
                    indices.push(offset + b, offset + d, offset + c);
                }
            }
        }
    }

    _buildPlane(0, ws, hs); // FRONT
    _buildPlane(4, ls, hs); // RIGHT
    _buildPlane(1, ws, hs); // BACK
    _buildPlane(5, ls, hs); // LEFT
    _buildPlane(3, ws, ls); // BOTTOM
    _buildPlane(2, ws, ls); // TOP

    return createMesh({
        positions,
        indices,
        normals,
        minPos,
        maxPos,
    });
};

ControllerShape.torus = function(radius, tube, opts = {}) {
    let radialSegments = opts.radialSegments || 30;
    let tubularSegments = opts.tubularSegments || 20;
    let arc = opts.arc || 2.0 * Math.PI;

    let positions = [];
    let normals = [];
    let uvs = [];
    let indices = [];
    let minPos = cc.v3(-radius - tube, -tube, -radius - tube);
    let maxPos = cc.v3(radius + tube, tube, radius + tube);

    for (let j = 0; j <= radialSegments; j++) {
        for (let i = 0; i <= tubularSegments; i++) {
            let u = i / tubularSegments;
            let v = j / radialSegments;

            let u1 = u * arc;
            let v1 = v * Math.PI * 2;

            // vertex
            let x = (radius + tube * Math.cos(v1)) * Math.sin(u1);
            let y = tube * Math.sin(v1);
            let z = (radius + tube * Math.cos(v1)) * Math.cos(u1);

            // this vector is used to calculate the normal
            let nx = Math.sin(u1) * Math.cos(v1);
            let ny = Math.sin(v1);
            let nz = Math.cos(u1) * Math.cos(v1);

            positions.push(cc.v3(x, y, z));
            normals.push(cc.v3(nx, ny, nz));
            uvs.push(cc.v2(u, v));

            if ((i < tubularSegments) && (j < radialSegments)) {
                let seg1 = tubularSegments + 1;
                let a = seg1 * j + i;
                let b = seg1 * (j + 1) + i;
                let c = seg1 * (j + 1) + i + 1;
                let d = seg1 * j + i + 1;

                indices.push(a, d, b);
                indices.push(d, c, b);
            }
        }
    }

    return createMesh({
        positions,
        indices,
        normals,
        uvs,
        minPos,
        maxPos,
    });
};

ControllerShape.calcArcPoints = function(center, normal, fromDir, radian, radius, segments = 60) {
    vec3.normalize(fromDir, fromDir);
    vec3.normalize(normal, normal);
    let deltaRot = cc.quat(0, 0, 0, 1);
    //let count = Math.ceil(radian * segments / (Math.PI * 2));
    let count = segments;
    quat.fromAxisAngle(deltaRot, normal, radian / (count - 1));
    let tangent = cc.v3();
    vec3.scale(tangent, fromDir, radius);

    let arcPoints = [];
    for (let i = 0; i < count; i++) {
        arcPoints[i] = center.add(tangent);
        vec3.transformQuat(tangent, tangent, deltaRot);
    }

    return arcPoints;
};

ControllerShape.getBiNormalByNormal = function(normal) {
    let biNormal = cc.v3();
    vec3.cross(biNormal, normal, cc.v3(0, 1, 0));
    if (Utils.getSqrMagnitude(biNormal) < 0.001) {
        vec3.cross(biNormal, normal, cc.v3(1, 0, 0));
    }

    return biNormal;
};

ControllerShape.calcCirclePoints = function(center, normal, radius, segments = 60) {
    let biNormal = ControllerShape.getBiNormalByNormal(normal);

    return ControllerShape.calcArcPoints(center, normal, biNormal, MathUtil.TWO_PI, radius, segments);
};

ControllerShape.calcDiscPoints = function(center, normal, radius, segments = 60) {
    let biNormal = ControllerShape.getBiNormalByNormal(normal);

    return ControllerShape.calcSectorPoints(center, normal, biNormal, MathUtil.TWO_PI, radius, segments);
};

ControllerShape.calcSectorPoints = function(center, normal, fromDir, radian, radius, segments) {
    let sectorPoints = [];
    sectorPoints.push(center);
    let arcPoints = ControllerShape.calcArcPoints(center, normal, fromDir, radian, radius, segments);
    sectorPoints = sectorPoints.concat(arcPoints);
    return sectorPoints;
};

// 圆盘
ControllerShape.disc = function(center, normal, radius) {

    let biNormal = ControllerShape.getBiNormalByNormal(normal);

    return ControllerShape.sector(center, normal, biNormal, MathUtil.TWO_PI, radius, 60);
};

// 扇形
ControllerShape.sector = function(center, normal, fromDir, radian, radius, segments) {
    return createMesh({
        positions: ControllerShape.calcSectorPoints(center, normal, fromDir, radian, radius, segments),
        normals: Array(segments + 1).fill(cc.v3(normal)),
        indices: [...Array(segments + 1).keys()],
        primitiveType: PrimitiveMode.TRIANGLE_FAN,
    });
};

// 弧形
ControllerShape.arc = function(center, normal, fromDir, radian, radius, segments = 60) {
    return createMesh({
        positions: ControllerShape.calcArcPoints(center, normal, fromDir, radian, radius, segments),
        normals: Array(segments).fill(cc.v3(normal)),
        indices: [...Array(segments).keys()],
        primitiveType: PrimitiveMode.LINE_STRIP,
    });
};

ControllerShape.arcDirectionLine = function(center, normal, fromDir, radian, radius, length, segments) {
    let vertices = [];
    let indices = [];

    // add directin line
    let arcPoints = ControllerShape.calcArcPoints(center, normal, fromDir, radian, radius, segments);
    let endOffset = cc.v3();
    vec3.scale(endOffset, normal, length);
    for (let i = 0; i < arcPoints.length; i++) {
        let endPoint = cc.v3();
        vec3.add(endPoint, arcPoints[i], endOffset);
        vertices.push(arcPoints[i], endPoint);
        indices.push(i * 2, i * 2 + 1);
    }

    // add arc
    for (let i = 1; i < arcPoints.length; i++) {
        vertices.push(arcPoints[i - 1]);
        indices.push(vertices.length - 1);
        vertices.push(arcPoints[i]);
        indices.push(vertices.length - 1);
    }

    return createMesh({
        positions: vertices,
        normals: Array(vertices.length).fill(cc.v3(0, 1, 1)),
        indices: indices,
        primitiveType: PrimitiveMode.LINE_LIST,
    });
};

ControllerShape.lines = function(vertices, indices) {
    return createMesh({
        positions: vertices,
        normals: Array(vertices.length).fill(cc.v3(0, 1, 0)),
        indices: indices,
        primitiveType: PrimitiveMode.LINE_LIST,
    });
};

ControllerShape.calcBoxPoints = function(center, size) {
    let halfSize = cc.v3();
    vec3.scale(halfSize, size, 0.5);
    let points = [];

    points[0] = center.add(cc.v3(-halfSize.x, -halfSize.y, -halfSize.z));
    points[1] = center.add(cc.v3(-halfSize.x, halfSize.y, -halfSize.z));
    points[2] = center.add(cc.v3(halfSize.x, halfSize.y, -halfSize.z));
    points[3] = center.add(cc.v3(halfSize.x, -halfSize.y, -halfSize.z));

    points[4] = center.add(cc.v3(-halfSize.x, -halfSize.y, halfSize.z));
    points[5] = center.add(cc.v3(-halfSize.x, halfSize.y, halfSize.z));
    points[6] = center.add(cc.v3(halfSize.x, halfSize.y, halfSize.z));
    points[7] = center.add(cc.v3(halfSize.x, -halfSize.y, halfSize.z));

    return points;
};

ControllerShape.wireframeBox = function(center, size) {
    let points = ControllerShape.calcBoxPoints(center, size);
    let indices = [];

    for (let i = 1; i < 4; i++) {
        indices.push(i - 1, i);
    }
    indices.push(0, 3);

    for (let i = 5; i < 8; i++) {
        indices.push(i - 1, i);
    }
    indices.push(4, 7);

    for (let i = 0; i < 4; i++) {
        indices.push(i, i + 4);
    }

    return createMesh({
        positions: points,
        normals: Array(points.length).fill(cc.v3(0, 1, 0)),
        indices: indices,
        primitiveType: PrimitiveMode.LINE_LIST,
    });
};

ControllerShape.calcFrustum = function(isOrtho, orthoHeight, fov, aspect, near, far) {
    let points = [];
    let indices = [];
    let nearHalfHeight;
    let nearHalfWidth;
    let farHalfHeight;
    let farHalfWidth;

    if (isOrtho) {
        nearHalfHeight = farHalfHeight = orthoHeight;
        nearHalfWidth = farHalfWidth = nearHalfHeight * aspect;
    } else {
        nearHalfHeight = Math.tan(MathUtil.deg2rad(fov / 2)) * near;
        nearHalfWidth = nearHalfHeight * aspect;

        farHalfHeight = Math.tan(MathUtil.deg2rad(fov / 2)) * far;
        farHalfWidth = farHalfHeight * aspect;
    }

    points[0] = cc.v3(-nearHalfWidth, -nearHalfHeight, -near);
    points[1] = cc.v3(-nearHalfWidth, nearHalfHeight, -near);
    points[2] = cc.v3(nearHalfWidth, nearHalfHeight, -near);
    points[3] = cc.v3(nearHalfWidth, -nearHalfHeight, -near);

    points[4] = cc.v3(-farHalfWidth, -farHalfHeight, -far);
    points[5] = cc.v3(-farHalfWidth, farHalfHeight, -far);
    points[6] = cc.v3(farHalfWidth, farHalfHeight, -far);
    points[7] = cc.v3(farHalfWidth, -farHalfHeight, -far);

    for (let i = 1; i < 4; i++) {
        indices.push(i - 1, i);
    }
    indices.push(0, 3);
    for (let i = 5; i < 8; i++) {
        indices.push(i - 1, i);
    }
    indices.push(4, 7);

    for (let i = 0; i < 4; i++) {
        indices.push(i, i + 4);
    }

    return { vertices: points, indices: indices };
};

ControllerShape.frustum = function(fov, aspect, near, far) {
    let frustumData = ControllerShape.calcFrustum(fov, aspect, near, far);

    return createMesh(
        {
            positions: frustumData.vertices,
            normals: Array(frustumData.vertices.length).fill(cc.v3(0, 1, 0)),
            indices: frustumData.indices,
            primitiveType: PrimitiveMode.LINE_LIST,
        });
};

ControllerShape.calcRectanglePoints = function(center, rotation, size) {
    let right = cc.v3(size.x / 2, 0, 0);
    let up = cc.v3(0, size.y / 2, 0);
    vec3.transformQuat(right, right, rotation);
    vec3.transformQuat(up, up, rotation);

    let vertices = [];
    vertices[0] = center.add(right).add(up);
    vertices[1] = center.add(right).sub(up);
    vertices[2] = center.sub(right).sub(up);
    vertices[3] = center.sub(right).add(up);

    let indices = [];
    for (let i = 1; i < 4; i++) {
        indices.push(i - 1, i);
    }
    indices.push(0, 3);

    return { vertices: vertices, indices: indices };
};

ControllerShape.rectangle = function(center, rotation, size) {
    let rectData = ControllerShape.calcRectanglePoints(center, rotation, size);
    return createMesh(
        {
            positions: rectData.vertices,
            normals: Array(rectData.vertices.length).fill(cc.v3(0, 1, 0)),
            indices: rectData.indices,
            primitiveType: PrimitiveMode.LINE_LIST,
        });
};

ControllerShape.calcSpherePoints = function(center, radius = 0.5, opts = {}) {
    let segments = opts.segments !== undefined ? opts.segments : 32;

    // lat === latitude
    // lon === longitude

    let positions = [];
    let normals = [];
    let uvs = [];
    let indices = [];
    let minPos = vec3.create(-radius, -radius, -radius);
    let maxPos = vec3.create(radius, radius, radius);
    let boundingRadius = radius;

    for (let lat = 0; lat <= segments; ++lat) {
      let theta = lat * Math.PI / segments;
      let sinTheta = Math.sin(theta);
      let cosTheta = -Math.cos(theta);

      for (let lon = 0; lon <= segments; ++lon) {
        let phi = lon * 2 * Math.PI / segments - Math.PI / 2.0;
        let sinPhi = Math.sin(phi);
        let cosPhi = Math.cos(phi);

        let x = sinPhi * sinTheta;
        let y = cosTheta;
        let z = cosPhi * sinTheta;
        let u = lon / segments;
        let v = lat / segments;

        positions.push(cc.v3(center.x + x * radius, center.y + y * radius, center.z + z * radius));
        normals.push(cc.v3(x, y, z));
        uvs.push(cc.v2(u, v));

        if ((lat < segments) && (lon < segments)) {
          let seg1 = segments + 1;
          let a = seg1 * lat + lon;
          let b = seg1 * (lat + 1) + lon;
          let c = seg1 * (lat + 1) + lon + 1;
          let d = seg1 * lat + lon + 1;

          indices.push(a, d, b);
          indices.push(d, c, b);
        }
      }
    }

    return {
      positions,
      indices,
      normals,
      uvs,
      minPos,
      maxPos,
      boundingRadius,
    };
};

ControllerShape.sphere = function(center, radius, opts = {}) {
    let sphereData = ControllerShape.calcSpherePoints(center, radius, opts);
    return createMesh(
        {
            positions: sphereData.positions,
            normals: sphereData.normals,
            indices: sphereData.indices,
        });
};
