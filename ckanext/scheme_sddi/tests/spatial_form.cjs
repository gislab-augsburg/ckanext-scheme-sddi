const fs = require('fs');
const vm = require('vm');
const assert = require('assert').strict;
const root = require('path').resolve(__dirname, '../../..');
let editor;
vm.runInNewContext(fs.readFileSync(root + '\\ckanext\\scheme_sddi\\assets\\js\\spatial_form.js', 'utf8'), {
  ckan: {module: (name, factory) => { assert.equal(name, 'sddi-spatial-form'); editor = factory(); }}
});
const plain = value => JSON.parse(JSON.stringify(value));
for (const [type, coordinates] of [
  ['MultiPoint', [[1,2],[3,4]]],
  ['MultiLineString', [[[1,2],[3,4]],[[5,6],[7,8]]]],
  ['MultiPolygon', [[[[0,0],[1,0],[1,1],[0,0]]],[[[2,2],[3,2],[3,3],[2,2]]]]]
]) {
  const geometry = {type, coordinates};
  const parts = editor.parts(geometry);
  assert.deepEqual(plain(editor.combine(parts, type)), geometry);
  // Deleting only one shape must preserve the remaining shape and multi type.
  assert.deepEqual(plain(editor.combine(parts.slice(1), type)), {type, coordinates: coordinates.slice(1)});
}
assert.equal(editor.combine([], 'MultiPoint'), null);
const mixed = [{type:'Point', coordinates:[1,2]}, {type:'LineString', coordinates:[[1,2],[3,4]]}];
assert.deepEqual(plain(editor.combine(mixed, null)), {type:'GeometryCollection', geometries:mixed});
assert.deepEqual(plain(editor.parts({type:'GeometryCollection',geometries:mixed})), mixed);
assert.throws(() => editor.parts({type:'Feature', geometry:mixed[0]}));
// Invalid text must survive loading and must never clear the existing layers.
editor.input = {value:'{invalid json'};
editor.error = {text: () => ({show: () => {}})};
editor.layers = {clearLayers: () => {throw new Error('Unexpected clear');}};
editor.loadInput();
assert.equal(editor.input.value, '{invalid json');
assert.equal(editor.validInput, false);
console.log('PASS: multipart round trips, partial deletion, full deletion, mixed geometry, invalid input preservation');
