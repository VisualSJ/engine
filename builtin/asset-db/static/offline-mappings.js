
const path_ = require('path');
const src = path_.join(Manager.AssetInfo.engine, 'bin/.cache/dev/cocos/');

const gfx = require(path_.join(src, 'gfx/define'));
const { RenderQueue } = require(path_.join(src, 'renderer/core/constants'));
const { RenderPassStage, RenderPriority } = require(path_.join(src, 'pipeline/define'));

const typeParams = {
  BOOL: gfx.GFXType.BOOL,
  INT: gfx.GFXType.INT,
  IVEC2: gfx.GFXType.INT2,
  IVEC3: gfx.GFXType.INT3,
  IVEC4: gfx.GFXType.INT4,
  FLOAT: gfx.GFXType.FLOAT,
  VEC2: gfx.GFXType.FLOAT2,
  VEC3: gfx.GFXType.FLOAT3,
  VEC4: gfx.GFXType.FLOAT4,
  COLOR4: gfx.GFXType.COLOR4,
  MAT2: gfx.GFXType.MAT2,
  MAT3: gfx.GFXType.MAT3,
  MAT4: gfx.GFXType.MAT4,
  SAMPLER2D: gfx.GFXType.SAMPLER2D,
  SAMPLERCUBE: gfx.GFXType.SAMPLER_CUBE,
  [gfx.GFXType.FLOAT4]: gfx.GFXType.COLOR4,
};

const invTypeParams = {
  [gfx.GFXType.BOOL]: 'bool',
  [gfx.GFXType.INT]: 'int',
  [gfx.GFXType.INT2]: 'ivec2',
  [gfx.GFXType.INT3]: 'ivec3',
  [gfx.GFXType.INT4]: 'ivec4',
  [gfx.GFXType.FLOAT]: 'float',
  [gfx.GFXType.FLOAT2]: 'vec2',
  [gfx.GFXType.FLOAT3]: 'vec3',
  [gfx.GFXType.FLOAT4]: 'vec4',
  [gfx.GFXType.COLOR4]: 'vec4',
  [gfx.GFXType.MAT2]: 'mat2',
  [gfx.GFXType.MAT3]: 'mat3',
  [gfx.GFXType.MAT4]: 'mat4',
  [gfx.GFXType.SAMPLER2D]: 'sampler2D',
  [gfx.GFXType.SAMPLER_CUBE]: 'samplerCube',
};

const sizeMap = {
  [gfx.GFXType.BOOL]: 4,
  [gfx.GFXType.INT]: 4,
  [gfx.GFXType.INT2]: 8,
  [gfx.GFXType.INT3]: 12,
  [gfx.GFXType.INT4]: 16,
  [gfx.GFXType.FLOAT]: 4,
  [gfx.GFXType.FLOAT2]: 8,
  [gfx.GFXType.FLOAT3]: 12,
  [gfx.GFXType.FLOAT4]: 16,
  [gfx.GFXType.COLOR4]: 16,
  [gfx.GFXType.MAT2]: 16,
  [gfx.GFXType.MAT3]: 36,
  [gfx.GFXType.MAT4]: 64,
  [gfx.GFXType.SAMPLER2D]: 4,
  [gfx.GFXType.SAMPLER_CUBE]: 4,
};

const formatMap = {
  [gfx.GFXType.BOOL]: gfx.GFXFormat.R32I,
  [gfx.GFXType.INT]: gfx.GFXFormat.R32I,
  [gfx.GFXType.INT2]: gfx.GFXFormat.RG32I,
  [gfx.GFXType.INT3]: gfx.GFXFormat.RGB32I,
  [gfx.GFXType.INT4]: gfx.GFXFormat.RGBA32I,
  [gfx.GFXType.FLOAT]: gfx.GFXFormat.R32F,
  [gfx.GFXType.FLOAT2]: gfx.GFXFormat.RG32F,
  [gfx.GFXType.FLOAT3]: gfx.GFXFormat.RGB32F,
  [gfx.GFXType.FLOAT4]: gfx.GFXFormat.RGBA32F,
  [gfx.GFXType.COLOR4]: gfx.GFXFormat.RGBA32F,
};

const passParams = {
  // color mask
  NONE: gfx.GFXColorMask.NONE,
  R: gfx.GFXColorMask.R,
  G: gfx.GFXColorMask.G,
  B: gfx.GFXColorMask.B,
  A: gfx.GFXColorMask.A,
  RG: gfx.GFXColorMask.R | gfx.GFXColorMask.G,
  RB: gfx.GFXColorMask.R | gfx.GFXColorMask.B,
  RA: gfx.GFXColorMask.R | gfx.GFXColorMask.A,
  GB: gfx.GFXColorMask.G | gfx.GFXColorMask.B,
  GA: gfx.GFXColorMask.G | gfx.GFXColorMask.A,
  BA: gfx.GFXColorMask.B | gfx.GFXColorMask.A,
  RGB: gfx.GFXColorMask.R | gfx.GFXColorMask.G | gfx.GFXColorMask.B,
  RGA: gfx.GFXColorMask.R | gfx.GFXColorMask.G | gfx.GFXColorMask.A,
  RBA: gfx.GFXColorMask.R | gfx.GFXColorMask.B | gfx.GFXColorMask.A,
  GBA: gfx.GFXColorMask.G | gfx.GFXColorMask.B | gfx.GFXColorMask.A,
  ALL: gfx.GFXColorMask.ALL,
  // blend operation
  ADD: gfx.GFXBlendOp.ADD,
  SUB: gfx.GFXBlendOp.SUB,
  REV_SUB: gfx.GFXBlendOp.REV_SUB,
  MIN: gfx.GFXBlendOp.MIN,
  MAX: gfx.GFXBlendOp.MAX,
  // blend factor
  ZERO: gfx.GFXBlendFactor.ZERO,
  ONE: gfx.GFXBlendFactor.ONE,
  SRC_ALPHA: gfx.GFXBlendFactor.SRC_ALPHA,
  DST_ALPHA: gfx.GFXBlendFactor.DST_ALPHA,
  ONE_MINUS_SRC_ALPHA: gfx.GFXBlendFactor.ONE_MINUS_SRC_ALPHA,
  ONE_MINUS_DST_ALPHA: gfx.GFXBlendFactor.ONE_MINUS_DST_ALPHA,
  SRC_COLOR: gfx.GFXBlendFactor.SRC_COLOR,
  DST_COLOR: gfx.GFXBlendFactor.DST_COLOR,
  ONE_MINUS_SRC_COLOR: gfx.GFXBlendFactor.ONE_MINUS_SRC_COLOR,
  ONE_MINUS_DST_COLOR: gfx.GFXBlendFactor.ONE_MINUS_DST_COLOR,
  SRC_ALPHA_SATURATE: gfx.GFXBlendFactor.SRC_ALPHA_SATURATE,
  CONSTANT_COLOR: gfx.GFXBlendFactor.CONSTANT_COLOR,
  ONE_MINUS_CONSTANT_COLOR: gfx.GFXBlendFactor.ONE_MINUS_CONSTANT_COLOR,
  CONSTANT_ALPHA: gfx.GFXBlendFactor.CONSTANT_ALPHA,
  ONE_MINUS_CONSTANT_ALPHA: gfx.GFXBlendFactor.ONE_MINUS_CONSTANT_ALPHA,
  // stencil operation
  // ZERO: GFXStencilOp.ZERO, // duplicate, safely removed because enum value is(and always will be) the same
  KEEP: gfx.GFXStencilOp.KEEP,
  REPLACE: gfx.GFXStencilOp.REPLACE,
  INCR: gfx.GFXStencilOp.INCR,
  DECR: gfx.GFXStencilOp.DECR,
  INVERT: gfx.GFXStencilOp.INVERT,
  INCR_WRAP: gfx.GFXStencilOp.INCR_WRAP,
  DECR_WRAP: gfx.GFXStencilOp.DECR_WRAP,
    // comparison function
  NEVER: gfx.GFXComparisonFunc.NEVER,
  LESS: gfx.GFXComparisonFunc.LESS,
  EQUAL: gfx.GFXComparisonFunc.EQUAL,
  LESS_EQUAL: gfx.GFXComparisonFunc.LESS_EQUAL,
  GREATER: gfx.GFXComparisonFunc.GREATER,
  NOT_EQUAL: gfx.GFXComparisonFunc.NOT_EQUAL,
  GREATER_EQUAL: gfx.GFXComparisonFunc.GREATER_EQUAL,
  ALWAYS: gfx.GFXComparisonFunc.ALWAYS,
  // cull mode
  // NONE: GFXCullMode.NONE, // duplicate, safely removed because enum value is(and always will be) the same
  FRONT: gfx.GFXCullMode.FRONT,
  BACK: gfx.GFXCullMode.BACK,
  // shade mode
  GOURAND: gfx.GFXShadeModel.GOURAND,
  FLAT: gfx.GFXShadeModel.FLAT,
  // polygon mode
  FILL: gfx.GFXPolygonMode.FILL,
  LINE: gfx.GFXPolygonMode.LINE,
  POINT: gfx.GFXPolygonMode.POINT,
  // primitive mode
  POINT_LIST: gfx.GFXPrimitiveMode.POINT_LIST,
  LINE_LIST: gfx.GFXPrimitiveMode.LINE_LIST,
  LINE_STRIP: gfx.GFXPrimitiveMode.LINE_STRIP,
  LINE_LOOP: gfx.GFXPrimitiveMode.LINE_LOOP,
  TRIANGLE_LIST: gfx.GFXPrimitiveMode.TRIANGLE_LIST,
  TRIANGLE_STRIP: gfx.GFXPrimitiveMode.TRIANGLE_STRIP,
  TRIANGLE_FAN: gfx.GFXPrimitiveMode.TRIANGLE_FAN,
  LINE_LIST_ADJACENCY: gfx.GFXPrimitiveMode.LINE_LIST_ADJACENCY,
  LINE_STRIP_ADJACENCY: gfx.GFXPrimitiveMode.LINE_STRIP_ADJACENCY,
  TRIANGLE_LIST_ADJACENCY: gfx.GFXPrimitiveMode.TRIANGLE_LIST_ADJACENCY,
  TRIANGLE_STRIP_ADJACENCY: gfx.GFXPrimitiveMode.TRIANGLE_STRIP_ADJACENCY,
  TRIANGLE_PATCH_ADJACENCY: gfx.GFXPrimitiveMode.TRIANGLE_PATCH_ADJACENCY,
  QUAD_PATCH_LIST: gfx.GFXPrimitiveMode.QUAD_PATCH_LIST,
  ISO_LINE_LIST: gfx.GFXPrimitiveMode.ISO_LINE_LIST,

  // POINT: gfx.GFXFilter.POINT, // duplicate, safely removed because enum value is(and always will be) the same
  LINEAR: gfx.GFXFilter.LINEAR,
  ANISOTROPIC: gfx.GFXFilter.ANISOTROPIC,

  WRAP: gfx.GFXAddress.WRAP,
  MIRROR: gfx.GFXAddress.MIRROR,
  CLAMP: gfx.GFXAddress.CLAMP,
  BORDER: gfx.GFXAddress.BORDER,

  TRUE: true,
  FALSE: false
};
Object.assign(passParams, RenderPassStage);

const DynamicState = gfx.GFXDynamicState;

const mappings = {
  typeParams,
  invTypeParams,
  sizeMap,
  formatMap,
  passParams,
  RenderQueue,
  RenderPriority,
  DynamicState,
};

module.exports = mappings;
