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
const inDecl = /^(\s*)in ((?:\w+\s+)?\w+\s+\w+);/gm;
const outDecl = /^(\s*)out ((?:\w+\s+)?\w+\s+(\w+));/gm;
const texLookup = /texture(\w*)\s*\((\w+),/g;

let effectName = '', shaderName = '';
const warn = (msg, ln) => { console.warn(`${effectName} - ${shaderName}` + (ln ? ` - ${ln}: ` : ': ') + msg); }
const error = (msg) => { console.error(`${effectName} - ${shaderName}: ${msg}`); }

const convertType = (t) => { let tp = mappings.typeParams[t.toUpperCase()]; return tp === undefined ? t : tp; }

const unwindIncludes = (str, chunks, record = {}) => {
  const replace = (_, include) => {
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

const expandStructMacro = (() => {
  const matchParenthesisPair = (string, startIdx) => {
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
  const generateHypenRE = (hyphen, macroParam) => {
    return '(' + [hyphen + macroParam + hyphen, hyphen + macroParam, macroParam + hyphen].join('|') + ')';
  }
  const generateParamRE = (param) => {
    return '\\b' + param + '\\b';
  }
  return (code) => {
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

// replace the obvious constants, which are often used inside array subscripts
const replacePlainDefines = (code) => {
  const defMap = {};
  let defCap = plainDefineRE.exec(code);
  while (defCap != null) {
    defMap[defCap[1]] = { beg: defCap.index, end: defCap.index + defCap[0].length, value: defCap[2] };
    defCap = plainDefineRE.exec(code);
  }
  for (const key of Object.keys(defMap)) {
    // here node.js(10.14.2) seems to behave differently than chrome on those regexes,
    // after working around the '\w', everything looks good
    code = code.replace(new RegExp(`(?<![a-zA-Z0-9_])(?:${key})(?![a-zA-Z0-9_])`, 'g') , (m, offset) => {
      const info = defMap[m];
      return (offset < info.beg || offset > info.end) ? info.value : m;
    });
  }
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
 * defines = [
 *   { name: 'USE_LIGHTING', type: 'boolean', defines: [] },
 *   { name: 'NUM_LIGHTS', type: 'number', defines: [ 'USE_LIGHTING' ] }
 * ]
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
const extractDefines = (tokens, defines, cache) => {
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

const extractParams = (() => {
  const getDefs = (line, cache) => {
    let idx = cache.lines.findIndex(i => i > line);
    return cache[cache.lines[idx - 1]] || [];
  }
  // tokens (from ith): [ ..., ('highp', ' ',) 'vec4', ' ', 'color', ('[', '4', ']',) ... ]
  const extractInfo = (tokens, i) => {
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
  const nextWord = (tokens, i) => { while (exMap[tokens[++i].type]); return i; }
  const nextSemicolon = (tokens, i, check = () => {}) => { while (tokens[i].data !== ';') check(tokens[i++]); return i; }
  return (tokens, cache, blocks, samplers, dependencies) => {
    for (let i = 0; i < tokens.length; i++) {
      let t = tokens[i], str = t.data, dest;
      if (str === 'uniform') dest = blocks;
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

const glsl300to100 = (code, blocks, cache, vert) => {
  let res = '';
  // unpack UBOs
  let idx = 0;
  cache.blocksInfo.forEach(i => {
    res += code.slice(idx, i.beg);
    blocks.find(u => u.name === i.name).members.forEach(m => {
      let type = mappings.invTypeParams[m.type];
      res += `  uniform ${type} ${m.name}${m.count > 1 ? `[${m.count}]` : ''};\n`;
    });
    idx = i.end + (code[i.end] === ';');
  });
  res += code.slice(idx);
  // texture functions
  res = res.replace(texLookup, (_, suffix, name) => {
    const re = new RegExp('sampler(\\w+)\\s+' + name);
    const cap = re.exec(res);
    return `texture${cap[1]}(${name},`;
  });
  if (vert) {
    // in/out => attribute/varying
    res = res.replace(inDecl, (_, indent, decl) => `${indent}attribute ${decl};`);
    res = res.replace(outDecl, (_, indent, decl) => `${indent}varying ${decl};`);
  } else {
    // in/out => varying/gl_FragColor
    res = res.replace(inDecl, (_, indent, decl) => `${indent}varying ${decl};`);
    const outList = [];
    res = res.replace(outDecl, (_, indent, decl, name) => { outList.push(name); return ''; });
    if (outList.length) {
      const outRE = new RegExp(outList.reduce((acc, cur) => `${acc}|${cur}`, '').substring(1), 'g');
      res = res.replace(outRE, 'gl_FragColor');
    }
  }
  return res;
};

const getChunkByName = (() => {
  let entryRE = /([\w-]+)(?::(\w+))?/;
  return (name, cache) => {
    let entryCap = entryRE.exec(name), entry = entryCap[2] || 'main', content = cache[entryCap[1]];
    if (!content) { error(`shader ${entryCap[1]} not found!`); return [ '', entry ]; }
    return [ content, entry ];
  };
})();

const wrapEntry = (() => {
  let wrapperFactory = (vert, fn) => vert ? `\nvoid main() { gl_Position = ${fn}(); }\n` : `\nout vec4 fragColor;\nvoid main() { fragColor = ${fn}(); }\n`;
  return (content, name, entry, ast, isVert) => {
    // if (!ast.scope[entry] || ast.scope[entry].parent.type !== 'function')
    //   error(`entry function ${name} not found`);
    return entry === 'main' ? content : content + wrapperFactory(isVert, entry);
  };
})();

const buildShader = (() => {
  let createCache = () => { return { lines: [], blocksInfo: [] }; };
  return (vertName, fragName, chunks) => {
    let [ vert, vEntry ] = getChunkByName(vertName, chunks, true);
    let [ frag, fEntry ] = getChunkByName(fragName, chunks);

    let defines = [], cache = createCache(), tokens, ast;
    let blocks = [], samplers = [], dependencies = {};
    let glsl3 = {}, glsl1 = {};

    shaderName = vertName;
    vert = glslStripComment(vert);
    vert = unwindIncludes(vert, chunks);
    vert = expandStructMacro(vert);
    vert = replacePlainDefines(vert);
    tokens = tokenizer(vert);
    extractDefines(tokens, defines, cache);
    extractParams(tokens, cache, blocks, samplers, dependencies);
    try {
      ast = null;//parser(tokens);
      vert = wrapEntry(vert, vertName, vEntry, ast, true);
    } catch (e) { error(`parse ${vertName} failed: ${e}`); }
    glsl3.vert = vert; glsl1.vert = glsl300to100(vert, blocks, cache, true);

    shaderName = fragName;
    cache = createCache();
    frag = glslStripComment(frag);
    frag = unwindIncludes(frag, chunks);
    frag = expandStructMacro(frag);
    frag = replacePlainDefines(frag);
    tokens = tokenizer(frag);
    extractDefines(tokens, defines, cache);
    extractParams(tokens, cache, blocks, samplers, dependencies);
    try {
      ast = null;//parser(tokens);
      frag = wrapEntry(frag, fragName, fEntry, ast);
    } catch (e) { error(`parse ${fragName} failed: ${e}`); }
    glsl3.frag = frag; glsl1.frag = glsl300to100(frag, blocks, cache);

    // filter out builtin uniforms & assign bindings
    blocks = blocks.filter(u => !builtins.test(u.name));
    samplers = samplers.filter(u => !builtins.test(u.name));
    let bindingIdx = 0;
    blocks.forEach((u) => u.binding = bindingIdx++);
    samplers.forEach((u) => u.binding = bindingIdx++);

    return { glsl3, glsl1, defines, blocks, samplers, dependencies };
  };
})();

// ==================
// effects
// ==================

const parseEffect = (() => {
  const blockTypes = /CCEFFECT|CCPROGRAM/g;
  const effectRE = /CCEFFECT\s*{([^]+)}/;
  const programRE = /CCPROGRAM\s*([\w-]+)\s*{([^]+)}/;
  const parenRE = /[{}]/g;
  const trimToSize = (content) => {
    let level = 1, end = content.length;
    content.replace(parenRE, (p, i) => {
      if (p === '{') level++;
      else if (level === 1) { end = i; level = 1e9; }
      else level--;
    });
    return content.substring(0, end);
  };
  const stripComments = (content, hashAsComment) => {
    // TODO: strip comments in case of something like '// {'
    return content;
  };
  return (name, content) => {
    shaderName = 'syntax error';
    // code block split points
    const blockInfo = {};
    let blockCap = blockTypes.exec(content), effectCount = 0;
    while (blockCap) {
      blockInfo[blockCap.index] = blockCap[0];
      if (blockCap[0] === 'CCEFFECT') effectCount++;
      blockCap = blockTypes.exec(content);
    }
    const blockPos = Object.keys(blockInfo);
    if (effectCount !== 1) error('there must be exactly one CCEFFECT.');
    // process each block
    let effect = {}, templates = {};
    for (let i = 0; i < blockPos.length; i++) {
      const str = content.substring(blockPos[i], blockPos[i+1] || content.length);
      if (blockInfo[blockPos[i]] === 'CCEFFECT') {
        let effectCap = effectRE.exec(trimToSize(stripComments(str, true)));
        if (!effectCap) error(`illegal effect starting at ${blockPos[i]}`);
        else { effect = HJSON.parse(`{${effectCap[1]}}`); effect.name = name; }
      } else {
        let programCap = programRE.exec(trimToSize(stripComments(str)));
        if (!programCap) error(`illegal program starting at ${blockPos[i]}`);
        else templates[programCap[1]] = programCap[2];
      }
    }
    return { effect, templates };
  };
})();

const chunksCache = {};
const addChunksCache = (chunksDir) => {
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

const mapPassParam = (() => {
  const findUniformType = (name, shader) => {
    let res = -1, cb = (u) => {
      if (u.name !== name) return false;
      res = u.type; return true;
    };
    if (!shader.blocks.some((b) => b.members.some(cb))) shader.samplers.some(cb);
    return res;
  };
  const typeCheck = (value, type, givenType, shaderType) => {
    if (typeof type === 'string') return `unsupported type ${type}`;
    if (type !== shaderType && type !== mappings.typeParams[shaderType]) return 'incompatible with shader decl';
    if (givenType === 'string') {
      if (!samplerRE.test(mappings.invTypeParams[type])) return 'string for non-samplers';
    } else if (!Array.isArray(value)) return 'non-array for buffer members';
    else if (value.length !== mappings.sizeMap[type] / 4) return 'wrong array length';
  };
  const mapProperties = (props, shader) => {
    for (const p of Object.keys(props)) {
      const info = props[p], shaderType = findUniformType(p, shader);
      // type translation or extraction
      if (info.type === undefined) info.type = shaderType;
      else info.type = mappings.typeParams[info.type.toUpperCase()] || info.type;
      // sampler specification
      if (info.sampler) mapPassParam(info.sampler);
      // default values
      if (info.value === undefined) continue;
      const givenType = typeof info.value;
      // convert numbers to array
      if (givenType === 'number' || givenType === 'boolean') info.value = [info.value];
      // type check the given value
      const msg = typeCheck(info.value, info.type, givenType, shaderType);
      if (msg) warn(`illegal property declaration ${p}: ${msg}`);
    }
    return props;
  };
  const generalMap = (obj) => {
    for (let key in obj) {
      let prop = obj[key];
      if (typeof prop === 'string') { // string literal
        let num = parseInt(prop);
        if (isNaN(num)) num = mappings.passParams[prop.toUpperCase()];
        if (num !== undefined) obj[key] = num;
      } else if (Array.isArray(prop)) { // arrays:
        if (!prop.length) continue; // empty
        if (typeof prop[0] === 'object') prop.forEach(generalMap); // nested props
        else if (typeof prop[0] === 'number') obj[key] = // color array
          ((prop[0] * 255) << 24 | (prop[1] * 255) << 16 |
            (prop[2] * 255) << 8 | (prop[3] || 255) * 255) >>> 0;
      } else if (typeof prop === 'object') {
        generalMap(prop); // nested props
      }
    }
  };
  const mapPriority = (() => {
    const priorityRE = /^(\w+)\s*([+-])\s*([\dxabcdef]+)$/i;
    const dfault = mappings.RenderPriority.DEFAULT;
    const min = mappings.RenderPriority.MIN;
    const max = mappings.RenderPriority.MAX;
    return (str) => {
      let res = -1;
      const cap = priorityRE.exec(str);
      res = cap ? mappings.RenderPriority[cap[1].toUpperCase()] + parseInt(cap[3])
        * (cap[2] === '+' ? 1 : -1) : parseInt(str);
      if (isNaN(res) || res < min || res > max) {
        warn(`illegal pass priority: ${str}`); return dfault;
      }
      return res;
    };
  })();
  return (obj, shader) => {
    const tmp = {};
    // special treatments
    if (obj.properties) {
      tmp.properties = mapProperties(obj.properties, shader);
      delete obj.properties;
    }
    if (obj.priority) {
      tmp.priority = mapPriority(obj.priority);
      delete obj.priority;
    }
    generalMap(obj); Object.assign(obj, tmp);
  };
})();

const buildEffect = (name, content) => {
  effectName = name;
  let { effect, templates } = parseEffect(name, content);
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
