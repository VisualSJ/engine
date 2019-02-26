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
const stringify = (o) => { return JSON.stringify(o).replace(/([,])/g, '$1 '); }
const stringifyArray = (arr, stringifyObj = stringify) => {
  let code = '';
  if (!arr.length) return '[]';
  for (const obj of arr) code += `  ${indent(stringifyObj(obj), 2)},\n`;
  return `[\n${code.slice(0, -2)}\n]`;
};

const stringifyEffect = (() => {
  const newlines = /\n+/g;
  const stringifyBlock = (u) => `{"name": "${u.name}", "size": ${u.size}, "defines": ${stringify(u.defines)}, "binding": ${u.binding}, "members": ${stringifyArray(u.members)}}`;
  const stringifyShader = (shader) => {
    let code = '';
    let { name, glsl3, glsl1, defines, blocks, samplers, dependencies } = shader;

    // comment any of the following lines to keep shaders readable
    glsl1.vert = glsl1.vert.replace(newlines, '\\n');
    glsl1.frag = glsl1.frag.replace(newlines, '\\n');
    glsl3.vert = glsl3.vert.replace(newlines, '\\n');
    glsl3.frag = glsl3.frag.replace(newlines, '\\n');

    code += '{\n';
    code += `  "name": "${name}",\n`;
    code += '  "glsl3": {\n';
    code += `    "vert": \`${glsl3.vert}\`,\n`;
    code += `    "frag": \`${glsl3.frag}\`\n`;
    code += '  },\n';
    code += '  "glsl1": {\n';
    code += `    "vert": \`${glsl1.vert}\`,\n`;
    code += `    "frag": \`${glsl1.frag}\`\n`;
    code += '  },\n';
    code += `  "defines": ${indent(stringifyArray(defines), 2)},\n`;
    code += `  "blocks": ${indent(stringifyArray(blocks, stringifyBlock), 2)},\n`;
    code += `  "samplers": ${indent(stringifyArray(samplers), 2)},\n`;
    code += `  "dependencies": ${stringify(dependencies)}\n`;
    code += '}';

    return code;
  };
  return (effect) => {
    let code = '';
    code += '{\n';
    code += `  "name": "${effect.name}",\n`;
    code += `  "techniques": ${indent(stringifyArray(effect.techniques), 2)},\n`;
    code += `  "shaders": ${indent(stringifyArray(effect.shaders, stringifyShader), 2)}\n`;
    code += '}';
    return code;
  };
})();

const addEssential = (() => {
  // empty array will keep all techs
  const essentialList = {
    'builtin-unlit': [0],
    'builtin-skybox': [],
    'builtin-sprite': [],
    'builtin-particle': [0],
  };
  return (essentials, name, effect) => {
    const techs = essentialList[name];
    if (techs !== undefined) {
      const partial = Object.assign({}, effect);
      if (techs.length) {
        partial.techniques = techs.reduce((acc, cur) => (acc.push(partial.techniques[cur]), acc), []);
        partial.shaders = partial.shaders.filter((s) => partial.techniques.some((tech) => tech.passes.some((p) => p.program === s.name)));
      }
      essentials.push(partial);
    }
  };
})();

const path = 'builtin/asset-db/static/internal/assets';
const files = fsJetpack.find(path, { matching: ['**/*.effect'] });
const essentialDir = ps.join(Manager.AssetInfo.engine, 'cocos/3d/builtin/effects.js');

let all = [], essentials = [];
for (let i = 0; i < files.length; ++i) {
  const name = ps.basename(files[i], '.effect');
  const content = fs.readFileSync(files[i], { encoding: 'utf8' });
  const effect = shdcLib.buildEffect(name, content);
  all.push(effect); addEssential(essentials, name, effect);
}

fs.writeFileSync('effects.js', `export default ${stringifyArray(all, stringifyEffect)};\n`, { encoding: 'utf8' });
fs.writeFileSync(essentialDir, `// absolute essential effects\nexport default ${stringifyArray(essentials, stringifyEffect)};\n`, { encoding: 'utf8' });
