(function (root) {
  'use strict';

  const C = root.UnitContent;
  const IDS = C.skills.map(skill => skill.id);
  const STAGES = ['listen', 'read', 'write'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();

  function uid() {
    return root.crypto?.randomUUID?.() ||
      Date.now() + '-' + Math.random().toString(36).slice(2);
  }

  function normal(value) {
    return String(value ?? '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[’]/g, "'")
      .replace(/[.,!?。！？]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function empty(id, grade, term = 'a') {
    if (!id || !C.get(grade, term)) throw Error('请选择学习身份和年级。');

    return {
      schema: 1,
      feedbackPolicy: 3,
      contentVersion: C.version,
      learnerId: id,
      grade: Number(grade),
      term,
      unit: 1,
      revision: 0,
      skills: Object.fromEntries(IDS.map(skill => [
        skill, { done: false, records: [], draft: null, finishedAt: null },
      ])),
      exam: null,
      artifacts: [],
      restEvents: [],
      partner: 'Leo',
      effects: true,
    };
  }

  function validate(d, id, grade, term = 'a') {
    if (!d || d.schema !== 1 || d.contentVersion !== C.version ||
        d.learnerId !== id || d.grade !== Number(grade) || d.term !== term ||
        d.unit !== 1 || !Number.isInteger(d.revision) || !d.skills ||
        IDS.some(skill => !d.skills[skill] || !Array.isArray(d.skills[skill].records)) ||
        !Array.isArray(d.artifacts) || !Array.isArray(d.restEvents)) {
      throw Error('学习记录无法安全读取，原记录没有被覆盖。请联系老师。');
    }

    if (d.feedbackPolicy !== 3) {
      const speaking = d.skills.speak;
      if (!speakingReport(d).complete) {
        speaking.legacyFinishedAt = speaking.finishedAt;
        speaking.done = false;
        speaking.finishedAt = null;
        if (d.exam) {
          d.legacyAssessments = d.legacyAssessments || [];
          d.legacyAssessments.push({ reason: '旧版口语完成未核验', exam: clone(d.exam) });
          d.exam = null;
        }
      }
      d.feedbackPolicy = 3;
    }

    return d;
  }

  function questions(grade, skill, exam = false, term = 'a', form = 0) {
    const lesson = C.get(grade, term);
    if (!lesson) throw Error('未知册次');
    if (!exam) return clone(lesson[skill] || []);

    const examForm = lesson.examForms[form];
    if (!examForm) throw Error('检测卷不存在');
    return STAGES.flatMap(key => examForm[key].map((question, index) => ({
      ...clone(question),
      skill: key,
      audio: key === 'listen' ? examForm.audio[index] : null,
    })));
  }

  const readingChecks = [
    [
      'introduce',
      'Hello! My name is Ben. This is my friend Amy.',
      '谁在介绍自己？',
      'Ben',
      ['Amy', 'Ben', 'Leo'],
    ],
    [
      'friend',
      'I am Amy. Ben is my friend. Leo is my teacher.',
      '谁是 Amy 的朋友？',
      'Ben',
      ['Leo', 'Amy', 'Ben'],
    ],
    [
      'friend-action',
      'Amy and Ben are friends. Amy helps Ben. Ben shares his book.',
      'Ben 怎样和朋友相处？',
      '分享他的书',
      ['分享他的书', '向朋友道谢', '介绍自己的名字'],
    ],
    [
      'thanks',
      'Ben helps Amy. Amy says, “Thank you, Ben.”',
      '谁表达了感谢？',
      'Amy',
      ['Ben', 'Amy', 'Leo'],
    ],
  ].map(([tag, passage, prompt, answer, options]) => ({
    id: '3a-reading-check-' + tag,
    tag,
    passage,
    prompt,
    answer,
    options,
    readTitle: '独立阅读复测',
    independentCheck: true,
  }));

  readingChecks.push(...[
  ['introduce',
   'Hi! My name is Luna. This is my friend Leo.',
   '谁说出了自己的名字？', 'Luna', ['Leo', 'Ben', 'Luna']],
  ['friend',
   'I am Leo. Luna is my friend. Ben is my brother.',
   '谁是 Leo 的朋友？', 'Luna', ['Luna', 'Ben', 'Leo']],
  ['friend-action',
   'Luna and Leo are friends. Leo shares his book. Luna helps Leo.',
   'Luna 做了什么？', '帮助 Leo', ['分享书', '帮助 Leo', '向 Leo 道谢']],
  ['thanks',
   'Luna helps Leo. Leo says, “Thank you, Luna.”',
   '谁说了谢谢？', 'Leo', ['Luna', 'Leo', 'Ben']],
].map(([tag, passage, prompt, answer, options]) => ({
  id: '3a-reading-check-' + tag + '-b',
  tag,
  passage,
  prompt,
  answer,
  options,
  readTitle: '独立阅读复测',
  independentCheck: true,
})));

function readingCheck(d, skill, tag) {
  if (d.grade !== 3 || d.term !== 'a' || skill !== 'read') return undefined;
  const used = new Set(d.skills.read.records.map(record => record.questionId));
  return readingChecks.find(question => question.tag === tag && !used.has(question.id));
}

function readingReviewStatus(d, skill, tag) {
  if (d.grade !== 3 || d.term !== 'a' || skill !== 'read') return null;

  const checks = readingChecks.filter(question => question.tag === tag);
  if (!checks.length) return null;

  const ids = new Set(checks.map(question => question.id));
  const completed = new Set(
    d.skills.read.records
      .filter(record => ids.has(record.questionId) && record.independentCheck)
      .map(record => record.questionId)
  );

  return { completed: completed.size, total: checks.length };
}

function pool(d, skill) {
    const lesson = C.get(d.grade, d.term);
    const checks = d.grade === 3 && d.term === 'a' && skill === 'read'
      ? clone(readingChecks)
      : [];
    return [
      ...questions(d.grade, skill, false, d.term),
      ...clone(lesson.support[skill] || []),
      ...checks,
    ];
  }

  function sessionQuestions(d, skill) {
    const draft = d.skills[skill].draft;
    if (!draft?.queue) return questions(d.grade, skill, false, d.term);

    const byId = new Map(pool(d, skill).map(question => [question.id, question]));
    return draft.queue.map(id => {
      if (!byId.has(id)) throw Error('题目版本已变化');
      return byId.get(id);
    });
  }

  function startSkill(d, skill, tag = null, source = null) {
    if (!IDS.includes(skill)) throw Error('未知学习板块');
    const state = d.skills[skill];

    if (!state.draft) {
      const items = tag
        ? clone(C.get(d.grade, d.term).support[skill]).filter(question => question.tag === tag)
        : questions(d.grade, skill, false, d.term);
      state.draft = {
        id: uid(),
        index: 0,
        records: [],
        hint: 0,
        attempts: [],
        answered: false,
        startedAt: now(),
        audioPlayed: false,
        queue: items.map(question => question.id),
        reviewOnly: Boolean(tag),
      };
    }

    const draft = state.draft;
    const check = readingCheck(d, skill, tag);
    if (check && draft.reviewOnly && !draft.adaptiveSource &&
        draft.index === 0 && !draft.attempts.length &&
        !draft.queue.includes(check.id) &&
        !state.records.some(record => record.questionId === check.id)) {
      draft.queue.push(check.id);
      draft.adaptiveSource = source;
    }

    if (!draft.queue.length) throw Error('这个知识点暂无练习题');
    return draft;
  }

  function hint(d, skill) {
    const draft = d.skills[skill].draft;
    if (!draft || draft.answered || sessionQuestions(d, skill)[draft.index]?.independentCheck) {
      return null;
    }
    draft.hint = Math.min(3, draft.hint + 1);
    return draft.hint;
  }

  function answer(d, skill, response) {
    if (!STAGES.includes(skill)) throw Error('口语不能用文字作答替代录音。');

    const draft = d.skills[skill].draft;
    const question = sessionQuestions(d, skill)[draft?.index];
    if (!draft || !question || draft.answered) throw Error('当前题目已记录或不存在。');
    if (!String(response).trim()) throw Error('先完成回答吧。');
    if (skill === 'listen' && !draft.audioPlayed) throw Error('先点播放，听一听再回答。');

    const correct = normal(response) === normal(question.answer);

    if (question.independentCheck) {
      draft.records.push({
        questionId: question.id,
        tag: question.tag,
        prompt: question.prompt,
        expected: question.answer,
        passage: question.passage,
        attempts: [{ response: String(response), correct, hintLevel: 0, at: now() }],
        independentCheck: true,
        adaptiveSource: draft.adaptiveSources?.[question.tag] ?? draft.adaptiveSource,
        at: now(),
      });
      draft.answered = true;
      return { correct, submitted: true };
    }

    draft.attempts.push({ response: String(response), correct, hintLevel: draft.hint, at: now() });
    if (!correct && draft.attempts.length >= 2) draft.hint = Math.max(1, draft.hint);

    if (correct) {
      if (draft.attempts.some(attempt => !attempt.correct) &&
          !draft.reviewOnly && draft.queue.length < 12) {
        const candidate = C.get(d.grade, d.term).support[skill].find(item =>
          item.tag === question.tag && !draft.queue.includes(item.id)
        );
        if (candidate) {
          draft.queue.push(candidate.id);
          const check = readingCheck(d, skill, question.tag);
          if (check && !draft.queue.includes(check.id) &&
              !d.skills[skill].records.some(record => record.questionId === check.id)) {
            draft.queue.push(check.id);
            (draft.adaptiveSources ??= {})[question.tag] = {
              questionId: question.id,
              reason: '核心练习作答错误',
            };
          }
        }
      }

      draft.records.push({
        questionId: question.id,
        tag: question.tag,
        prompt: question.prompt,
        expected: question.answer,
        attempts: clone(draft.attempts),
        firstAttemptCorrect: draft.attempts[0].correct,
        highestHint: draft.hint,
        audioPlayed: draft.audioPlayed,
        at: now(),
      });
      draft.answered = true;
    }

    return { correct, hint: draft.hint };
  }

  function next(d, skill) {
    const state = d.skills[skill];
    const draft = state.draft;
    if (!draft?.answered) throw Error('先完成这一题。');

    if (draft.index + 1 < sessionQuestions(d, skill).length) {
      draft.index++;
      draft.hint = 0;
      draft.response = '';
      draft.attempts = [];
      draft.answered = false;
      draft.audioPlayed = false;
      return false;
    }

    state.records.push(...draft.records);
    state[draft.reviewOnly ? 'lastSupportSession' : 'lastSession'] = {
      id: draft.id,
      records: clone(draft.records),
      finishedAt: now(),
      reviewOnly: Boolean(draft.reviewOnly),
    };

    if (!draft.reviewOnly) {
      state.done = true;
      state.finishedAt = now();
    }

    state.draft = null;
    return true;
  }

  function finishSpeaking(d, clips) {
    const lesson = C.get(d.grade, d.term);
    const total = lesson.speak.length;

    if (!Array.isArray(clips) || clips.length !== total ||
        new Set(clips.map(clip => clip?.clipId)).size !== total ||
        clips.some((clip, index) =>
          !clip?.clipId || clip.questionIndex !== index || clip.listened !== true ||
          clip.confirmed !== true ||
          !['detected', 'unavailable'].includes(clip.audioEvidence?.signalStatus)
        )) {
      throw Error('请逐轮录音并播放检查。静音或旧版缺少声音检查的录音需重新录制；不计为答错。');
    }

    const state = d.skills.speak;
    state.records.push(...clips.map(clip => ({
      ...clone(clip),
      prompt: lesson.speak[clip.questionIndex].q,
      evidenceKind: 'speaking-awaiting-review',
      automaticScore: null,
      policy: 3,
      at: now(),
    })));
    state.done = false;
    state.finishedAt = null;
    state.pendingAt = now();
    state.draft = null;
    return speakingReport(d);
  }

  function speakingReport(d) {
    const prompts = C.get(d.grade, d.term).speak;
    const total = prompts.length;
    const latest = new Map();

    for (const record of d.skills.speak.records || []) {
      if (record.clipId && Number.isInteger(record.questionIndex) &&
          record.questionIndex >= 0 && record.questionIndex < total) {
        latest.set(record.questionIndex, record);
      }
    }

    const records = [...latest.values()].sort((a, b) => a.questionIndex - b.questionIndex);
    const evaluated = records.filter(record => {
      const review = record.review;
      return Boolean(
        review?.policy === 3 && review.clipId === record.clipId &&
        review.questionIndex === record.questionIndex && review.learnerId === d.learnerId &&
        review.grade === d.grade && review.term === d.term &&
        review.prompt === prompts[record.questionIndex].q &&
        review.listened === true && review.reviewer?.trim() &&
        review.heardText?.trim() && review.feedback?.trim()
      );
    });
    const met = evaluated.filter(record => record.review.decision === 'meets-goal');

    return {
      total,
      submitted: records.length,
      evaluated: evaluated.length,
      met: met.length,
      pending: records.length - evaluated.length,
      needsSupport: evaluated.length - met.length,
      complete: met.length === total,
      records,
    };
  }

  function reviewSpeaking(d, clipId, review) {
    const state = d.skills.speak;
    const record = [...state.records].reverse().find(item => item.clipId === clipId);

    if (!record || !Number.isInteger(record.questionIndex) || !review.listened ||
        !review.reviewer?.trim() || !review.heardText?.trim() ||
        !review.feedback?.trim() || !['meets-goal', 'needs-support'].includes(review.decision)) {
      throw Error('请听对应录音，填写听到的表达、具体反馈、评审人和结论。');
    }

    if (review.decision === 'meets-goal' && record.audioEvidence?.signalStatus === 'quiet') {
      throw Error('此录音标记为静音，不能确认达到口语目标。');
    }

    record.review = {
      ...clone(review),
      policy: 3,
      clipId,
      questionIndex: record.questionIndex,
      learnerId: d.learnerId,
      grade: d.grade,
      term: d.term,
      prompt: C.get(d.grade, d.term).speak[record.questionIndex].q,
      at: now(),
    };
    const report = speakingReport(d);
    state.done = report.complete;
    state.finishedAt = report.complete ? now() : null;
    return report;
  }

  function skillReport(d, skill) {
    if (skill === 'speak') return speakingReport(d);

    const state = d.skills[skill];
    const draft = state.draft && !state.draft.reviewOnly ? state.draft : null;
    const rows = clone(draft ? draft.records : state.lastSession?.records || state.records);

    if (draft?.attempts?.length && !draft.answered) {
      const question = sessionQuestions(d, skill)[draft.index];
      rows.push({
        questionId: question.id,
        tag: question.tag,
        prompt: question.prompt,
        expected: question.answer,
        attempts: clone(draft.attempts),
        highestHint: draft.hint,
      });
    }

    const core = questions(d.grade, skill, false, d.term);
    const ids = new Set(core.map(question => question.id));
    const byId = new Map();
    for (const record of rows) {
      if (ids.has(record.questionId) && record.attempts?.length && !byId.has(record.questionId)) {
        byId.set(record.questionId, record);
      }
    }

    const records = [...byId.values()];
    const firstCorrect = records.filter(record => record.attempts[0].correct).length;
    const independent = records.filter(record =>
      record.attempts[0].correct && record.attempts[0].hintLevel === 0
    ).length;

    return {
      total: core.length,
      answered: records.length,
      firstCorrect,
      independent,
      accuracy: records.length ? Math.round(firstCorrect / records.length * 1000) / 10 : null,
      hinted: records.filter(record =>
        record.highestHint > 0 || record.attempts.some(attempt => attempt.hintLevel > 0)
      ).length,
      corrected: records.filter(record =>
        !record.attempts[0].correct && record.attempts.at(-1).correct
      ).length,
      supportCount: rows.filter(record => !ids.has(record.questionId)).length,
      records,
      scope: draft ? '本轮进行中'
        : state.lastSession ? '最近一轮核心练习' : '已有核心练习（历史题目去重）',
    };
  }

  function completedAiSpeaking(d) {
    const unitId = 'pep-g' + d.grade + '-' + d.term + '-unit' + d.unit;

    return (d.skills.speak.aiAssessments ?? []).find(attempt =>
      attempt.studentId === d.learnerId && attempt.unitId === unitId &&
      attempt.passed !== false && attempt.noIndependentEvidenceCount === 0 &&
      attempt.taskFeedbacks?.length === 4 &&
      attempt.taskFeedbacks.every(task => task.hasIndependentEvidence === true)
    ) ?? null;
  }

  function learningComplete(d, skill) {
    if (skill === 'speak') return Boolean(completedAiSpeaking(d)) || speakingReport(d).complete;

    const state = d.skills[skill];
    if (!state?.done || !state.finishedAt) return false;

    return questions(d.grade, skill, false, d.term).every(question =>
      state.records.some(record =>
        record.questionId === question.id && record.expected === question.answer &&
        Array.isArray(record.attempts) && record.attempts.length &&
        normal(record.attempts.at(-1).response) === normal(question.answer) &&
        record.attempts.at(-1).correct === true &&
        record.firstAttemptCorrect === record.attempts[0].correct &&
        (skill !== 'listen' || record.audioPlayed === true)
      )
    );
  }

  function ready(d) {
    return IDS.every(skill => learningComplete(d, skill));
  }

  function startExam(d) {
    if (!ready(d)) throw Error('先完成本单元四项学习，再开始检测。');
    if (d.exam && !d.exam.completedAt) return d.exam;

    d.exam = {
      id: uid(),
      contentVersion: C.version,
      grade: d.grade,
      term: d.term,
      form: (d.examHistory?.length || 0) % 2,
      unit: 1,
      learnerId: d.learnerId,
      startedAt: now(),
      completedAt: null,
      index: 0,
      records: [],
      audioPlayed: false,
      oral: null,
      oralReview: null,
    };
    return d.exam;
  }

  function examAnswer(d, response) {
    const exam = d.exam;
    const items = questions(d.grade, null, true, d.term, exam?.form || 0);
    const question = items[exam?.index];

    if (!exam || exam.completedAt || !question) throw Error('当前检测不可作答。');
    if (!String(response).trim()) throw Error('请先回答。');
    if (question.skill === 'listen' && !exam.audioPlayed) throw Error('请先听录音。');
    if (exam.records.some(record => record.questionId === question.id)) {
      throw Error('这道题已经提交。');
    }

    exam.records.push({
      questionId: question.id,
      skill: question.skill,
      tag: question.tag,
      response: String(response),
      expected: question.answer,
      correct: normal(response) === normal(question.answer),
      hintLevel: 0,
      audioPlayed: exam.audioPlayed,
      at: now(),
    });
    exam.index++;
    exam.audioPlayed = false;
    return exam.index === items.length;
  }

  function finishExam(d, clip) {
    const exam = d.exam;

    if (!exam || exam.completedAt ||
        exam.index !== questions(d.grade, null, true, d.term, exam?.form || 0).length) {
      throw Error('请完成全部检测题目。');
    }
    if (clip?.audioEvidence?.signalStatus === 'quiet') {
      throw Error('这段录音未检测到清晰声音，请重录；不计为语言错误。');
    }
    if (!clip?.clipId || !clip.listened || !clip.confirmed) {
      throw Error('请录音并播放确认后提交。');
    }
    if (!exam.writingDraft?.trim()) throw Error('请完成独立书面表达，老师会结合年级目标查看。');

    exam.writing = {
      text: exam.writingDraft.trim(),
      evidenceKind: 'independent-writing-awaiting-human-review',
      automaticScore: null,
    };
    exam.oral = {
      ...clone(clip),
      evidenceKind: 'independent-speaking-awaiting-human-review',
      automaticScore: null,
    };
    exam.completedAt = now();
    return result(d);
  }

  function result(d) {
    const exam = d.exam;
    if (!exam?.completedAt || !ready(d)) return null;

    const items = questions(d.grade, null, true, d.term, exam.form || 0);
    if (exam.learnerId !== d.learnerId || exam.grade !== d.grade ||
        exam.term !== d.term || exam.contentVersion !== C.version ||
        exam.records.length !== items.length || !exam.oral?.clipId ||
        !exam.oral.listened || !exam.oral.confirmed) return null;

    for (let index = 0; index < items.length; index++) {
      const question = items[index];
      const record = exam.records[index];
      if (!record || record.questionId !== question.id || record.hintLevel !== 0 ||
          record.expected !== question.answer ||
          record.correct !== (normal(record.response) === normal(question.answer)) ||
          (question.skill === 'listen' && !record.audioPlayed)) return null;
    }

    const scores = Object.fromEntries(STAGES.map(skill => {
      const records = exam.records.filter(record => record.skill === skill);
      const correct = records.filter(record => record.correct).length;
      return [skill, {
        correct,
        total: records.length,
        percent: Math.round(correct / records.length * 100),
      }];
    }));
    const percent = Math.round(
      exam.records.filter(record => record.correct).length / exam.records.length * 100
    );
    const review = exam.oralReview;
    const oralPassed = review?.examId === exam.id && review?.clipId === exam.oral.clipId &&
      review?.decision === 'meets-goal' && review?.listened === true &&
      typeof review.reviewer === 'string' && review.reviewer.trim() && review.rationale?.trim();
    const writingPassed = review?.writingDecision === 'meets-goal' &&
      review?.writingText === exam.writing?.text && exam.writing?.text?.trim();
    const objectivePassed = percent >= 80 && STAGES.every(skill => scores[skill].percent >= 75);

    return {
      scores,
      percent,
      objectivePassed,
      oralStatus: review ? (oralPassed ? 'meets-goal' : 'needs-review') : 'pending-review',
      writingStatus: review ? (writingPassed ? 'meets-goal' : 'needs-review') : 'pending-review',
      passed: Boolean(objectivePassed && oralPassed && writingPassed),
      weaknesses: exam.records.filter(record => !record.correct).map(record => ({
        skill: record.skill,
        tag: record.tag,
        sourceQuestionId: record.questionId,
      })),
    };
  }

  function reviewOral(d, review) {
    if (!d.exam?.completedAt || !d.exam.oral) throw Error('没有已提交的口语检测。');

    if (!review.listened || !review.reviewer?.trim() || !review.rationale?.trim() ||
        !['meets-goal', 'needs-support'].includes(review.decision) ||
        !['meets-goal', 'needs-support'].includes(review.writingDecision)) {
      throw Error('请播放录音，填写评审姓名、口语和书面表达两项结论及具体依据。');
    }

    d.exam.oralReview = {
      ...clone(review),
      examId: d.exam.id,
      clipId: d.exam.oral.clipId,
      writingText: d.exam.writing.text,
      at: now(),
      mode: 'human-demo-review',
    };
    return result(d);
  }

  function progress(d) {
    return IDS.filter(skill => learningComplete(d, skill)).length;
  }

  function wrongs(d) {
    const records = IDS.flatMap(skill => d.skills[skill].records.map(record => ({
      ...record,
      skill,
    }))).filter(record => record.firstAttemptCorrect === false);
    return [...new Map(records.map(record => [record.skill + ':' + record.tag, record])).values()];
  }

  function key(id, grade, term = 'a') {
    return 'aura_unit_bank_v2_' + encodeURIComponent(id) + '_g' + grade + '_' + term + '_u1';
  }

  root.UnitEngine = Object.freeze({ readingReviewStatus,
    IDS,
    STAGES,
    clone,
    uid,
    normal,
    empty,
    validate,
    questions,
    sessionQuestions,
    startSkill,
    hint,
    answer,
    next,
    finishSpeaking,
    speakingReport,
    reviewSpeaking,
    skillReport,
    completedAiSpeaking,
    learningComplete,
    ready,
    startExam,
    examAnswer,
    finishExam,
    result,
    reviewOral,
    progress,
    wrongs,
    key,
  });
})(typeof window === 'undefined' ? globalThis : window);