'use strict';

const tokenizer = require('glsl-tokenizer/string');
const parser = require('glsl-parser/direct');
const mappings = require('./offline-mappings');
const HJSON = require('hjson');

const includeRE = /#include +<([\w-.]+)>/g;
const plainDefineRE = /#define\s+(\w+)\s+(.*)\n/g;
const defineRE = /#define\s+(\w+)\(([\w,\s]+)\)\s+(.*##.*)\n/g;
const precisionRE = /precision\s+\w+\s+\w+/;
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
const layoutRE = /layout\(.*?\)/g;
const layoutExtract = /layout\((.*?)\)(\s*)$/;
const bindingExtract = /binding\s*=\s*(\d+)/;

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
  for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i], str = t.data, id, df;
    if (t.type !== 'preprocessor' || str.startsWith('#extension')) { continue; }
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
    const res = [];
    for (let i = 0; i < tokens.length; i++) {
      let t = tokens[i], str = t.data, dest, type;
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
        dest = samplers; type = 'sampler';
        param = extractInfo(tokens, i+2);
        idx = nextSemicolon(tokens, idx);
      } else { // blocks
        param.name = tokens[i+2].data;
        param.members = []; type = 'block';
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
        // check for duplicates
        let item = dest.find(i => i.name === param.name);
        if (item) {
          if (JSON.stringify(item.members) !== JSON.stringify(param.members))
            warn(`different UBO using the same name ${param.name}`, t.line);
          param.duplicate = true;
        }
        idx = nextWord(tokens, idx);
      }
      res.push({ beg: tokens[i].position, end: tokens[idx].position, name: param.name, type });
      if (!param.duplicate) {
        param.defines = defines;
        dest.push(param);
      }
      // now we are done with the whole expression
      i = idx;
    }
    return res;
  }
})();

const getChunkByName = (() => {
  let entryRE = /([\w-]+)(?::(\w+))?/;
  return (name, cache) => {
    let entryCap = entryRE.exec(name), entry = entryCap[2] || 'main', content = cache[entryCap[1]];
    if (!content) { error(`shader ${entryCap[1]} not found!`); return [ '', entry ]; }
    return [ content, entry ];
  };
})();

const wrapEntry = (() => {
  let wrapperFactory = (vert, fn) => vert ? `\nvoid main() { gl_Position = ${fn}(); }\n` : `\nout vec4 cc_FragColor;\nvoid main() { cc_FragColor = ${fn}(); }\n`;
  return (content, entry, isVert) => {
    return entry === 'main' ? content : content + wrapperFactory(isVert, entry);
  };
})();

const miscChecks = (() => {
  return (code, entry) => {
    // precision declaration check
    const cap = precisionRE.exec(code);
    if (cap) {
      if (/#extension/.test(code.slice(cap.index)))
        warn('precision declaration must come after extensions');
    } else warn('precision declaration not found.');
    // AST based checks
    try {
      const tokens = tokenizer(code).filter((t) => t.type !== 'preprocessor');
      const ast = parser(tokens);
      // entry function check
      if (!ast.scope[entry] || ast.scope[entry].parent.type !== 'function')
        error(`entry function '${entry}' not found.`);
    } catch (e) { error(`parser failed: ${e}`); }
  };
})();

const glsl300to100 = (code, blocks, paramInfo, vert) => {
  let res = '';
  // unpack UBOs
  let idx = 0;
  paramInfo.forEach((i) => {
    if (i.type !== 'block') return;
    res += code.slice(idx, i.beg);
    blocks.find((u) => u.name === i.name).members.forEach((m) => {
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
  // layout qualifiers
  res = res.replace(layoutRE, () => '');
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

const decorateBindings = (() => {
  const record = new Map();
  return (code, blocks, samplers, paramInfo) => {
    const manifest = { block: blocks, sampler: samplers };
    record.clear();
    let idx = 0;
    // extract existing binding infos
    paramInfo.forEach((i) => {
      const frag = code.slice(idx, i.beg);
      const info = {};
      const cap = layoutExtract.exec(frag);
      if (cap) {
        // position of ')'
        info.position = idx + cap.index + cap[0].length - cap[2].length - 1;
        const cap2 = bindingExtract.exec(cap[1]);
        if (cap2) {
          info.position = -1; // indicating no-op
          const binding = parseInt(cap2[1]);
          info.binding = binding;
          record.set(binding, true);
          // adapt bingings
          const u = manifest[i.type].find((u) => u.name === i.name);
          const b = manifest[i.type].find((u) => u.binding === binding);
          if (b) { b.binding = u.binding; u.binding = binding; }
          // because blocks are one consecutive array indexed by thier bindings at runtime (pass.ts)
          else warn(`illegal custom binding for ${i.name}, (block.binding < sampler.binding) should always hold true`);
        }
      }
      record.set(i.name, info);
      idx = i.end;
    });
    let res = ''; idx = 0;
    paramInfo.forEach((i) => {
      let { position } = record.get(i.name);
      const u = manifest[i.type].find((u) => u.name === i.name);
      // insert declaration
      if (position === undefined) { // no qualifier, just insert everything
        res += code.slice(idx, i.beg);
        res += `layout(binding = ${u.binding}) `;
      } else if (position >= 0) { // qualifier exists, but no binding specified
        res += code.slice(idx, position);
        res += `, binding = ${u.binding}`;
        res += code.slice(position, i.beg);
      } else { // no-op, binding is already specified
        res += code.slice(idx, i.beg);
      }
      res += code.slice(i.beg, i.end);
      idx = i.end;
    });
    res += code.slice(idx);
    return res;
  };
})();

const buildShader = (() => {
  let createCache = () => { return { lines: [] }; };
  return (vertName, fragName, chunks) => {

    let defines = [], blocks = [], samplers = [], dependencies = {};
    let cache = createCache(), tokens;
    const glsl3 = {}, glsl1 = {};

    shaderName = vertName;
    let [ vert, vEntry ] = getChunkByName(vertName, chunks, true);
    vert = unwindIncludes(vert, chunks);
    vert = expandStructMacro(vert);
    vert = replacePlainDefines(vert);
    vert = wrapEntry(vert, vEntry, true);
    tokens = tokenizer(vert);
    extractDefines(tokens, defines, cache);
    let vertInfo = extractParams(tokens, cache, blocks, samplers, dependencies);
    glsl1.vert = glsl300to100(vert, blocks, vertInfo, true);
    miscChecks(glsl1.vert, vEntry); glsl3.vert = vert;

    shaderName = fragName;
    cache = createCache();
    let [ frag, fEntry ] = getChunkByName(fragName, chunks);
    frag = unwindIncludes(frag, chunks);
    frag = expandStructMacro(frag);
    frag = replacePlainDefines(frag);
    frag = wrapEntry(frag, fEntry);
    tokens = tokenizer(frag);
    extractDefines(tokens, defines, cache);
    let fragInfo = extractParams(tokens, cache, blocks, samplers, dependencies);
    glsl1.frag = glsl300to100(frag, blocks, fragInfo, false);
    miscChecks(glsl1.frag, fEntry); glsl3.frag = frag;

    // filter out pipeline builtin params
    blocks = blocks.filter((u) => !builtins.test(u.name));
    samplers = samplers.filter((u) => !builtins.test(u.name));
    vertInfo = vertInfo.filter((u) => !builtins.test(u.name));
    fragInfo = fragInfo.filter((u) => !builtins.test(u.name));
    // assign bindings
    let bindingIdx = 0;
    blocks.forEach((u) => u.binding = bindingIdx++);
    samplers.forEach((u) => u.binding = bindingIdx++);

    // disabled 'till we add vulkan support
    // glsl4.vert = decorateBindings(vert, blocks, samplers, vertInfo);
    // glsl4.frag = decorateBindings(frag, blocks, samplers, fragInfo);

    return { glsl3, glsl1, defines, blocks, samplers, dependencies };
  };
})();

// ==================
// effects
// ==================

const stripComments = (() => {
  const crlfNewLines = /\r\n/g;
  const blockComments = /\/\*.*?\*\//gs;
  const lineComments = /(\/\/|#).*$/gm;
  const includeHash = () => '';
  const excludeHash = (m, p) => p === '#' ? m : '';
  return (code, hashAsComment = false) => {
    let result = code.replace(crlfNewLines, '\n').replace(blockComments, '');
    return result.replace(lineComments, hashAsComment ? includeHash : excludeHash);
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
    chunksCache[name] = stripComments(content);
  }
  return chunksCache;
};

const parseEffect = (() => {
  const cceffect = /CCEffect/i;
  const blockTypes = /CCEffect|CCProgram/gi;
  const effectRE = /CCEffect\s*{([^]+)}/i;
  const programRE = /CCProgram\s*([\w-]+)\s*{([^]+)}/i;
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
  return (name, content) => {
    shaderName = 'syntax error';
    // code block split points
    const blockInfos = {};
    let blockCap = blockTypes.exec(content), effectCount = 0;
    while (blockCap) {
      blockInfos[blockCap.index] = blockCap[0];
      if (cceffect.test(blockCap[0])) effectCount++;
      blockCap = blockTypes.exec(content);
    }
    const blockPos = Object.keys(blockInfos);
    if (effectCount !== 1) error('there must be exactly one CCEffect.');
    // process each block
    let effect = {}, templates = {};
    for (let i = 0; i < blockPos.length; i++) {
      const str = content.substring(blockPos[i], blockPos[i+1] || content.length);
      // strip comments this early here in case of something like '// {'
      if (cceffect.test(blockInfos[blockPos[i]])) {
        let effectCap = effectRE.exec(trimToSize(stripComments(str, true)));
        if (!effectCap) error(`illegal effect starting at ${blockPos[i]}`);
        else {
          effect = HJSON.parse(`{${effectCap[1]}}`);
          if (effect.name) effectName = effect.name;
          else effect.name = name;
        }
      } else {
        let programCap = programRE.exec(trimToSize(stripComments(str)));
        if (!programCap) error(`illegal program starting at ${blockPos[i]}`);
        else templates[programCap[1]] = programCap[2];
      }
    }
    return { effect, templates };
  };
})();

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
      if (info.sampler) generalMap(info.sampler);
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
    shaderName = 'type error';
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

const unrollReferences = (obj, decls) => {
  const type = typeof obj;
  if (type === 'string' && obj.startsWith('$')) {
    return JSON.parse(JSON.stringify(decls[obj.slice(1)]));
  } else if (type === 'object') {
    if (Array.isArray(obj)) {
      const len = obj.length;
      for (let i = 0; i < len; i++) {
        obj[i] = unrollReferences(obj[i], decls);
      }
    } else {
      for (const key of Object.keys(obj)) {
        obj[key] = unrollReferences(obj[key], decls);
      }
    }
  }
  return obj;
};

const unrollDeclarations = (() => {
  const unroll = (obj, decls) => {
    const parent = obj.__extends__;
    if (parent) {
      delete obj.__extends__;
      return unroll(Object.assign({}, decls[parent], obj));
    } else return obj;
  };
  return (decls) => {
    if (!decls) return {};
    for (const key of Object.keys(decls)) {
      decls[key] = unroll(decls[key], decls);
    }
    return decls;
  };
})();

const buildEffect = (name, content) => {
  effectName = name;
  let { effect, templates } = parseEffect(name, content);
  // compile time references
  const declarations = unrollDeclarations(effect.declarations);
  delete effect.declarations;
  unrollReferences(effect.techniques, declarations);
  // map passes
  templates = Object.assign({}, chunksCache, templates);
  const shaders = effect.shaders = [];
  for (const jsonTech of effect.techniques) {
    for (const pass of jsonTech.passes) {
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
