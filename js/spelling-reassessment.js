
/* ============================================
   AURA EDU V2.2
   STAGE 24.5

   INDEPENDENT SPELLING REASSESSMENT

   - Learner-bound sessions
   - Diagnostic/practice linkage
   - 8 independent questions
   - No hints
   - One submission per question
   - Question-level evidence
   - Descriptive score comparison
   - No automatic mastery/unlock

   Version: 1.0
============================================ */

(function () {
  "use strict";

  const ACTIVE_KEY =
    "aura_active_learner_id_v2";

  const PROFILES_KEY =
    "aura_learner_profiles_v2";

  const DIAG_KEY =
    "aura_spelling_diagnostic_records_v1";

  const PRACTICE_KEY =
    "aura_spelling_practice_records_v1";

  const REASSESS_KEY =
    "aura_spelling_reassessment_records_v1";

  const $ = id => document.getElementById(id);

  const state = {
    learnerId: null,
    learnerName: null,
    diagnostic: null,
    practice: null,
    questions: [],
    index: 0,
    records: [],
    sessionId: null,
    startedAt: null,
    questionStartedAt: 0,
    finished: false,
    busy: false,
    result: null,
    interrupted: false
  };

  // ========================================
  // 1. STORAGE
  // ========================================

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error(
        "[Spelling Reassessment] Storage read:",
        error
      );
      return fallback;
    }
  }

  function activeId() {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      if (!raw) return null;

      if (raw.startsWith('"')) {
        const value = JSON.parse(raw);
        return typeof value === "string"
          ? value
          : null;
      }

      return raw;
    } catch (error) {
      return null;
    }
  }

  // ========================================
  // 2. LEARNER NAME
  // ========================================

  function findProfile(data, id) {
    if (!data || !id) return null;

    const seen = new Set();
    const target = String(id);

    function search(value, depth, key) {
      if (
        !value ||
        typeof value !== "object" ||
        depth > 5 ||
        seen.has(value)
      ) {
        return null;
      }

      seen.add(value);

      if (Array.isArray(value)) {
        for (const item of value) {
          const found = search(
            item,
            depth + 1,
            null
          );

          if (found) return found;
        }

        return null;
      }

      const profileId =
        value.id ??
        value.learnerId ??
        value.learner_id ??
        value.profileId ??
        value.profile_id;

      if (
        (
          profileId != null &&
          String(profileId) === target
        ) ||
        key === target
      ) {
        return value;
      }

      for (const [childKey, child] of
        Object.entries(value)) {

        if (
          child &&
          typeof child === "object"
        ) {
          const found = search(
            child,
            depth + 1,
            childKey
          );

          if (found) return found;
        }
      }

      return null;
    }

    return search(data, 0, null);
  }

  function getLearnerName(id) {
    const profile = findProfile(
      readJSON(PROFILES_KEY, null),
      id
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
    ].find(
      value =>
        typeof value === "string" &&
        value.trim()
    )?.trim() || null;
  }

  // ========================================
  // 3. COMPLETED SESSION LOOKUP
  // ========================================

  function getSessions(key) {
    const value = readJSON(key, []);
    return Array.isArray(value) ? value : [];
  }

  function isValidDiagnostic(session, id) {
    if (
      !session ||
      String(session.learnerId) !== String(id) ||
      session.stage !== "diagnostic" ||
      !session.completedAt ||
      !session.sessionId ||
      !Array.isArray(session.records) ||
      session.records.length !== 8
    ) {
      return false;
    }

    return session.records.every(record =>
      record &&
      typeof record.wordId === "string" &&
      ["word", "sentence"].includes(record.taskType) &&
      typeof record.correct === "boolean"
    );
  }

  function getLatestDiagnostic(id) {
    return getSessions(DIAG_KEY)
      .filter(session =>
        isValidDiagnostic(session, id)
      )
      .sort((a, b) =>
        String(b.completedAt).localeCompare(
          String(a.completedAt)
        )
      )[0] || null;
  }

  function getLinkedPractice(id, diagnostic) {
    if (!diagnostic) return null;

    return getSessions(PRACTICE_KEY)
      .filter(session =>
        session &&
        String(session.learnerId) === String(id) &&
        session.stage === "practice" &&
        session.sourceDiagnosticSessionId ===
          diagnostic.sessionId &&
        Boolean(session.completedAt) &&
        Array.isArray(session.records) &&
        session.records.length > 0 &&
        session.result &&
        Number.isFinite(
          Number(session.result.total)
        ) &&
        Number(session.result.total) ===
          session.records.length
      )
      .sort((a, b) =>
        String(b.completedAt).localeCompare(
          String(a.completedAt)
        )
      )[0] || null;
  }

  // ========================================
  // 4. READINESS
  // ========================================

  function refreshReadiness() {
    if (state.startedAt) return;

    const id = activeId();

    state.learnerId = id;
    state.learnerName = id
      ? getLearnerName(id)
      : null;

    state.diagnostic = id
      ? getLatestDiagnostic(id)
      : null;

    state.practice =
      id && state.diagnostic
        ? getLinkedPractice(
            id,
            state.diagnostic
          )
        : null;

    $("learner-display").textContent =
      id
        ? "👤 " +
          (state.learnerName || "姓名未设置")
        : "👤 请先选择学生";

    const ready = Boolean(
      id &&
      state.diagnostic &&
      state.practice &&
      window.AuraSpellingKnowledge
    );

    $("start-btn").disabled = !ready;

    if (!id) {
      $("readiness").textContent =
        "请先选择学生身份。";
    } else if (!state.diagnostic) {
      $("readiness").textContent =
        "没有找到当前学生完整的拼写诊断记录。" +
        "\n请先完成 Spelling Diagnostic。";
    } else if (!state.practice) {
      $("readiness").textContent =
        "已找到诊断记录，但没有找到与最近一次诊断" +
        "对应的完整 Adaptive Practice。" +
        "\n请先完成练习。";
    } else {
      const diagnosticScore =
        state.diagnostic.result?.overall;

      const practiceScore =
        state.practice.result;

      $("readiness").textContent =
        "✓ Diagnostic completed\n" +
        "Score: " +
        (diagnosticScore?.correct ?? "—") +
        " / " +
        (diagnosticScore?.total ?? "—") +
        "\n\n✓ Adaptive Practice completed\n" +
        "First-attempt correct: " +
        (practiceScore?.firstAttemptCorrect ?? "—") +
        " / " +
        (practiceScore?.total ?? "—") +
        "\n\nReady for independent reassessment.";
    }
  }

  // ========================================
  // 5. QUESTION CONSTRUCTION
  // ========================================

  function buildQuestions() {
    const model =
      window.AuraSpellingKnowledge;

    if (!model) {
      throw new Error(
        "Spelling Knowledge Model 未加载"
      );
    }

    const records =
      state.diagnostic.records;

    const questions = records.map(
      (record, index) => {
        const word =
          model.getWord(record.wordId);

        if (!word) {
          throw new Error(
            "知识模型中找不到：" +
            record.wordId
          );
        }

        return {
          questionId: "SR-" + (index + 1),
          sourceDiagnosticQuestionId:
            record.questionId,
          wordId: record.wordId,
          taskType: record.taskType,
          target: word.word,
          meaning: word.meaning,
          sentenceBlank: word.sentenceBlank,
          diagnosticCorrect:
            record.correct === true
        };
      }
    );

    if (questions.length !== 8) {
      throw new Error(
        "复测题目数量不正确"
      );
    }

    return questions;
  }

  // ========================================
  // 6. START
  // ========================================

  function startReassessment() {
    if (state.startedAt) return;

    refreshReadiness();

    if (
      !state.learnerId ||
      !state.diagnostic ||
      !state.practice
    ) {
      $("intro-message").textContent =
        "请先完成当前学生的诊断和自适应练习。";
      return;
    }

    try {
      state.questions = buildQuestions();
    } catch (error) {
      $("intro-message").textContent =
        error.message;
      return;
    }

    state.index = 0;
    state.records = [];
    state.finished = false;
    state.interrupted = false;
    state.result = null;

    state.sessionId =
      "SPELLING-REASSESS-" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 9);

    state.startedAt =
      new Date().toISOString();

    $("intro-panel").classList.add("hidden");
    $("quiz-panel").classList.remove("hidden");

    showQuestion();
  }

  // ========================================
  // 7. QUESTION DISPLAY
  // ========================================

  function showQuestion() {
    const q = state.questions[state.index];

    if (!q) {
      finishReassessment();
      return;
    }

    $("question-counter").textContent =
      "Question " +
      (state.index + 1) +
      " / " +
      state.questions.length;

    $("progress-fill").style.width =
      (
        state.index /
        state.questions.length *
        100
      ) + "%";

    if (q.taskType === "word") {
      $("question-type").textContent =
        "WORD SPELLING / 单词拼写";

      $("question-title").textContent =
        "Write the English word for: " +
        q.meaning;

      $("question-context").textContent =
        "中文提示：" + q.meaning;
    } else {
      $("question-type").textContent =
        "SENTENCE APPLICATION / 句子填空";

      $("question-title").textContent =
        "Complete the sentence.";

      $("question-context").textContent =
        q.sentenceBlank +
        "\n中文词义：" +
        q.meaning;
    }

    $("answer-input").value = "";
    $("answer-input").disabled = false;
    $("submit-btn").disabled = false;
    $("quiz-message").textContent = "";

    state.questionStartedAt =
      performance.now();

    $("answer-input").focus();
  }

  // ========================================
  // 8. IDENTITY PROTECTION
  // ========================================

  function verifyIdentity() {
    if (
      !state.interrupted &&
      activeId() === state.learnerId
    ) {
      return true;
    }

    state.interrupted = true;

    $("quiz-message").textContent =
      "检测到学生身份发生变化。" +
      "\n本次复测已暂停，" +
      "请重新打开页面，以保护学生记录。";

    $("answer-input").disabled = true;
    $("submit-btn").disabled = true;

    return false;
  }

  // ========================================
  // 9. ANSWER SUBMISSION
  // ========================================

  function submitAnswer() {
    if (
      state.busy ||
      state.finished ||
      !state.startedAt ||
      !verifyIdentity()
    ) {
      return;
    }

    const q = state.questions[state.index];
    if (!q) return;

    const answer =
      $("answer-input").value.trim();

    if (!answer) {
      $("quiz-message").textContent =
        "请输入答案后再提交。";
      return;
    }

    state.busy = true;
    $("submit-btn").disabled = true;

    try {
      const model =
        window.AuraSpellingKnowledge;

      const analysis =
        q.taskType === "word"
          ? model.analyzeWord(
              answer,
              q.target
            )
          : model.analyzeSentenceBlank(
              answer,
              q.target
            );

      const timeMs = Math.max(
        0,
        Math.round(
          performance.now() -
          state.questionStartedAt
        )
      );

      state.records.push({
        questionId: q.questionId,
        sourceDiagnosticQuestionId:
          q.sourceDiagnosticQuestionId,
        wordId: q.wordId,
        taskType: q.taskType,
        target: q.target,
        answer,
        correct: analysis.correct,
        firstAttemptCorrect:
          analysis.correct,
        errorCode: analysis.errorCode,
        spellingErrorCode:
          analysis.spellingErrorCode ||
          analysis.errorCode,
        editDistance: analysis.editDistance,
        diagnosticCorrect:
          q.diagnosticCorrect,
        highestHintUsed: 0,
        attemptCount: 1,
        timeMs,
        attempts: [
          {
            attemptNumber: 1,
            answer,
            correct: analysis.correct,
            errorCode: analysis.errorCode,
            hintLevelAtAttempt: 0,
            timeMs,
            submittedAt:
              new Date().toISOString()
          }
        ]
      });

      state.index += 1;
      state.busy = false;

      if (
        state.index >=
        state.questions.length
      ) {
        finishReassessment();
      } else {
        showQuestion();
      }

    } catch (error) {
      state.busy = false;
      $("submit-btn").disabled = false;

      $("quiz-message").textContent =
        "答案处理失败：" + error.message;
    }
  }

  // ========================================
  // 10. RESULT CALCULATION
  // ========================================

  function score(items) {
    const correct = items.filter(
      item => item.correct
    ).length;

    return {
      correct,
      total: items.length,
      percent: items.length
        ? Math.round(
            correct / items.length * 100
          )
        : 0
    };
  }

  function calculateResult() {
    const records = state.records;

    const overall = score(records);

    const wordSpelling = score(
      records.filter(
        r => r.taskType === "word"
      )
    );

    const sentenceApplication = score(
      records.filter(
        r => r.taskType === "sentence"
      )
    );

    const diagnostic =
      state.diagnostic.result?.overall;

    const diagnosticPercent =
      Number(diagnostic?.percent);

    const hasDiagnosticPercent =
      Number.isFinite(diagnosticPercent);

    const difference =
      hasDiagnosticPercent
        ? overall.percent - diagnosticPercent
        : null;

    const errors = {};

    records.forEach(record => {
      if (!record.correct) {
        const code =
          record.spellingErrorCode ||
          record.errorCode;

        errors[code] =
          (errors[code] || 0) + 1;
      }
    });

    return {
      overall,
      wordSpelling,
      sentenceApplication,
      diagnosticPercent:
        hasDiagnosticPercent
          ? diagnosticPercent
          : null,
      reassessmentPercent:
        overall.percent,
      percentagePointDifference:
        difference,
      highestHintLevel: 0,
      totalAttempts: records.length,
      totalTimeMs: records.reduce(
        (sum, record) =>
          sum + record.timeMs,
        0
      ),
      errorSummary: errors,
      interpretation:
        "Descriptive same-item comparison only; " +
        "not evidence of causal impact or durable mastery."
    };
  }

  // ========================================
  // 11. SAVE
  // ========================================

  function saveSession(session) {
    try {
      if (
        state.interrupted ||
        activeId() !== state.learnerId
      ) {
        throw new Error(
          "学生身份已变化"
        );
      }

      const raw =
        localStorage.getItem(REASSESS_KEY);

      const existing =
        raw ? JSON.parse(raw) : [];

      if (!Array.isArray(existing)) {
        throw new Error(
          "历史复测记录格式不正确"
        );
      }

      localStorage.setItem(
        REASSESS_KEY,
        JSON.stringify([
          ...existing,
          session
        ])
      );

      return {
        ok: true,
        message: "✓ Reassessment record saved."
      };
    } catch (error) {
      console.error(
        "[Spelling Reassessment] Save:",
        error
      );

      return {
        ok: false,
        message:
          "保存失败，请复制 JSON 备份：" +
          error.message
      };
    }
  }

  // ========================================
  // 12. FINISH
  // ========================================

  function finishReassessment() {
    if (state.finished) return;

    if (!verifyIdentity()) return;

    state.finished = true;

    const session = {
      schemaVersion: "1.0",
      moduleId: "SPELLING",
      stage: "reassessment",
      sessionId: state.sessionId,
      learnerId: state.learnerId,
      learnerName: state.learnerName,
      sourceDiagnosticSessionId:
        state.diagnostic.sessionId,
      sourcePracticeSessionId:
        state.practice.sessionId,
      startedAt: state.startedAt,
      completedAt:
        new Date().toISOString(),
      questionCount: state.records.length,
      records: state.records,
      result: calculateResult(),
      masteryState: "NOT_EVALUATED",
      durableMasteryVerified: false,
      spellingUnlockChanged: false,
      speakingUnlockChanged: false
    };

    state.result = session;

    const saved = saveSession(session);

    $("quiz-panel").classList.add("hidden");
    $("result-panel").classList.remove("hidden");

    showResults(session, saved);
  }

  // ========================================
  // 13. DISPLAY RESULTS
  // ========================================

  function addText(parent, tag, content, className) {
    const node =
      document.createElement(tag);

    node.textContent = content;

    if (className) {
      node.className = className;
    }

    parent.appendChild(node);
    return node;
  }

  function showResults(session, saved) {
    const summary = $("result-summary");
    const details = $("result-details");

    summary.replaceChildren();
    details.replaceChildren();

    const r = session.result;

    addText(
      summary,
      "div",
      "Diagnostic: " +
      (r.diagnosticPercent ?? "—") +
      "%\nIndependent Reassessment: " +
      r.reassessmentPercent +
      "%\nDifference: " +
      (
        r.percentagePointDifference === null
          ? "—"
          : (
              r.percentagePointDifference > 0
                ? "+"
                : ""
            ) +
            r.percentagePointDifference +
            " percentage points"
      ),
      "stat"
    );

    addText(
      summary,
      "div",
      "Word Spelling: " +
      r.wordSpelling.correct +
      " / " +
      r.wordSpelling.total +
      "\nSentence Application: " +
      r.sentenceApplication.correct +
      " / " +
      r.sentenceApplication.total +
      "\nHints used: 0" +
      "\nTotal attempts: " +
      r.totalAttempts,
      "stat"
    );

    addText(
      summary,
      "p",
      saved.message
    );

    session.records.forEach(
      (record, index) => {
        addText(
          details,
          "div",
          "Q" + (index + 1) +
          " · " +
          record.taskType +
          "\nYour answer: " +
          record.answer +
          "\nTarget: " +
          record.target +
          "\nResult: " +
          (record.correct
            ? "✓ Correct"
            : "✗ Review needed") +
          "\nError: " +
          record.errorCode +
          "\nTime: " +
          (record.timeMs / 1000).toFixed(1) +
          " seconds",
          "result-row"
        );
      }
    );

    addText(
      details,
      "p",
      "研究说明：本次复测与诊断使用相同目标词汇，" +
      "因此分数差异可能受到重复接触题目的影响。" +
      "本结果仅反映当前题目集上的独立表现，" +
      "不能单独证明长期掌握或教学因果效果。",
      "small"
    );
  }

  // ========================================
  // 14. COPY JSON
  // ========================================

  async function copyJSON() {
    if (!state.result) return;

    const text = JSON.stringify(
      state.result,
      null,
      2
    );

    try {
      await navigator.clipboard.writeText(
        text
      );

      $("result-message").textContent =
        "✓ JSON 已复制。";
    } catch (error) {
      let area = $("json-fallback");

      if (!area) {
        area = document.createElement(
          "textarea"
        );

        area.id = "json-fallback";
        area.style.width = "100%";
        area.style.height = "180px";

        $("result-panel").appendChild(
          area
        );
      }

      area.value = text;
      area.focus();
      area.select();

      $("result-message").textContent =
        "自动复制失败，请手动复制下方 JSON。";
    }
  }

  // ========================================
  // 15. INITIALIZATION
  // ========================================

  function initialize() {
    refreshReadiness();

    $("start-btn").addEventListener(
      "click",
      startReassessment
    );

    $("submit-btn").addEventListener(
      "click",
      submitAnswer
    );

    $("answer-input").addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          event.preventDefault();
          submitAnswer();
        }
      }
    );

    $("copy-btn").addEventListener(
      "click",
      copyJSON
    );

    window.addEventListener(
      "focus",
      function () {
        if (!state.startedAt) {
          refreshReadiness();
        } else if (!state.finished) {
          verifyIdentity();
        }
      }
    );

    window.addEventListener(
      "storage",
      function () {
        if (!state.startedAt) {
          refreshReadiness();
        } else if (!state.finished) {
          verifyIdentity();
        }
      }
    );

    document.addEventListener(
      "visibilitychange",
      function () {
        if (!document.hidden) {
          if (!state.startedAt) {
            refreshReadiness();
          } else if (!state.finished) {
            verifyIdentity();
          }
        }
      }
    );

    console.info(
      "[AURA Spelling] Independent Reassessment Ready"
    );
  }

  window.AuraSpellingReassessment =
    Object.freeze({
      version: "1.0",
      getCurrentResult: function () {
        return state.result
          ? JSON.parse(
              JSON.stringify(state.result)
            )
          : null;
      }
    });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

})();
