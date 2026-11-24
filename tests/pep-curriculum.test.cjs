'use strict';
const vm = require('node:vm'), fs = require('node:fs'), assert = require('node:assert/strict');
const denyStorage = new Proxy({}, {get() { throw new Error('Curriculum must not access learner storage'); }});
const context = {window: {}, localStorage: denyStorage, sessionStorage: denyStorage};
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname + '/../js/pep-curriculum.js', 'utf8'), context);
const C = context.window.AuraPepCurriculum; let count = 0;
function test(name, fn) {fn(); count++; console.log('PASS ' + name);}
test('eight books and forty-two checked directories never imply playable lessons', () => {
  const s = C.summary(); assert.equal(s.books, 8); assert.equal(s.directoryCheckedBooks, 7);
  assert.equal(s.directoryCheckedUnits, 42); assert.equal(s.reservedUnits, 4); assert.equal(s.enabledUnits, 0);
});
test('sixth grade lower reserves unknown names rather than copying a legacy book', () => {
  const book = C.registry.books.find(b => b.grade === 6 && b.term === 'lower');
  assert.equal(book.source, null); assert.equal(book.directoryStatus, 'pending');
  for (const unit of book.units) {assert.equal(unit.title, null); assert(!C.readiness(unit.id).enabled);}
});
test('directory entries use the selected new resource family and do not fabricate edition years', () => {
  for (const book of C.registry.books) {
    assert.equal(book.resourceFamily, 'pep-yyptzy-new'); assert.equal(book.editionYear, null);
    if (book.source) assert(book.source.includes('/yyptzy/xypep/'));
  }
  assert.equal(C.registry.books.find(b => b.grade === 4 && b.term === 'upper').units[0].title, 'Helping at home');
  assert.equal(C.registry.books.find(b => b.grade === 5 && b.term === 'upper').units[0].title, 'Different friends');
});
test('reference reading does not invent a textbook vocabulary list, page numbers or approved assessment', () => {
  const first = C.registry.books[0].units[0];
  assert.equal(first.contentStatus, 'teacher-reference-reviewed'); assert(first.reference.readableTranscript);
  assert.equal(first.reference.textbookPageNumbers, null); assert.equal(first.vocabulary.length, 0);
  assert.equal(first.patterns.length, 0); assert.equal(first.sourcePages.length, 0);
  assert.equal(first.review.independentAssessment, false); assert.equal(first.assessmentVersion, null);
});
test('unknown or legacy module IDs cannot resolve to a PEP unit', () => {
  for (const id of [null, undefined, {}, '', 'G1', 'AURA-Y5-2.0', '__proto__']) {
    assert.equal(C.getUnit(id), null); assert.equal(C.readiness(id).enabled, false);
  }
});
test('every book and unit has a unique grade-term namespace, including module bindings', () => {
  const books = C.registry.books, units = books.flatMap(b => b.units);
  assert.equal(new Set(books.map(b => b.id)).size, books.length);
  assert.equal(new Set(units.map(u => u.id)).size, units.length);
  for (const book of books) for (const unit of book.units) {
    assert.equal(unit.bookId, book.id); assert.equal(C.getUnit(unit.id), unit);
    assert.equal(unit.modules.length, 3); assert.equal(new Set(unit.modules.map(m => m.key)).size, 3);
  }
});
test('UI and exports cannot mutate reviewed curriculum status in memory', () => {
  const first = C.registry.books[0].units[0];
  assert.throws(() => {first.learningEnabled = true;}, TypeError);
  assert.throws(() => {first.review.browser = true;}, TypeError);
  assert.throws(() => {first.modules.push({key: 'fake'});}, {name: 'TypeError'});
  assert.equal(C.summary().enabledUnits, 0);
});
test('mastery claims remain disabled with missing textbook, task, independent and browser evidence', () => {
  const result = C.readiness(C.registry.books[0].units[0].id);
  assert.equal(result.enabled, false);
  for (const part of ['版权页', '词汇', '句型', '课本页码', '三个板块', '独立检查', '浏览器']) assert(result.reasons.some(r => r.includes(part)), part);
});
console.log('ALL ' + count + ' PEP CURRICULUM TESTS PASSED');
