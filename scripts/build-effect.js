'use strict';

const ps = require('path');
const fs = require('fs');
const fsJetpack = require('fs-jetpack');

global.Manager = {};
Manager.AssetInfo = {};
Manager.AssetInfo.engine = ps.join(__dirname, '../resources/3d/engine'); // change here if using custom engines

const shdcLib = require('../builtin/asset-db/static/shdc-lib');
shdcLib.addChunksCache('builtin/asset-db/static/chunks');

const indent = (str, num) => str.replace(/\n/g, '\n'+' '.repeat(num));

const stringifyEffect = (() => {
  const newlines = /\n+/g;
  const toOneLiner = o => '\n      ' + stringify(o);
  const stringify = (o) => { return JSON.stringify(o).replace(/([,])/g, '$1 '); }
  const stringifyUniforms = (uniforms) => {
    let code = '';
    if (!uniforms.length) return '[]';
    for (let i = 0; i < uniforms.length; ++i) {
      let u = uniforms[i];
      if (u.members) {
        code += `  {"name": "${u.name}", "size": ${u.size}, "defines": ${stringify(u.defines)}, "binding": ${u.binding}, "members": [`;
        code += u.members.map(u => '\n    ' + stringify(u));
        code += '\n  ]},\n';
      } else {
        code += `  ${stringify(u)},\n`;
      }
    }
    return `[\n${code.slice(0, -2)}\n]`;
  };
  const stringifyShaders = (shaders) => {
    let code = '';
    for (let i = 0; i < shaders.length; ++i) {
      let { name, vert, frag, defines, blocks, samplers, dependencies } = shaders[i];
      vert = vert.replace(newlines, '\\n');
      frag = frag.replace(newlines, '\\n');
      code += '  {\n';
      code += `    "name": "${name}",\n`;
      code += `    "vert": "${vert}",\n`;
      code += `    "frag": "${frag}",\n`;
      code += '    "defines": [';
      code += defines.map(toOneLiner);
      code += (defines.length ? '\n    ' : '') + '],\n';
      code += `    "blocks": ${indent(stringifyUniforms(blocks), 4)},\n`;
      code += `    "samplers": ${indent(stringifyUniforms(samplers), 4)},\n`;
      code += `    "dependencies": ${stringify(dependencies)}\n`;
      code += '  },\n';
    }
    return `[\n${code.slice(0, -2)}\n]`;
  };
  return (effect) => {
    let code = '';
    code += '{\n';
    code += `  "name": "${effect.name}",\n`;
    code += `  "techniques": ${stringify(effect.techniques)},\n`;
    code += `  "shaders": ${indent(stringifyShaders(effect.shaders), 2)}\n`;
    code += '},\n';
    return code;
  };
})();

const path = 'builtin/asset-db/static/internal/assets';
const files = fsJetpack.find(path, { matching: ['**/*.effect'] });

const essentialList = {
  'builtin-effect-unlit': true,
  'builtin-effect-skybox': true,
  'builtin-effect-sprite': true,
  'builtin-effect-particle-add': true,
};
const essentialDir = ps.join(Manager.AssetInfo.engine, 'cocos/3d/builtin/effects.js');

let all = ``, essential = '';
for (let i = 0; i < files.length; ++i) {
  const name = ps.basename(files[i], '.effect');
  const content = fs.readFileSync(files[i], { encoding: 'utf8' });
  const effect = shdcLib.buildEffect(name, content);
  const str = indent(stringifyEffect(effect), 2);
  if (essentialList[name]) essential += str;
  all += str;
}

fs.writeFileSync('effects.js', `export default [\n  ${all.slice(0, -4)}\n];\n`, { encoding: 'utf8' });
fs.writeFileSync(essentialDir, `// absolute essential effects\nexport default [\n  ${essential.slice(0, -4)}\n];\n`, { encoding: 'utf8' });
