(function () {
  'use strict';
  if (!window.AuraTeacherDemoAuth?.isLoggedIn()) return;
  document.body.style.visibility = 'visible';
  const C = window.AuraPepCurriculum, $ = id => document.getElementById(id);
  if (!C) { $('error').textContent = '课程数据未加载，请检查本地文件。'; return; }
  function element(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function link(label, url) {
    const el = element('a', label); el.href = url; el.target = '_blank'; el.rel = 'noopener noreferrer'; return el;
  }
  const stats = C.summary();
  for (const [label, count] of [['覆盖册次', stats.books], ['目录已核对单元', stats.directoryCheckedUnits], ['教参已阅读单元', stats.referenceReviewedUnits], ['学生可学习单元', stats.enabledUnits]]) {
    const box = element('div', undefined, 'stat'); box.append(element('b', count), element('span', label)); $('stats').append(box);
  }
  for (const book of C.registry.books) {
    const option = element('option', book.label); option.value = book.id; $('book').append(option);
  }
  function showBook() {
    const book = C.registry.books.find(item => item.id === $('book').value);
    if (!book) return;
    const section = element('section'); section.append(element('h2', book.label), element('p', book.note));
    section.append(book.source ? link('查看人教社该册配套资源 ↗', book.source) : link('查看人教社新教材总体介绍 ↗', C.registry.sources.overview));
    const wrap = element('div', undefined, 'scroll'), table = element('table');
    const head = element('thead'), hr = element('tr'); for (const text of ['单元', '主题', '内容状态', '学生入口']) hr.append(element('th', text)); head.append(hr); table.append(head);
    const body = element('tbody');
    for (const unit of book.units) {
      const row = element('tr');
      for (const text of ['Unit ' + unit.number, unit.title || '名称待核对', unit.contentStatus === 'teacher-reference-reviewed' ? '已阅读教参；课本逐页待核对' : '词汇、句型及任务待核对', '未开放']) row.append(element('td', text));
      body.append(row);
      const detailsRow = element('tr'), cell = element('td'); cell.colSpan = 4;
      const details = element('details'); details.append(element('summary', '查看未开放原因'));
      const list = element('ul'); C.readiness(unit.id).reasons.forEach(reason => list.append(element('li', reason))); details.append(list); cell.append(details); detailsRow.append(cell); body.append(detailsRow);
    }
    table.append(body); wrap.append(table); section.append(wrap);
    section.append(element('p', '复习：' + (book.revision.title || (book.directoryStatus === 'pending' ? '待核对' : '页面有复习板块，主题名称未标明')), 'small'));
    $('bookDetail').replaceChildren(section);
  }
  $('book').addEventListener('change', showBook); showBook();
  const first = C.registry.books[0].units[0], panel = $('firstUnit');
  panel.append(element('p', first.reference.limitation, 'small'));
  const refs = element('p'); refs.append(link('出版社教参发布说明', first.reference.publisherNotice), document.createTextNode(' · '), link('本次可阅读的教参公开转录本', first.reference.readableTranscript)); panel.append(refs);
  panel.append(element('h3', '教参中的学习目标'));
  const goals = element('ul'); first.blueprint.sourceBasedGoals.forEach(goal => goals.append(element('li', goal))); panel.append(goals);
  panel.append(element('h3', 'AURA 的任务组织设计（尚未上线）'));
  const stages = element('ol'); first.blueprint.productStages.forEach(stage => stages.append(element('li', stage.goal + '。' + stage.support + '。'))); panel.append(stages);
  panel.append(element('h3', '伙伴如何回应'));
  const policies = element('ul'); for (const key of ['shortName', 'completeCommunicativeAct', 'alternatives', 'uncertainty', 'language', 'timing']) policies.append(element('li', first.blueprint.responsePolicy[key])); panel.append(policies);
  panel.append(element('p', '跟读、提示下表达和独立表达分别记录，不自动授予口语掌握或解锁资格。', 'notice'));
  $('export').addEventListener('click', () => {
    if (!window.AuraTeacherDemoAuth?.isLoggedIn()) { location.replace('teacher-login.html'); return; }
    let url;
    try {
      url = URL.createObjectURL(new Blob([JSON.stringify({registry: C.registry, summary: C.summary()}, null, 2)], {type: 'application/json'}));
      const a = element('a'); a.href = url; a.download = 'AURA-PEP-Curriculum-Review.json'; document.body.append(a); a.click(); a.remove();
      $('error').textContent = '已发起下载；请在下载列表中打开文件核对。';
    } catch (error) { $('error').textContent = '无法导出：' + error.message; }
    finally { if (url) setTimeout(() => URL.revokeObjectURL(url), 30000); }
  });
  addEventListener('focus', () => { if (!window.AuraTeacherDemoAuth?.isLoggedIn()) location.replace('teacher-login.html'); });
})();
