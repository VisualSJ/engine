'use strict';

const tokenizer = require('glsl-tokenizer/string');
const parser = require('glsl-parser/direct');
const mappings = require('./offline-mappings');
const HJSON = require('hjson');

const includeRE = /#include +<([\w-.]+)>/gm;
const plainDefineRE = /#define\s+(\w+)\s+(.*)\n/g;
const defineRE = /#define\s+(\w+)\(([\w,\s]+)\)\s+(.*##.*)\n/g;
const whitespaces = /\s+/g;
const ident = /[_a-zA-Z]\w*/;
const extensionRE = /(?:GL_)?(\w+)/;
const comparators = /^[<=>]+$/;
const ifprocessor = /#(el)?if/;
const rangePragma = /range\(([\d.,\s]+)\)\s(\w+)/;
const precision = /(low|medium|high)p/;
const arithmetics = /^[\d\+\-*/%\s]+$/;
const builtins = /^cc\w+$/i;
const samplerRE = /sampler/;

let effectName = '', shaderName = '';
function warn(msg, ln) { console.warn(`${effectName} - ${shaderName}` + (ln ? ` - ${ln}: ` : ': ') + msg); }
function error(msg) { console.error(`${effectName} - ${shaderName}: ${msg}`); }

function convertType(t) { let tp = mappings.typeParams[t.toUpperCase()]; return tp === undefined ? t : tp; }

function unwindIncludes(str, chunks, record = {}) {
  function replace(_, include) {
    if (record[include]) return '';
    record[include] = true;
    let replace = chunks[include];
    if (replace === undefined) {
      error(`can not resolve #include <${include}>`);
      return '';
    }
    return unwindIncludes(replace, chunks, record);
  }
  return str.replace(includeRE, replace);
}

const glslStripComment = (() => {
  const commentExcludeMap = { "block-comment": true, "line-comment": true, "eof": true };
  return (code) => {
    const tokens = tokenizer(code);
    let result = '';
    for (let i = 0; i < tokens.length; ++i) {
      let t = tokens[i];
      if (!commentExcludeMap[t.type]) result += t.data;
    }
    return result;
  };
})();

const expandStructMacro = (function() {
  function matchParenthesisPair(string, startIdx) {
    let parHead = startIdx;
    let parTail = parHead;
    let depth = 0;
    for (let i = startIdx; i < string.length; i++)
      if (string[i] === '(') { parHead = i; depth = 1; break; }
    if (depth === 0) return parHead;
    for (let i = parHead + 1; i < string.length; i++) {
      if (string[i] === '(') depth++;
      if (string[i] === ')') depth--;
      if (depth === 0) { parTail = i; break; }
    }
    if (depth !== 0) return parHead;
    return parTail;
  }
  function generateHypenRE(hyphen, macroParam) {
    return '(' + [hyphen + macroParam + hyphen, hyphen + macroParam, macroParam + hyphen].join('|') + ')';
  }
  function generateParamRE(param) {
    return '\\b' + param + '\\b';
  }
  return function (code) {
    code = code.replace(/\\\n/g, '');
    let defineCapture = defineRE.exec(code);
    //defineCapture[1] - the macro name
    //defineCapture[2] - the macro parameters
    //defineCapture[3] - the macro body
    while (defineCapture != null) {
      let macroRE = new RegExp('\\n.*' + defineCapture[1] + '\\s*\\(', 'g');
      let macroCapture = macroRE.exec(code);
      while (macroCapture != null) {
        let macroIndex = macroCapture[0].lastIndexOf(defineCapture[1]);
        //the whole macro string,include name and arguments
        let macroStr = code.slice(macroCapture.index + macroIndex, matchParenthesisPair(code, macroCapture.index + macroCapture[0].length - 1) + 1);
        //the macro arguments list
        let macroArguLine = macroStr.slice(macroCapture[0].length - macroIndex, -1);
        //the string before macro's name in the matched line
        let prefix = macroCapture[0].slice(0, macroIndex);
        let containDefine = prefix.indexOf('#define') !== -1;
        let containParenthesis = prefix.indexOf('(') !== -1;
        let macroParams = defineCapture[2].split(',');
        //erase the white space in the macro's parameters
        for (let i = 0; i < macroParams.length; i++) {
          macroParams[i] = macroParams[i].replace(/\s/g, '');
        }
        let macroArgus = macroArguLine.split(',');
        for (let i = 0; i < macroArgus.length; i++) {
          macroArgus[i] = macroArgus[i].replace(/\s/g, '');
        }
        //if the matched macro is defined in another macro, then just replace the parameters with the arguments
        if (containDefine && containParenthesis) {
          code = code.replace(new RegExp(defineCapture[1] + '\\(' + macroArguLine + '\\)', 'g'), (matched, offset) => {
            //if the matched string is the marco we just found,the replace it
            if (macroCapture.index + prefix.length == offset) {
              let ret = defineCapture[3];
              for (let i = 0; i < macroParams.length; i++) {
                ret = ret.replace(new RegExp(generateParamRE(macroParams[i]), 'g'), macroArgus[i]);
              }
              return ret;
            }
            return matched;
          });
          //move the next match index to the beginning of the line,in case of the same macro on the same line.
          macroRE.lastIndex -= macroCapture[0].length;
        }
        //if the matched macro is defined in the executable code block,we should consider the hypen sign('##')
        if (!containDefine) {
          let repStr = defineCapture[3];
          for (let i = 0; i < macroParams.length; i++) {
            let hypenRE = new RegExp(generateHypenRE('##', macroParams[i]), 'g');
            if (hypenRE.test(repStr)) {
              //replace the hypen sign
              repStr = repStr.replace(hypenRE, macroArgus[i]);
            } else {
              repStr = repStr.replace(new RegExp(generateParamRE(macroParams[i]), 'g'), macroArgus[i]);
            }
          }
          code = code.replace(macroStr, repStr);
          //move the next match index to the beginning of the line,in case of the same macro on the same line.
          macroRE.lastIndex -= macroCapture[0].length;
        }
        macroCapture = macroRE.exec(code);
      }
      defineCapture = defineRE.exec(code);
    }
    return code;
  };
})();

const replacePlainDefines = (code) => {
  let defMap = {};
  let defCap = plainDefineRE.exec(code);
  while (defCap != null) {
    defMap[defCap[1]] = { beg: defCap.index, end: defCap.index + defCap[0].length, value: defCap[2] };
    defCap = plainDefineRE.exec(code);
  }
  let regex = '';
  for (let key in defMap) regex += `${key}|`;
  if (regex.length) code = code.replace(new RegExp(regex.slice(0, -1), 'g') , (m, offset) => {
    let info = defMap[m];
    return (offset < info.beg || offset > info.end) ? info.value : m;
  });
  return code;
};

/**
 * say we are extracting from this program:
 * ```
 *    // ..
 * 12 #if USE_LIGHTING
 *      // ..
 * 34   #if NUM_LIGHTS > 0
 *        // ..
 * 56   #endif
 *      // ..
 * 78 #endif
 *    // ..
 * ```
 *
 * the output would be:
 * ```
 * // the complete define list
 * defines = [ { name: 'USE_LIGHTING', type: 'boolean' }, { name: 'NUM_LIGHTS', type: 'number' } ]
 * // bookkeeping: define dependency throughout the code
 * cache = {
 *   lines: [12, 34, 56, 78],
 *   12: [ 'USE_LIGHTING' ],
 *   34: [ 'USE_LIGHTING', 'NUM_LIGHTS' ],
 *   56: [ 'USE_LIGHTING' ],
 *   78: []
 * }
 * ````
 */
function extractDefines(tokens, defines, cache) {
  let curDefs = [], save = (line) => {
    cache[line] = curDefs.reduce((acc, val) => acc.concat(val), []);
    cache.lines.push(line);
  };
  for (let i = 0; i < tokens.length; ) {
    let t = tokens[i], str = t.data, id, df;
    if (t.type !== 'preprocessor' || str.startsWith('#extension')) { i++; continue; }
    tokens.splice(i, 1); // strip out other preprocessor tokens for parser to work
    str = str.split(whitespaces);
    if (str[0] === '#endif') { // pop one level up
      curDefs.pop(); save(t.line); continue;
    } else if (str[0] === '#else') { // just clear this level
      curDefs[curDefs.length - 1].length = 0; save(t.line); continue;
    } else if (str[0] === '#pragma') { // pragma treatments
      // custom numeric define ranges
      if (str[1].startsWith('range')) {
        let mc = rangePragma.exec(t.data);
        if (!mc) continue;
        let def = defines.find(d => d.name === mc[2]);
        if (!def) defines.push(def = { name: mc[2] });
        def.type = 'number';
        def.range = JSON.parse(`[${mc[1]}]`);
      }
      continue;
    } else if (!ifprocessor.test(str[0])) continue;
    if (str[0] === '#elif') { curDefs.pop(); save(t.line); } // pop one level up
    let defs = [];
    str.splice(1).some(s => {
      id = s.match(ident);
      if (id) { // is identifier
        let d = curDefs.reduce((acc, val) => acc.concat(val), defs.slice());
        df = defines.find(d => d.name === id[0]);
        if (df) { if (d.length < df.defines.length) df.defines = d; }
        else defines.push(df = { name: id[0], type: 'boolean', defines: d });
        defs.push(id[0]);
      } else if (comparators.test(s)) df.type = 'number';
      else if (s === '||') return defs = []; // ignore logical OR defines all together
    });
    curDefs.push(defs); save(t.line);
  }
}

const extractParams = (function() {
  function getDefs(line, cache) {
    let idx = cache.lines.findIndex(i => i > line);
    return cache[cache.lines[idx - 1]] || [];
  }
  // tokens (from ith): [ ..., ('highp', ' ',) 'vec4', ' ', 'color', ('[', '4', ']',) ... ]
  function extractInfo(tokens, i) {
    let param = {};
    let offset = precision.exec(tokens[i].data) ? 2 : 0;
    param.name = tokens[i+offset+2].data;
    param.type = convertType(tokens[i+offset].data);
    param.count = 1;
    // handle array type
    if (tokens[offset = nextWord(tokens, i+offset+2)].data === '[') {
      let expr = '', end = offset;
      while (tokens[++end].data !== ']') expr += tokens[end].data;
      try { if (arithmetics.test(expr)) param.count = eval(expr); else throw expr; }
      catch (e) { warn(`${param.name}: illegal array length: ${e}`, tokens[offset].line); }
    }
    return param;
  }
  let exMap = { whitespace: true };
  function nextWord(tokens, i) { while (exMap[tokens[++i].type]); return i; }
  function nextSemicolon(tokens, i, check = () => {}) { while (tokens[i].data !== ';') check(tokens[i++]); return i; }
  return function(tokens, cache, blocks, samplers, dependencies, attributes) {
    for (let i = 0; i < tokens.length; i++) {
      let t = tokens[i], str = t.data, dest;
      if (str === 'uniform') dest = blocks;
      // else if (str === 'attribute') dest = attributes;
      else if (str.startsWith('#extension')) dest = dependencies;
      else continue;
      let defines = getDefs(t.line, cache), param = {};
      if (dest === dependencies) { // extensions
        if (defines.length !== 1 || dest[defines[0]])
          warn('each extension declaration must be wrapped with a unique define preprocessor', t.line);
        dest[defines[0]] = extensionRE.exec(str.split(whitespaces)[1])[1];
        continue;
      }
      // uniforms
      let idx = nextWord(tokens, i+2);
      if (tokens[idx].data !== '{') { // plain types
        if (!samplerRE.test(tokens[i+2].data))
          warn('none-sampler uniforms must be declared in blocks.', t.line);
        dest = samplers;
        param = extractInfo(tokens, i+2);
      } else { // blocks
        param.name = tokens[i+2].data;
        param.members = [];
        while (tokens[idx = nextWord(tokens, idx)].data !== '}') {
          const info = extractInfo(tokens, idx);
          info.size = mappings.sizeMap[info.type] * info.count;
          param.members.push(info);
          idx = nextSemicolon(tokens, idx);
        }
        param.size = param.members.reduce((acc, cur) => acc + cur.size, 0);
        // check for preprocessors inside blocks
        let pre = cache.lines.find(l => l >= tokens[i].line && l < tokens[idx].line)
        if (pre) warn(`${param.name}: no preprocessors allowed inside uniform blocks!`, pre);
        // save necessary info for later glsl 1 conversion
        cache.blocksInfo.push({ beg: tokens[i].position, end: tokens[nextWord(tokens, idx)].position, name: param.name });
        // strip out blocks for parser to work
        tokens.splice(i, idx - i + 2); i--;
        // check for duplicates
        let item = dest.find(i => i.name === param.name);
        if (item) {
          if (JSON.stringify(item.members) !== JSON.stringify(param.members))
            warn(`different UBO using the same name ${param.name}`, t.line);
          param = null;
        }
      }
      if (param) {
        param.defines = defines;
        dest.push(param);
      }
    }
  }
})();

const glsl300to100 = function(code, blocks, cache) {
  let res = '', idx = 0;
  cache.blocksInfo.forEach(i => {
    res += code.slice(idx, i.beg);
    blocks.find(u => u.name === i.name).members.forEach(m => {
      let type = mappings.invTypeParams[m.type];
      res += `  uniform ${type} ${m.name}${m.length > 1 ? `[${m.length}]` : ''};\n`;
    });
    idx = i.end + (code[i.end] === ';');
  });
  res += code.slice(idx);
  return res;
};

const getChunkByName = (function() {
  let entryRE = /([\w-]+)(?::(\w+))?/;
  return function(name, cache) {
    let entryCap = entryRE.exec(name), entry = entryCap[2] || 'main', content = cache[entryCap[1]];
    if (!content) { error(`shader ${entryCap[1]} not found!`); return [ '', entry ]; }
    return [ content, entry ];
  };
})();

const wrapEntry = (function() {
  let wrapperFactory = (vert, fn) => `\nvoid main() { ${vert ? 'gl_Position' : 'gl_FragColor'} = ${fn}(); }\n`;
  return function(content, name, entry, ast, isVert) {
    if (!ast.scope[entry] || ast.scope[entry].parent.type !== 'function')
      error(`entry function ${name} not found`);
    return entry === 'main' ? content : content + wrapperFactory(isVert, entry);
  };
})();

const buildShader = (function() {
  let createCache = () => { return { lines: [], blocksInfo: [] }; };
  return function(vertName, fragName, chunks) {
    let [ vert, vEntry ] = getChunkByName(vertName, chunks, true);
    let [ frag, fEntry ] = getChunkByName(fragName, chunks);

    let defines = [], cache = createCache(), tokens, ast;
    let blocks = [], samplers = [], attributes = [], dependencies = {};

    shaderName = vertName;
    vert = glslStripComment(vert);
    vert = unwindIncludes(vert, chunks);
    vert = expandStructMacro(vert);
    vert = replacePlainDefines(vert);
    tokens = tokenizer(vert);
    extractDefines(tokens, defines, cache);
    extractParams(tokens, cache, blocks, samplers, dependencies, attributes);
    try {
      ast = parser(tokens);
      vert = wrapEntry(vert, vertName, vEntry, ast, true);
    } catch (e) { error(`parse ${vertName} failed: ${e}`); }
    vert = glsl300to100(vert, blocks, cache);

    shaderName = fragName;
    cache = createCache();
    frag = glslStripComment(frag);
    frag = unwindIncludes(frag, chunks);
    frag = expandStructMacro(frag);
    frag = replacePlainDefines(frag);
    tokens = tokenizer(frag);
    extractDefines(tokens, defines, cache);
    extractParams(tokens, cache, blocks, samplers, dependencies, attributes);
    try {
      ast = parser(tokens);
      frag = wrapEntry(frag, fragName, fEntry, ast);
    } catch (e) { error(`parse ${fragName} failed: ${e}`); }
    frag = glsl300to100(frag, blocks, cache);

    // filter out builtin uniforms & assign bindings
    blocks = blocks.filter(u => !builtins.test(u.name));
    samplers = samplers.filter(u => !builtins.test(u.name));
    let bindingIdx = 0;
    blocks.forEach((u) => u.binding = bindingIdx++);
    samplers.forEach((u) => u.binding = bindingIdx++);

    return { vert, frag, defines, blocks, samplers, dependencies };
  };
})();

// ==================
// effects
// ==================

const parseEffect = (function() {
  let effectRE = /%{([^]+)%}/;
  let blockRE = /%%\s*([\w-]+)\s*{([^]+)}/;
  let parenRE = /[{}]/g;
  let trimToSize = content => {
    let level = 1, end = content.length;
    content.replace(parenRE, (p, i) => {
      if (p === '{') level++;
      else if (level === 1) { end = i; level = 1e9; }
      else level--;
    });
    return content.substring(0, end);
  };
  return function (content) {
    let effectCap = effectRE.exec(content);
    let effect = HJSON.parse(`{${effectCap[1]}}`), templates = {};
    content = content.substring(effectCap.index + effectCap[0].length);
    let blockCap = blockRE.exec(content);
    while (blockCap) {
      let str = templates[blockCap[1]] = trimToSize(blockCap[2]);
      content = content.substring(blockCap.index + str.length);
      blockCap = blockRE.exec(content);
    }
    return { effect, templates };
  };
})();

const chunksCache = {};
const addChunksCache = function(chunksDir) {
  const path_ = require('path');
  const fsJetpack = require('fs-jetpack');
  const fs = require('fs');
  let files = fsJetpack.find(chunksDir, { matching: ['**/*.inc'] });
  for (let i = 0; i < files.length; ++i) {
    let name = path_.basename(files[i], '.inc');
    let content = fs.readFileSync(files[i], { encoding: 'utf8' });
    chunksCache[name] = glslStripComment(content);
  }
  return chunksCache;
};

const mapPassParam = (function() {
  let findUniformType = (name, shader) => {
    let res = -1, cb = (u) => {
      if (u.name !== name) return false;
      res = u.type; return true;
    };
    if (!shader.blocks.some((b) => b.members.some(cb))) shader.samplers.some(cb);
    return res;
  };
  let typeCheck = (value, type, givenType, shaderType) => {
    if (typeof type === 'string') return `unsupported type ${type}`;
    if (type !== shaderType && type !== mappings.typeParams[shaderType]) return 'incompatible with shader decl';
    if (givenType === 'string') {
      if (!samplerRE.test(mappings.invTypeParams[type])) return 'string for non-samplers';
    } else if (!Array.isArray(value)) return 'non-array for buffer members';
    else if (value.length !== mappings.sizeMap[type] / 4) return 'wrong array length';
  };
  let mapProperties = (props, shader) => {
    for (const p of Object.keys(props)) {
      const info = props[p], shaderType = findUniformType(p, shader);
      if (info.type === undefined) info.type = shaderType;
      else info.type = mappings.typeParams[info.type.toUpperCase()] || info.type;
      if (info.value === undefined) continue;
      const givenType = typeof info.value;
      if (givenType === 'number') info.value = [info.value]; // convert number to array first
      // type check the given value
      const msg = typeCheck(info.value, info.type, givenType, shaderType);
      if (msg) warn(`illegal property declaration ${p}: ${msg}`);
    }
  };
  return (obj, shader) => {
    for (let key in obj) {
      let prop = obj[key];
      if (typeof prop === 'string') { // string literal
        let num = parseInt(prop);
        if (isNaN(num)) num = mappings.passParams[prop.toUpperCase()];
        if (num !== undefined) obj[key] = num;
      } else if (Array.isArray(prop)) { // arrays:
        if (!prop.length) continue; // empty
        if (typeof prop[0] === 'object') prop.forEach(mapPassParam); // nested props
        else if (typeof prop[0] === 'number') obj[key] = // color array
          ((prop[0] * 255) << 24 | (prop[1] * 255) << 16 |
            (prop[2] * 255) << 8 | (prop[3] || 255) * 255) >>> 0;
      } else if (typeof prop === 'object') {
        if (key === 'properties') mapProperties(prop, shader); // properties (special treatment)
        else mapPassParam(prop); // nested props
      }
    }
  };
})();

const buildEffect = function (name, content) {
  let { effect, templates } = parseEffect(content);
  effectName = effect.name = name;
  Object.assign(templates, chunksCache);
  let shaders = effect.shaders = [];
  for (let j = 0; j < effect.techniques.length; ++j) {
    let jsonTech = effect.techniques[j];
    for (let k = 0; k < jsonTech.passes.length; ++k) {
      let pass = jsonTech.passes[k];
      let vert = pass.vert, frag = pass.frag;
      delete pass.vert; delete pass.frag;
      let name = pass.program = `${effectName}|${vert}|${frag}`;
      let shader = shaders.find((s) => s.name === name);
      if (!shader) {
        shader = buildShader(vert, frag, templates);
        shader.name = name;
        shaders.push(shader);
      }
      mapPassParam(pass, shader);
    }
  }
  return effect;
};

// ==================
// exports
// ==================

module.exports = {
  addChunksCache,
  buildEffect
};
