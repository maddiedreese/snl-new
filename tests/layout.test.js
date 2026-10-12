import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, nextSaturday, randomChoice, fitText } from '../src/layout.js';
import { hosts, musicalGuests, excludedNames } from '../src/celebrities.js';

test('names keep accents, normalize whitespace, and do not become HTML', () => {
  assert.equal(normalizeText('  Rene\u0301e\n Rapp  '),'RENÉE RAPP');
  assert.equal(normalizeText('<script>alert(1)</script>'),'<SCRIPT>ALERT(1)</SCRIPT>');
});
test('Saturday calculation handles month/year boundaries without a timezone shift', () => {
  assert.equal(nextSaturday(new Date(2026,9,12,0)), 'OCT 17');
  assert.equal(nextSaturday(new Date(2026,9,17,23)), 'OCT 17');
  assert.equal(nextSaturday(new Date(2026,11,31,23)), 'JAN 2');
});
test('randomizer avoids the current choice and handles short pools', () => {
  assert.equal(randomChoice(['A','B'],'a',()=>0),'B');
  assert.equal(randomChoice(['A'],'A',()=>0),'A');
  assert.equal(randomChoice([],'A',()=>0),'');
});
test('suggestions are unique and centrally filtered', () => {
  assert.ok(hosts.length > 500 && musicalGuests.length > 500);
  for (const list of [hosts,musicalGuests]) {
    assert.equal(new Set(list).size,list.length);
    assert.ok(list.every(n=>!excludedNames.has(n.toLowerCase())));
    assert.ok(list.every(n=>n.length<160 && n.trim()===n));
  }
});
test('layout handles empty text and graphemes without losing characters', () => {
  const context = { font: '', measureText(text) { const size=parseFloat(this.font); const width=Array.from(text).length*size*.5; return {width,actualBoundingBoxLeft:0,actualBoundingBoxRight:width,actualBoundingBoxAscent:size*.75,actualBoundingBoxDescent:size*.1}; } };
  assert.deepEqual(fitText(context,' ',{width:100,height:100}).lines,[]);
  for (const value of ['W'.repeat(160),'VERY LONG NAME WITH LOTS OF WORDS '.repeat(4),'Björk & Renée Rapp','🎤✨👨‍👩‍👧‍👦'.repeat(8)]) {
    const layout=fitText(context,value,{width:618,height:326,maxSize:218,maxLines:3});
    assert.ok(layout.lines.length>0 && layout.lines.length<=3);
    assert.ok(layout.height<=326);
    assert.ok(layout.metrics.every(m=>m.width<=618));
    assert.equal(layout.lines.join('').replaceAll(' ',''),normalizeText(value).replaceAll(' ',''));
  }
});

test('single-word names shrink without splitting off letters', () => {
  const context = { font: '', measureText(text) { const size=parseFloat(this.font); const width=text.length*size*.5; return {width,actualBoundingBoxLeft:0,actualBoundingBoxRight:width,actualBoundingBoxAscent:size*.75,actualBoundingBoxDescent:0}; } };
  for (const name of ['Turnstile', 'Florence', 'Bartholomew']) {
    const layout=fitText(context,name,{width:618,height:326,maxSize:218,maxLines:3});
    assert.deepEqual(layout.lines,[name.toUpperCase()]);
    assert.ok(layout.metrics[0].width<=618);
  }
});
