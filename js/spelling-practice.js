
/* ============================================
   AURA EDU V2.2
   STAGE 24.4
   ADAPTIVE SPELLING PRACTICE

   - Learner-bound adaptive practice
   - Diagnostic-driven question selection
   - Three levels of scaffolding
   - Attempt-level learning analytics
   - No Grammar/Diagnostic modifications
   - No mastery or unlock awards
============================================ */

(function () {
  "use strict";

  const ACTIVE_KEY = "aura_active_learner_id_v2";
  const PROFILES_KEY = "aura_learner_profiles_v2";
  const DIAG_KEY = "aura_spelling_diagnostic_records_v1";
  const PRACTICE_KEY = "aura_spelling_practice_records_v1";

  const $ = id => document.getElementById(id);

  const state = {
    learnerId: null,
    learnerName: null,
    diagnostic: null,
    questions: [],
    index: 0,
    records: [],
    attempts: [],
    hintLevel: 0,
    questionStart: 0,
    sessionId: null,
    startedAt: null,
    finished: false,
    answerAccepted: false,
    result: null
  };

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error("[Spelling Practice] Read:", error);
      return fallback;
    }
  }

  function activeId() {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      if (!raw) return null;
      if (raw.startsWith('"')) {
        const value = JSON.parse(raw);
        return typeof value === "string" ? value : null;
      }
      return raw;
    } catch (error) {
      return null;
    }
  }

  function findProfile(data, id) {
    if (!data || !id) return null;
    const seen = new Set();

    function search(value, depth, key) {
      if (!value || typeof value !== "object" ||
          depth > 5 || seen.has(value)) return null;

      seen.add(value);

      if (Array.isArray(value)) {
        for (const item of value) {
          const found = search(item, depth + 1, null);
          if (found) return found;
        }
        return null;
      }

      const profileId =
        value.id ?? value.learnerId ??
        value.learner_id ?? value.profileId ??
        value.profile_id;

      if (
        (profileId != null && String(profileId) === id) ||
        key === id
      ) return value;

      for (const [childKey, child] of Object.entries(value)) {
        if (child && typeof child === "object") {
          const found = search(child, depth + 1, childKey);
          if (found) return found;
        }
      }
      return null;
    }

    return search(data, 0, null);
  }

  function learnerName(id) {
    const profile = findProfile(
      readJSON(PROFILES_KEY, null), id
    );
    if (!profile) return null;

    return [
      profile.name,
      profile.displayName,
      profile.display_name,
      profile.learnerName,
      profile.studentName,
      profile.nickname,
      profile.nickName
    ].find(x => typeof x === "string" && x.trim())?.trim()
      || null;
  }

  function getLatestDiagnostic(id) {
    const sessions = readJSON(DIAG_KEY, []);
    if (!Array.isArray(sessions)) return null;

    const matching = sessions.filter(session =>
      session &&
      String(session.learnerId) === String(id) &&
      session.stage === "diagnostic" &&
      typeof session.completedAt === "string" &&
      Array.isArray(session.records) &&
      session.records.length === 8
    );

    matching.sort((a, b) =>
      String(b.completedAt).localeCompare(String(a.completedAt))
    );

    return matching[0] || null;
  }

  function refreshIntro() {
    if (state.startedAt) return;

    const id = activeId();
    state.learnerId = id;
    state.learnerName = id ? learnerName(id) : null;
    state.diagnostic = id ? getLatestDiagnostic(id) : null;

    $("learner-display").textContent = id
      ? "👤 " + (state.learnerName || "姓名未设置")
      : "👤 请先选择学生";

    $("start-btn").disabled = !id || !state.diagnostic;

    if (!id) {
      $("diagnostic-summary").textContent =
        "请先在 Learner Manager 选择学生。";
    } else if (!state.diagnostic) {
      $("diagnostic-summary").textContent =
        "当前学生没有完整的 Spelling Diagnostic 记录。请先完成诊断。";
    } else {
      const result = state.diagnostic.result || {};
      const overall = result.overall || {};
      $("diagnostic-summary").textContent =
        "Latest Diagnostic / 最近一次诊断\n" +
        "Score: " + (overall.correct ?? "—") +
        " / " + (overall.total ?? "—") + "\n" +
        "Completed: " + state.diagnostic.completedAt;
    }
  }

  function buildQuestions() {
    const model = window.AuraSpellingKnowledge;
    if (!model) throw new Error("Spelling Knowledge Model 未加载");

    const records = state.diagnostic.records;
    const valid = records.map(record => {
      const word = model.getWord(record.wordId);
      if (!word) return null;

      return {
        wordId: record.wordId,
        word: word.word,
        meaning: word.meaning,
        sentenceBlank: word.sentenceBlank,
        taskType: record.taskType,
        diagnosticCorrect: record.correct === true,
        diagnosticErrorCode: record.errorCode || "SP99",
        spellingErrorCode:
          record.spellingErrorCode || record.errorCode || "SP99"
      };
    }).filter(Boolean);

    // Prioritize words answered incorrectly in Diagnostic.
    const incorrect = valid.filter(q => !q.diagnosticCorrect);
    const correct = valid.filter(q => q.diagnosticCorrect);

    // If all were correct, offer four reinforcement questions.
    const selected = incorrect.length
      ? incorrect
      : correct.slice(0, 4);

    if (!selected.length) {
      throw new Error("诊断记录中没有可用的练习题。");
    }

    return selected.map((question, index) => ({
      ...question,
      questionId: "SP-P-" + (index + 1),
      sourceDiagnosticQuestionId:
        records.find(r =>
          r.wordId === question.wordId &&
          r.taskType === question.taskType
        )?.questionId || null
    }));
  }

  function checkIdentity() {
    if (activeId() === state.learnerId) return true;

    $("practice-message").textContent =
      "检测到学生身份已切换。本次练习已暂停，" +
      "请重新打开页面，以免记录混淆。";

    $("answer-input").disabled = true;
    $("check-btn").disabled = true;
    $("hint-btn").disabled = true;
    $("next-btn").disabled = true;

    return false;
  }

  function startPractice() {
    if (state.startedAt) return;

    refreshIntro();

    if (!state.learnerId || !state.diagnostic) {
      $("intro-message").textContent =
        "请先选择学生并完成 Spelling Diagnostic。";
      return;
    }

    try {
      state.questions = buildQuestions();
    } catch (error) {
      $("intro-message").textContent = error.message;
      return;
    }

    state.sessionId = "SPELLING-PRACTICE-" +
      Date.now() + "-" +
      Math.random().toString(36).slice(2, 9);

    state.startedAt = new Date().toISOString();
    state.index = 0;
    state.records = [];

    $("intro-panel").classList.add("hidden");
    $("practice-panel").classList.remove("hidden");

    showQuestion();
  }

  function showQuestion() {
    const q = state.questions[state.index];
    if (!q) return finishPractice();

    state.attempts = [];
    state.hintLevel = 0;
    state.answerAccepted = false;
    state.questionStart = performance.now();

    $("question-counter").textContent =
      "Question " + (state.index + 1) +
      " / " + state.questions.length;

    $("progress-fill").style.width =
      (state.index / state.questions.length * 100) + "%";

    $("question-type").textContent =
      q.taskType === "word"
        ? "WORD SPELLING / 单词拼写"
        : "SENTENCE APPLICATION / 句子填空";

    $("question-title").textContent =
      q.taskType === "word"
        ? "Write the English word for: " + q.meaning
        : "Complete the sentence.";

    $("question-context").textContent =
      q.taskType === "word"
        ? "中文词义：" + q.meaning
        : q.sentenceBlank + "\n目标词义：" + q.meaning;

    $("answer-input").value = "";
    $("answer-input").disabled = false;
    $("check-btn").disabled = false;
    $("hint-btn").disabled = false;
    $("hint-btn").textContent = "💡 Hint 1";
    $("next-btn").classList.add("hidden");
    $("hint-output").textContent = "";
    $("feedback-output").textContent = "";
    $("feedback-output").classList.remove("error");
    $("practice-message").textContent = "";
    $("answer-input").focus();
  }

  function getHint(q, level) {
    const word = q.word;
    const code = q.spellingErrorCode;

    if (level === 1) {
      const guidance = {
        SP01: "Check whether a letter is missing.",
        SP02: "Check whether you added an extra letter.",
        SP03: "Look carefully at each letter.",
        SP04: "Check the order of the letters.",
        SP05: "Read the sentence and think about the missing word.",
        SP99: "Think about the word's spelling and meaning."
      };

      return "Hint 1 · " +
        (guidance[code] || guidance.SP99);
    }

    if (level === 2) {
      const first = word.charAt(0).toUpperCase();
      const last = word.charAt(word.length - 1);

      return "Hint 2 · The word has " + word.length +
        " letters. It begins with " + first +
        " and ends with " + last + ".";
    }

    return "Hint 3 · Study this example: " +
      word + ". Now try writing it yourself.";
  }

  function requestHint() {
    if (!checkIdentity() || state.answerAccepted) return;

    const q = state.questions[state.index];
    if (!q || state.hintLevel >= 3) return;

    state.hintLevel += 1;

    $("hint-output").textContent =
      getHint(q, state.hintLevel);

    $("hint-btn").textContent =
      state.hintLevel < 3
        ? "💡 Hint " + (state.hintLevel + 1)
        : "All Hints Used";

    $("hint-btn").disabled = state.hintLevel >= 3;
  }

  function evaluateAnswer(q, answer) {
    const model = window.AuraSpellingKnowledge;

    return q.taskType === "word"
      ? model.analyzeWord(answer, q.word)
      : model.analyzeSentenceBlank(answer, q.word);
  }

  function checkAnswer() {
    if (!checkIdentity() || state.answerAccepted) return;

    const q = state.questions[state.index];
    if (!q) return;

    const answer = $("answer-input").value.trim();

    if (!answer) {
      $("practice-message").textContent =
        "请输入答案后再检查。";
      return;
    }

    const analysis = evaluateAnswer(q, answer);

    const attempt = {
      attemptNumber: state.attempts.length + 1,
      answer,
      correct: analysis.correct,
      errorCode: analysis.errorCode,
      spellingErrorCode:
        analysis.spellingErrorCode || analysis.errorCode,
      hintLevelAtAttempt: state.hintLevel,
      elapsedTimeMs: Math.round(
        performance.now() - state.questionStart
      ),
      submittedAt: new Date().toISOString()
    };

    state.attempts.push(attempt);

    $("practice-message").textContent = "";

    if (analysis.correct) {
      state.answerAccepted = true;

      $("feedback-output").classList.remove("error");
      $("feedback-output").textContent =
        "✓ Correct! You revised the word successfully.\n" +
        "Attempts: " + state.attempts.length +
        " · Highest Hint: " + state.hintLevel;

      $("answer-input").disabled = true;
      $("check-btn").disabled = true;
      $("hint-btn").disabled = true;
      $("next-btn").classList.remove("hidden");

      saveQuestionRecord(q, true);
      return;
    }

    $("feedback-output").classList.add("error");

    const code =
      analysis.spellingErrorCode || analysis.errorCode;

    $("feedback-output").textContent =
      "Not quite yet. Try again!\n" +
      "Detected spelling pattern: " + code + "\n" +
      "Attempts: " + state.attempts.length +
      "\nYou may revise your answer or request a hint.";

    // Limit attempts to prevent endless blocking.
    if (state.attempts.length >= 4) {
      state.answerAccepted = true;

      $("feedback-output").textContent +=
        "\nPractice paused after four attempts.\n" +
        "Review word: " + q.word +
        "\nYou can continue to the next question.";

      $("answer-input").disabled = true;
      $("check-btn").disabled = true;
      $("hint-btn").disabled = true;
      $("next-btn").classList.remove("hidden");

      saveQuestionRecord(q, false);
    }
  }

  function saveQuestionRecord(q, eventuallyCorrect) {
    const first = state.attempts[0];

    state.records.push({
      questionId: q.questionId,
      sourceDiagnosticQuestionId:
        q.sourceDiagnosticQuestionId,
      wordId: q.wordId,
      taskType: q.taskType,
      target: q.word,
      diagnosticCorrect: q.diagnosticCorrect,
      diagnosticErrorCode: q.diagnosticErrorCode,
      firstAttemptCorrect: first?.correct === true,
      eventuallyCorrect,
      highestHintUsed: state.hintLevel,
      attemptCount: state.attempts.length,
      attempts: state.attempts.map(a => ({ ...a })),
      totalTimeMs: Math.round(
        performance.now() - state.questionStart
      )
    });
  }

  function nextQuestion() {
    if (!state.answerAccepted || !checkIdentity()) return;

    state.index += 1;

    if (state.index >= state.questions.length) {
      finishPractice();
    } else {
      showQuestion();
    }
  }

  function calculateResult() {
    const records = state.records;
    const total = records.length;

    const firstCorrect = records.filter(
      r => r.firstAttemptCorrect
    ).length;

    const eventualCorrect = records.filter(
      r => r.eventuallyCorrect
    ).length;

    const withHints = records.filter(
      r => r.highestHintUsed > 0
    ).length;

    const errorSummary = {};

    records.forEach(record => {
      record.attempts.forEach(attempt => {
        if (!attempt.correct) {
          const code =
            attempt.spellingErrorCode || attempt.errorCode;
          errorSummary[code] =
            (errorSummary[code] || 0) + 1;
        }
      });
    });

    return {
      total,
      firstAttemptCorrect: firstCorrect,
      firstAttemptPercent: total
        ? Math.round(firstCorrect / total * 100)
        : 0,
      eventuallyCorrect: eventualCorrect,
      eventuallyCorrectPercent: total
        ? Math.round(eventualCorrect / total * 100)
        : 0,
      questionsUsingHints: withHints,
      highestHintLevel: Math.max(
        0, ...records.map(r => r.highestHintUsed)
      ),
      totalAttempts: records.reduce(
        (sum, r) => sum + r.attemptCount, 0
      ),
      totalTimeMs: records.reduce(
        (sum, r) => sum + r.totalTimeMs, 0
      ),
      errorSummary
    };
  }

  function persistSession(session) {
    try {
      const raw = localStorage.getItem(PRACTICE_KEY);
      const existing = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(existing)) {
        throw new Error("历史练习记录格式不正确");
      }

      if (activeId() !== state.learnerId) {
        throw new Error("学生身份已变化，停止保存");
      }

      localStorage.setItem(
        PRACTICE_KEY,
        JSON.stringify([...existing, session])
      );

      return { ok: true, message: "✓ Practice record saved." };
    } catch (error) {
      return {
        ok: false,
        message: "保存失败，请复制 JSON 备份：" + error.message
      };
    }
  }

  function finishPractice() {
    if (state.finished) return;
    state.finished = true;

    const session = {
      schemaVersion: "1.0",
      moduleId: "SPELLING",
      stage: "practice",
      sessionId: state.sessionId,
      learnerId: state.learnerId,
      learnerName: state.learnerName,
      sourceDiagnosticSessionId:
        state.diagnostic.sessionId,
      startedAt: state.startedAt,
      completedAt: new Date().toISOString(),
      records: state.records,
      result: calculateResult(),
      masteryState: "NOT_EVALUATED",
      independentReassessmentCompleted: false,
      spellingUnlockChanged: false,
      speakingUnlockChanged: false
    };

    state.result = session;

    const saved = persistSession(session);

    $("practice-panel").classList.add("hidden");
    $("result-panel").classList.remove("hidden");

    renderResults(session, saved);
  }

  function addText(parent, tag, text, className) {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    parent.appendChild(node);
    return node;
  }

  function renderResults(session, saved) {
    const r = session.result;
    const summary = $("result-summary");
    const details = $("result-details");

    summary.replaceChildren();
    details.replaceChildren();

    addText(
      summary, "p",
      "First Attempt: " + r.firstAttemptCorrect +
      "/" + r.total + " (" + r.firstAttemptPercent + "%)"
    );

    addText(
      summary, "p",
      "Eventually Correct: " + r.eventuallyCorrect +
      "/" + r.total
    );

    addText(
      summary, "p",
      "Total Attempts: " + r.totalAttempts +
      " · Questions Using Hints: " + r.questionsUsingHints +
      " · Highest Hint: " + r.highestHintLevel
    );

    addText(summary, "p", saved.message);

    session.records.forEach((record, i) => {
      const row = addText(
        details, "div",
        "Q" + (i + 1) + " · " + record.target +
        "\nFirst Attempt: " +
        (record.firstAttemptCorrect ? "Correct" : "Incorrect") +
        " · Eventually Correct: " +
        (record.eventuallyCorrect ? "Yes" : "No") +
        "\nAttempts: " + record.attemptCount +
        " · Highest Hint: " + record.highestHintUsed,
        "result-row"
      );

      row.style.whiteSpace = "pre-line";
    });

    addText(
      details, "p",
      "练习表现只说明本次学习过程，" +
      "不能代替后续无提示独立复测。",
      "small"
    );
  }

  async function copyJSON() {
    if (!state.result) return;

    const text = JSON.stringify(state.result, null, 2);

    try {
      await navigator.clipboard.writeText(text);
      $("result-message").textContent = "✓ JSON 已复制。";
    } catch (error) {
      let area = $("json-fallback");

      if (!area) {
        area = document.createElement("textarea");
        area.id = "json-fallback";
        area.style.width = "100%";
        area.style.height = "180px";
        $("result-panel").appendChild(area);
      }

      area.value = text;
      area.focus();
      area.select();

      $("result-message").textContent =
        "自动复制失败，请手动复制下方 JSON。";
    }
  }

  function initialize() {
    refreshIntro();

    $("start-btn").addEventListener("click", startPractice);
    $("check-btn").addEventListener("click", checkAnswer);
    $("hint-btn").addEventListener("click", requestHint);
    $("next-btn").addEventListener("click", nextQuestion);
    $("copy-btn").addEventListener("click", copyJSON);

    $("answer-input").addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (!state.answerAccepted) checkAnswer();
      }
    });

    window.addEventListener("focus", refreshIntro);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshIntro();
    });

    console.info("[AURA Spelling] Adaptive Practice Ready");
  }

  window.AuraSpellingPractice = Object.freeze({
    version: "1.0",
    getCurrentResult: () => state.result
      ? JSON.parse(JSON.stringify(state.result))
      : null
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded", initialize, { once: true }
    );
  } else {
    initialize();
  }
})();
