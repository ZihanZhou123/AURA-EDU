(function () {
  'use strict';

  const E = window.UnitEngine;
  const C = window.UnitContent;
  const $ = id => document.getElementById(id);
  const heard = new Set();
  const skills = ['listen', 'read', 'write'];

  let state = null;
  let profiles = [];
  let urls = [];
  let authorized = false;
  let epoch = 0;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);

  function read(id = $('learner').value) {
    if (!id) return null;
    const grade = Number($('teacherGrade').value);
    const term = $('teacherTerm').value;
    const raw = localStorage.getItem(E.key(id, grade, term));
    return raw ? E.validate(JSON.parse(raw), id, grade, term) : E.empty(id, grade, term);
  }

  function clear() {
    epoch++;
    for (const url of urls) URL.revokeObjectURL(url);
    urls = [];
    heard.clear();
  }

  function login() {
    if ($('demoCode').value !== 'AURA-DEMO') {
      $('loginError').textContent = '演示口令不正确。';
      return;
    }

    try {
      profiles = JSON.parse(localStorage.getItem('aura_studio_profiles_v1') || '[]');
      if (!Array.isArray(profiles)) throw Error('身份记录格式异常');
      $('learner').replaceChildren(...profiles.map(profile => new Option(profile.nickname, profile.id)));
      authorized = true;
      $('login').hidden = true;
      $('reviewPanel').hidden = false;
      show();
    } catch (error) {
      $('loginError').textContent = error.message;
    }
  }

  async function audio(id) {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('aura_unit_experience_audio_v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('clips', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return new Promise((resolve, reject) => {
      const request = db.transaction('clips').objectStore('clips').get(id);
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  }

  function field(id, label, kind = 'input') {
    const control = kind === 'textarea'
      ? `<textarea id="${id}" class="task-input"></textarea>`
      : `<input id="${id}" class="task-input" maxlength="100">`;
    return `<label for="${id}">${label}</label>${control}`;
  }

  function decision(id, label) {
    return `<label for="${id}">${label}</label>
      <select id="${id}" class="task-input">
        <option value="">请选择</option>
        <option value="meets-goal">符合任务、意思基本清楚，达到本次目标</option>
        <option value="needs-support">仍需帮助，或证据不足以判断</option>
      </select>`;
  }

  function skillName(skill) {
    return C.skills.find(item => item.id === skill)?.zh || skill;
  }

  function stats() {
    const rows = skills.map(skill => {
      const report = E.skillReport(state, skill);
      const accuracy = report.accuracy === null ? '未作答' : report.accuracy + '%';
      return `<tr>
        <td>${esc(skillName(skill))}</td>
        <td>${report.firstCorrect} / ${report.answered}</td>
        <td>${accuracy}</td>
        <td>${report.hinted} / ${report.independent}</td>
      </tr>`;
    }).join('');

    return `<table class="scope-table">
      <tr><th>板块</th><th>首次答对 / 已答</th><th>首次正确率</th><th>提示 / 独立首次答对</th></tr>
      ${rows}
    </table>`;
  }

  async function persist(mutator) {
    const snapshot = state;
    const run = () => {
      const latest = read();
      if (!latest || latest.learnerId !== snapshot.learnerId ||
          latest.grade !== snapshot.grade || latest.term !== snapshot.term ||
          latest.revision !== snapshot.revision) {
        throw Error('记录已变化，请重新读取对应录音再评价，避免混用学生或覆盖进度。');
      }

      mutator(latest);
      latest.revision++;
      localStorage.setItem(E.key(latest.learnerId, latest.grade, latest.term), JSON.stringify(latest));
      state = latest;
    };

    return navigator.locks
      ? navigator.locks.request(E.key(snapshot.learnerId, snapshot.grade, snapshot.term), run)
      : run();
  }

  async function attachAudio(elementId, statusId, buttonId, clipId, key, view) {
    const expected = { id: state.learnerId, grade: state.grade, term: state.term };

    try {
      const clip = await audio(clipId);
      if (view !== epoch) return;
      if (!clip || clip.learnerId !== expected.id || clip.grade !== expected.grade ||
          (clip.term || 'a') !== expected.term) {
        throw Error('录音文件缺失或身份不符，无法确认达到目标。');
      }

      const url = URL.createObjectURL(clip.blob);
      urls.push(url);
      $(elementId).src = url;
      $(statusId).textContent = '请完整听录音，再填写具体表达和反馈。';
      $(elementId).onended = () => {
        if (view !== epoch) return;
        heard.add(key);
        $(buttonId).disabled = false;
        $(statusId).textContent = '已听完对应录音，可以填写结论。';
      };
    } catch (error) {
      if (view === epoch) $(statusId).textContent = error.message;
    }
  }

  function unitId(student) {
    return `pep-g${student.grade}-${student.term}-unit1`;
  }

  function aiAssessments(student) {
    const records = student.skills.speak.aiAssessments;
    return Array.isArray(records) ? records.filter(record =>
      record?.studentId === student.learnerId && record.unitId === unitId(student)
    ) : [];
  }

  function aiOralEvidence() {
    const id = unitId(state);
    let practice = [];

    try {
      const records = JSON.parse(
        localStorage.getItem(`aura_edu_practice_history_${state.learnerId}_${id}`) || '[]'
      );
      if (Array.isArray(records)) {
        practice = records.filter(record =>
          record?.studentId === state.learnerId && record.unitId === id
        );
      }
    } catch {
      practice = [];
    }

    const outcomes = {
      unheard: '未听清',
      scaffolding_keyword: '引导补全',
      grammar_correction: '语法反馈',
      independent_correct: '独立完成',
      assisted_correct: '提示后完成',
      corrected_complete: '纠错后完成',
      needs_retry: '需要再试',
    };

    const practiceHtml = practice.map(record => {
      const turns = Array.isArray(record.logs) ? [...record.logs].reverse() : [];
      const details = turns.map(turn => {
        const hint = typeof turn?.usedHint === 'boolean'
          ? `<br>作答前使用提示　${turn.usedHint ? '是' : '否'}` : '';
        return `<p><strong>${esc(outcomes[turn?.outcome] || '练习')}</strong>
          <br>问题　${esc(turn?.question)}
          <br>学生作答　${esc(turn?.studentSaid)}
          <br>AI 回应　${esc(turn?.aiReply)}${hint}</p>`;
      }).join('');

      return `<details><summary>${esc(record.completedAt)} · ${turns.length} 轮</summary>${details}</details>`;
    }).join('');

    const assessmentHtml = aiAssessments(state).map(record => {
      const tasks = Array.isArray(record.taskFeedbacks) ? record.taskFeedbacks : [];
      const details = tasks.map(task => {
        const answer = task?.hasIndependentEvidence
          ? `独立作答　${esc(task.studentAnswer)} <strong>${esc(task.independentScore)} / 5</strong>`
          : `未取得独立作答证据${task?.studentAnswer ? '<br>记录的回答　' + esc(task.studentAnswer) : ''}`;
        const followUp = task?.followUpAnswer ? `<br>追问后的作答　${esc(task.followUpAnswer)}` : '';
        const assisted = task?.assistedCompleted ? '<br>提示后完成' : '';

        return `<p><strong>${esc(task?.prompt)}</strong><br>${answer}${followUp}${assisted}
          <br>AI 评价　${esc(task?.feedbackReason)}</p>`;
      }).join('');

      return `<details>
        <summary>${record.isRetest ? '独立复测' : '口语测评'} · ${esc(record.totalIndependentScore)} / 20 · ${esc(record.completedAt)}</summary>
        ${details}
      </details>`;
    }).join('');

    return `<section>
      <h2>AI 口语学习证据</h2>
      <h3>练习过程</h3>
      ${practiceHtml || '<p>暂无已结束的 AI 练习。</p>'}
      <h3>口语测评与复测</h3>
      ${assessmentHtml || '<p>暂无已提交的 AI 口语测评。</p>'}
    </section>`;
  }

  function tagName(tag) {
    const labels = {
      'be-am': 'I 与 am 的搭配',
      'be-is': '单数主语与 is 的搭配',
      'be-are': '复数主语与 are 的搭配',
      country: '介绍来自哪里',
      role: '人物身份',
      person: '人物词义',
      'rule-action': '合适的规则行为',
      'rule-negative': '否定规则',
      'rule-password': '保护密码',
      'rule-work': '保存作品',
      'rule-reason': '规则与作用',
      'rule-turn': '等待轮次',
      'rule-meaning': '理解规则',
      greet: '问候与回应',
      introduce: '介绍自己',
      friend: '人物关系',
      thanks: '表达感谢',
      'friend-action': '帮助与分享',
      'body-hand': '词音与图片：手',
      'body-eye': '词音与图片：眼睛',
      letters: '字母大小写',
      'greet-spelling': '问候词的字母',
      job: '职业词义',
      'job-spelling': '职业词拼写',
      'job-sentence': '职业介绍句型',
      'can-action': '家务动作',
      'can-base': 'can 后的动作表达',
      together: '一起做的事情',
      trait: '人物特点',
      'trait-spelling': '特点词拼写',
      'trait-sentence': '人物描述句型',
      ability: '人物才艺',
      'past-go': '过去的去向',
      'past-see': '过去看到的事情',
      'past-eat': '过去吃过的东西',
      'past-take': '过去的拍照表达',
      'past-was': '过去的状态',
      'past-detail': '过去经历的细节',
    };
    return labels[tag] || tag;
  }

  function diagnostic(student) {
    const exam = E.result(student);
    const groups = new Map();

    function add(skill, record, source, question, answer) {
      const key = `${skill}:${record.tag}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: `${skillName(skill)} · ${tagName(record.tag)}`,
          items: [],
        });
      }
      groups.get(key).items.push({ source, question, answer, expected: record.expected });
    }

    for (const skill of skills) {
      for (const record of E.skillReport(student, skill).records) {
        if (record.attempts[0]?.correct === false) {
          add(skill, record, '练习首次', record.prompt, record.attempts[0].response);
        }
      }
    }

    if (exam) {
      const questions = E.questions(student.grade, null, true, student.term, student.exam.form);
      for (const [index, record] of student.exam.records.entries()) {
        if (!record.correct) {
          add(record.skill, record, '独立检测', questions[index].prompt, record.response);
        }
      }
    }

    const priorities = [...groups.values()].sort((a, b) => b.items.length - a.items.length);
    const oral = aiAssessments(student)[0];
    const oralGaps = Array.isArray(oral?.taskFeedbacks)
      ? oral.taskFeedbacks.filter(task => task?.hasIndependentEvidence !== true) : [];
    const pending = exam?.oralStatus === 'pending-review' || exam?.writingStatus === 'pending-review';

    return { exam, priorities, oral, oralGaps, pending, progress: E.progress(student) };
  }

  function readingProgressSummary(cohort) {
  const topics = new Map();

  for (const { student, profile, priorities } of cohort) {
    const reading = student.skills.read;
    const checks = new Map();

    for (const record of [...reading.records, ...(reading.draft?.records ?? [])]) {
      const attempt = record.attempts?.[0];
      if (record.independentCheck && record.attempts?.length === 1 &&
          attempt?.hintLevel === 0 && typeof attempt.correct === 'boolean') {
        checks.set(record.tag, attempt.correct);
      }
    }

    const tags = new Set(
      priorities.filter(group => group.key.startsWith('read:'))
        .map(group => group.key.slice(5))
    );
    for (const tag of checks.keys()) tags.add(tag);

    for (const tag of tags) {
      if (!topics.has(tag)) topics.set(tag, []);
      topics.get(tag).push({ profile, outcome: checks.get(tag) });
    }
  }

  const ratio = (count, total) =>
    `${count} / ${total}${total ? ` · ${Math.round(count / total * 100)}%` : ''}`;

  const rows = [...topics].sort((a, b) => b[1].length - a[1].length)
    .map(([tag, students]) => {
      const checked = students.filter(item => item.outcome !== undefined).length;
      const correct = students.filter(item => item.outcome === true).length;
      const details = students.map(({ profile, outcome }) => {
        const status = outcome === undefined
          ? '尚未复测' : outcome ? '独立答对' : '复测后仍需巩固';
        return `<li><button type="button" class="btn" data-student="${esc(profile.id)}">${esc(profile.nickname)}</button> · ${status}</li>`;
      }).join('');

      return `<tr>
        <th scope="row"><details><summary>${esc(tagName(tag))}</summary><ul>${details}</ul></details></th>
        <td>${ratio(students.length, cohort.length)}</td>
        <td>${ratio(checked, students.length)}</td>
        <td>${checked ? ratio(correct, checked) : '暂无复测'}</td>
      </tr>`;
    }).join('');

  const table = rows
    ? `<div style="overflow-x:auto"><table class="scope-table">
        <thead><tr><th>阅读知识点</th><th>涉及巩固 / 有学习记录</th>
          <th>已复测 / 涉及巩固</th><th>答对 / 已复测</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`
    : '<p>当前没有阅读巩固或复测记录。</p>';

  return `<h3>阅读定向巩固与独立复测</h3>
    <p>分母取当前浏览器中所选年级和册次有学习记录的学生。每个知识点每人计一次，采用最近一次有效复测。</p>
    ${table}`;
}

function renderClassDashboard() {
    const cohort = [];
    const rows = [];
    const topics = new Map();
    const pending = [];

    for (const profile of profiles) {
      let student;
      try {
        student = read(profile.id);
      } catch {
        rows.push(`<tr><td>${esc(profile.nickname)}</td><td colspan="4">记录无法读取</td></tr>`);
        continue;
      }
      if (!student?.revision) continue;

      const { exam, priorities, oralGaps, pending: needsReview, progress } = diagnostic(student);
      cohort.push({ student, profile, priorities });
      const button = `<button type="button" class="btn" data-student="${esc(profile.id)}">${esc(profile.nickname)}</button>`;

      for (const group of priorities) {
        const topic = topics.get(group.key) ?? { label: group.label, count: 0 };
        topic.count++;
        topics.set(group.key, topic);
      }

      if (needsReview) {
        pending.push(`<li>${button} · 单元检测口语和书面表达待评审</li>`);
      }
      if (oralGaps.length) {
        pending.push(`<li>${button} · 最近 AI 口语测评有 ${oralGaps.length} 题缺少独立评分证据</li>`);
      }

      const scores = exam
        ? skills.map(skill => `${skillName(skill)} ${exam.scores[skill].percent}%`).join(' · ')
        : '尚无完整检测';
      const priority = priorities.slice(0, 2).map(group => group.label).join('；');
      const status = needsReview ? '待评审' : exam?.passed ? '已达标' : exam ? '需跟进' : '学习中';

      rows.push(`<tr>
        <td>${button}</td><td>${progress}/4</td><td>${esc(scores)}</td>
        <td>${esc(priority || '当前记录无错点')}</td><td>${status}</td>
      </tr>`);
    }

    const common = [...topics.values()]
      .filter(topic => topic.count > 1)
      .sort((a, b) => b.count - a.count);
    const commonHtml = common.map(topic => `<li>${esc(topic.label)} · ${topic.count} 人</li>`).join('');

    $('classDashboard').innerHTML = `<section>
      <h2>班级诊断</h2>
      <div style="overflow-x:auto"><table class="scope-table">
        <thead><tr><th>学生</th><th>学习进度</th><th>单元检测</th><th>优先跟进</th><th>状态</th></tr></thead>
        <tbody>${rows.join('') || '<tr><td colspan="5">当前年级和册次暂无学习记录。</td></tr>'}</tbody>
      </table></div>
      <h3>多人出现的错点</h3>
      ${commonHtml ? `<ul>${commonHtml}</ul>` : '<p>当前记录中暂无多人共同错点。</p>'}
      ${$('teacherGrade').value === '3' && $('teacherTerm').value === 'a' ? readingProgressSummary(cohort) : ''}
      <h3>待复核</h3>
      ${pending.length ? `<ul>${pending.join('')}</ul>` : '<p>当前没有待复核项目。</p>'}
    </section>`;

    $('classDashboard').querySelectorAll('[data-student]').forEach(button => {
      button.onclick = () => {
        $('learner').value = button.dataset.student;
        show();
        $('report').scrollIntoView({ block: 'start' });
      };
    });
  }

  function readingRetestComparison(student) {
  if (student.grade !== 3 || student.term !== 'a') return '';

  const reading = student.skills.read;
  const groups = new Map();

  for (const record of [...reading.records, ...(reading.draft?.records ?? [])]) {
    const attempt = record.attempts?.[0];
    if (!record.independentCheck || record.attempts?.length !== 1 ||
        attempt?.hintLevel !== 0 || typeof attempt.correct !== 'boolean') {
      continue;
    }

    if (!groups.has(record.tag)) groups.set(record.tag, new Map());
    groups.get(record.tag).set(record.questionId, attempt.correct);
  }

  const rows = [];
  for (const [tag, byQuestion] of groups) {
    const outcomes = [...byQuestion.values()];
    const first = outcomes[0];
    const latest = outcomes.at(-1);
    const compared = outcomes.length >= 2;
    const status = !compared ? '目前只有一次复测'
      : !first && latest ? '由错到对'
      : first && !latest ? '表现有波动'
      : latest ? '两次均答对' : '仍需巩固';

    rows.push(
      '<tr><th scope="row">' + esc(tagName(tag)) + '</th><td>' +
      (first ? '答对' : '答错') + '</td><td>' +
      (compared ? (latest ? '答对' : '答错') : '—') +
      '</td><td>' + status + '</td></tr>'
    );
  }

  if (!rows.length) return '';

  return '<h3>独立复测对比</h3><div style="overflow-x:auto"><table class="scope-table">' +
    '<thead><tr><th scope="col">知识点</th><th scope="col">首次</th>' +
    '<th scope="col">第二题</th><th scope="col">观察结果</th></tr></thead>' +
    '<tbody>' + rows.join('') + '</tbody></table></div>';
}

function readingRetestEvidence(student) {
  const reading = student.skills.read;
  const records = [
    ...reading.records.filter(record => record.independentCheck),
    ...(reading.draft?.records.filter(record => record.independentCheck) ?? []),
  ];

  if (!records.length) return '';

  const items = records.map(record => {
    const attempt = record.attempts[0];
    const source = record.adaptiveSource;
    return '<li><strong>' + esc(tagName(record.tag)) +
      ' · ' + (attempt.correct ? '独立答对' : '需继续巩固') +
      '</strong><br>分流依据：' + esc(source?.reason || '定向练习') +
      (source?.questionId ? ' · ' + esc(source.questionId) : '') +
      '<br>复测题：' + esc(record.prompt) +
      '<br>作答：' + esc(attempt.response) +
      ' · 参考：' + esc(record.expected) + '</li>';
  }).join('');

  return readingRetestComparison(student) + '<h3>阅读自适应与独立复测</h3><ul>' + items + '</ul>';
}

  function readingNextSteps(student, priorities) {
  if (student.grade !== 3 || student.term !== 'a') return '';

  const reading = student.skills.read;
  const latest = new Map();

  for (const record of [...reading.records, ...(reading.draft?.records ?? [])]) {
    const attempt = record.attempts?.[0];
    if (record.independentCheck && record.attempts?.length === 1 &&
        attempt?.hintLevel === 0 && typeof attempt.correct === 'boolean') {
      latest.set(record.tag, attempt.correct);
    }
  }

  const tags = new Set(
    priorities.filter(group => group.key.startsWith('read:'))
      .map(group => group.key.slice(5))
  );
  for (const tag of latest.keys()) tags.add(tag);
  if (!tags.size) return '';

  function rank(tag) {
    return latest.get(tag) === false ? 0 : latest.has(tag) ? 2 : 1;
  }

  const items = [...tags].sort((a, b) => rank(a) - rank(b)).map(tag => {
    const result = latest.get(tag);
    const action = result === false
      ? '复测仍错：核对原答，带学生定位原文证据，再用同知识点的新材料检查。'
      : result === true
        ? '复测已答对：暂缓重复补练，后续用另一篇短文复查。'
        : '尚未复测：完成该知识点的巩固，再安排一次无提示复测。';

    return '<li><strong>' + esc(tagName(tag)) + '</strong> · ' + action + '</li>';
  }).join('');

  return '<h3>阅读跟进建议</h3><ul>' + items + '</ul>';
}

function readingPracticeEvidence(student) {
  if (student.grade !== 3 || student.term !== 'a') return '';

  const reading = student.skills.read;
  const supportIds = new Set(
    C.get(student.grade, student.term).support.read.map(question => question.id)
  );
  const latest = new Map();

  for (const record of [...reading.records, ...(reading.draft?.records ?? [])]) {
    if (supportIds.has(record.questionId) && record.attempts?.length) {
      latest.set(record.questionId, record);
    }
  }

  if (!latest.size) return '';

  const items = [...latest.values()].map(record => {
    const attempts = record.attempts.map((attempt, index) =>
      '<li>第 ' + (index + 1) + ' 次 · ' + esc(attempt.response) + ' · ' +
      (attempt.correct ? '答对' : '答错') + ' · ' +
      (attempt.hintLevel ? 'H' + esc(attempt.hintLevel) : '无提示') + '</li>'
    ).join('');

    return '<details><summary>' + esc(tagName(record.tag)) + ' · ' +
      record.attempts.length + ' 次作答</summary><p>' + esc(record.prompt) +
      '</p><ol>' + attempts + '</ol><p>参考答案 ' + esc(record.expected) +
      '</p></details>';
  }).join('');

  return '<h3>定向巩固过程</h3><p>显示每道巩固题最近一次练习中的作答。</p>' + items;
}

function studentDiagnosis(student) {
    const { priorities, oral, oralGaps } = diagnostic(student);
    const oralSummary = oral
      ? `<p>最近 AI 口语测评 ${esc(oral.totalIndependentScore)} / 20 分${
          oralGaps.length ? ` · ${oralGaps.length} 题缺少独立评分证据` : ''
        }</p>` : '';

    const evidence = priorities.map(group => {
      const repeated = new Set(group.items.map(item => item.source)).size > 1;
      const count = repeated ? '练习和检测均出现' : `${group.items.length} 道错题`;
      const items = group.items.map(item =>
        `<li>${esc(item.source)} · ${esc(item.question)}
          <br>作答 ${esc(item.answer)} · 参考 ${esc(item.expected)}</li>`
      ).join('');

      return `<li><details>
        <summary>${esc(group.label)} · ${count}</summary>
        <p>建议先复习这一知识点，再用新题独立作答。</p><ul>${items}</ul>
      </details></li>`;
    }).join('');

    return `<section><h2>学生诊断</h2>${readingPracticeEvidence(student)}${readingNextSteps(student, priorities)}${oralSummary}
      ${evidence ? `<ol>${evidence}</ol>` : '<p>当前已记录的客观题中暂无错点。</p>'}
    </section>`;
  }

  function practiceReviewMarkup(record, index, lesson) {
    const question = lesson.speak[record.questionIndex];
    const source = record.policy === 3 ? '新版录音尝试' : '旧版播放确认记录，尚未核验';
    const country = record.countryCard
      ? `<p>复测身份卡 ${esc(record.countryCard)}。首次身份卡 ${esc(record.countryFirst?.countryCard)}，
          首次转写 ${esc(record.countryFirst?.transcript || '待确认')}。</p>` : '';
    const transcript = record.transcript
      ? `<p>机器识别（仅供参考） ${esc(record.transcript)}</p>` : '';

    return `<article class="feedback-row">
      <h3>任务 ${record.questionIndex + 1}：${esc(question.zh)}</h3>
      <p>${esc(question.q)}</p>
      <p>记录来源 ${source} · 提示级别 ${record.hintLevel || 0} · 声音检查 ${esc(record.audioEvidence?.signalStatus || '无旧版检查')}</p>
      ${country}${transcript}
      <audio id="practiceAudio${index}" controls></audio>
      <p id="practiceAudioStatus${index}"></p>
      ${field('practiceReviewer' + index, '评审人')}
      ${field('practiceHeard' + index, '实际听到了什么？', 'textarea')}
      ${field('practiceFeedback' + index, '给学生的具体反馈：哪里做到了，下一步怎么练？', 'textarea')}
      ${decision('practiceDecision' + index, '结合本年级与当前任务判断')}
      <button class="btn primary" id="practiceSave${index}" disabled>保存这轮评价</button>
      <p id="practiceStatus${index}" role="status"></p>
    </article>`;
  }

  function examReviewMarkup(result, lesson) {
    if (!result) {
      const archived = state.legacyAssessments?.length
        ? '<p>旧版未核验口语所关联的检测已归档保留，不再沿用其通过资格。</p>' : '';
      return `<section><h2>独立单元检测</h2>
        <p>尚无当前规则下完整提交的独立检测。完成四个学习板块后，学生可以提交单元检测。</p>
        ${archived}</section>`;
    }

    const status = {
      'pending-review': '待评审',
      'meets-goal': '已达标',
      'needs-review': '需要跟进',
    };

    return `<section>
      <h2>独立单元检测</h2>
      <p>听读写客观题 ${result.percent}% · 口语 ${esc(status[result.oralStatus])}
        · 独立书面表达 ${esc(status[result.writingStatus])}</p>
      <p>${esc(lesson.examForms[state.exam.form].oral)}</p>
      <audio id="examAudio" controls></audio>
      <p id="examAudioStatus"></p>
      ${field('examReviewer', '评审人')}
      ${decision('examOralDecision', '独立口语表现')}
      <blockquote>${esc(state.exam.writing?.text)}</blockquote>
      ${decision('examWritingDecision', '独立书面表达')}
      ${field('examRationale', '两项判断的具体依据和改进建议', 'textarea')}
      <button class="btn primary" id="examSave" disabled>保存独立检测评价</button>
      <p id="examStatus" role="status"></p>
    </section>`;
  }

  function bindPracticeReview(record, index, view, total) {
    const key = `practice:${record.clipId}`;
    attachAudio(`practiceAudio${index}`, `practiceAudioStatus${index}`, `practiceSave${index}`, record.clipId, key, view);

    $(`practiceSave${index}`).onclick = async () => {
      const status = $(`practiceStatus${index}`);
      try {
        if (!heard.has(key)) throw Error('请先听完这段录音。');
        await persist(student => E.reviewSpeaking(student, record.clipId, {
          listened: true,
          reviewer: $(`practiceReviewer${index}`).value.trim(),
          heardText: $(`practiceHeard${index}`).value.trim(),
          feedback: $(`practiceFeedback${index}`).value.trim(),
          decision: $(`practiceDecision${index}`).value,
        }));
        renderClassDashboard();
        status.textContent = `已保存。当前确认达到目标 ${E.speakingReport(state).met} / ${total} 轮。学生刷新后可查看反馈。`;
      } catch (error) {
        status.textContent = error.message;
      }
    };
  }

  function bindExamReview(view) {
    const examId = state.exam.id;
    const clipId = state.exam.oral.clipId;
    const key = `exam:${clipId}`;
    attachAudio('examAudio', 'examAudioStatus', 'examSave', clipId, key, view);

    $('examSave').onclick = async () => {
      const status = $('examStatus');
      try {
        if (!heard.has(key)) throw Error('请先听完检测录音。');
        await persist(student => {
          if (student.exam?.id !== examId || student.exam.oral?.clipId !== clipId) {
            throw Error('检测录音已变化，请重新读取。');
          }
          E.reviewOral(student, {
            listened: true,
            reviewer: $('examReviewer').value.trim(),
            decision: $('examOralDecision').value,
            writingDecision: $('examWritingDecision').value,
            rationale: $('examRationale').value.trim(),
          });
        });
        renderClassDashboard();
        status.textContent = E.result(state)?.passed
          ? '已保存，本次单元检测达到要求。'
          : '已保存，仍有项目需要巩固。';
      } catch (error) {
        status.textContent = error.message;
      }
    };
  }

  function show() {
    if (!authorized) return;
    clear();
    const view = epoch;

    try {
      renderClassDashboard();
      state = read();
      if (!state) {
        $('report').innerHTML = '<section><p>此学生在当前册次还没有记录。</p></section>';
        return;
      }

      const lesson = C.get(state.grade, state.term);
      const oral = E.speakingReport(state);
      const result = E.result(state);
      const practice = oral.records.map((record, index) =>
        practiceReviewMarkup(record, index, lesson)
      ).join('');
      const raw = JSON.stringify({
        grade: state.grade,
        term: state.term,
        skills: state.skills,
        exam: state.exam,
        legacyAssessments: state.legacyAssessments,
      }, null, 2);

      $('report').innerHTML = `
        ${studentDiagnosis(state)}${readingRetestEvidence(state)}
        ${aiOralEvidence()}
        <section>
          <h2>${esc(lesson.title)} · 学习证据</h2>
          <p>${esc(lesson.basis)}</p>
          ${stats()}
          <p>口语录音已提交 ${oral.submitted} / ${oral.total} 轮，
            已评价 ${oral.evaluated} 轮，确认达到目标 ${oral.met} 轮。</p>
        </section>
        <section>
          <h2>口语练习 · 逐轮评价</h2>
          <p>先听学生实际表达，接受合理的不同说法。记录具体依据和给学生的下一步建议。</p>
          ${practice || '<p>尚未提交一组口语尝试。</p>'}
        </section>
        ${examReviewMarkup(result, lesson)}
        <section><details><summary>逐题过程记录</summary><pre>${esc(raw)}</pre></details></section>`;

      oral.records.forEach((record, index) => bindPracticeReview(record, index, view, oral.total));
      if (result) bindExamReview(view);
    } catch (error) {
      $('report').textContent = '无法查看：' + error.message;
    }
  }

  $('report').insertAdjacentHTML('beforebegin', '<div id="classDashboard"></div>');
  $('loginButton').onclick = login;
  $('demoCode').onkeydown = event => {
    if (event.key === 'Enter') login();
  };
  $('learner').onchange = show;
  $('teacherGrade').onchange = show;
  $('teacherTerm').onchange = show;
  $('refresh').onclick = show;
  addEventListener('pagehide', clear);
})();