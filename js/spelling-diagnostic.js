
/* ============================================
   AURA EDU V2.2
   STAGE 24.3

   SPELLING DIAGNOSTIC ASSESSMENT

   - 8 diagnostic questions
   - 4 spelling + 4 sentence blanks
   - No hints during diagnostic
   - First-attempt evidence
   - Learner-bound sessions
   - Local record persistence
   - No Grammar record modifications

   Version: 1.0
============================================ */

(function () {
  "use strict";

  const RECORDS_KEY =
    "aura_spelling_diagnostic_records_v1";

  const ACTIVE_KEY =
    "aura_active_learner_id_v2";

  const PROFILES_KEY =
    "aura_learner_profiles_v2";

  const $ = id => document.getElementById(id);

  const state = {
    learnerId: null,
    learnerName: null,
    questions: [],
    currentIndex: 0,
    records: [],
    sessionId: null,
    startedAt: null,
    questionStartedAt: null,
    completed: false,
    busy: false,
    result: null
  };

  // ========================================
  // 1. STORAGE UTILITIES
  // ========================================

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error(
        "[Spelling Diagnostic] Read error:",
        error
      );
      return fallback;
    }
  }

  function getActiveLearnerId() {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);

      if (!raw) return null;

      if (raw.startsWith('"')) {
        const parsed = JSON.parse(raw);
        return typeof parsed === "string"
          ? parsed
          : null;
      }

      return raw;
    } catch (error) {
      return null;
    }
  }

  function findProfile(data, id) {
    if (!data || !id) return null;

    const visited = new Set();
    const target = String(id);

    function search(value, depth, keyHint) {
      if (
        !value ||
        typeof value !== "object" ||
        depth > 5 ||
        visited.has(value)
      ) {
        return null;
      }

      visited.add(value);

      if (Array.isArray(value)) {
        for (const item of value) {
          const found = search(item, depth + 1, null);
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
          profileId !== undefined &&
          profileId !== null &&
          String(profileId) === target
        ) ||
        keyHint === target
      ) {
        return value;
      }

      for (const [key, child] of
        Object.entries(value)) {
        if (child && typeof child === "object") {
          const found = search(
            child,
            depth + 1,
            key
          );

          if (found) return found;
        }
      }

      return null;
    }

    return search(data, 0, null);
  }

  function getLearnerName(id) {
    const profiles = readJSON(
      PROFILES_KEY,
      null
    );

    const profile = findProfile(
      profiles,
      id
    );

    if (!profile) return null;

    const candidates = [
      profile.name,
      profile.displayName,
      profile.display_name,
      profile.learnerName,
      profile.studentName,
      profile.nickname,
      profile.nickName
    ];

    return candidates.find(
      value =>
        typeof value === "string" &&
        value.trim()
    )?.trim() || null;
  }

  function updateIdentity() {
    const id = getActiveLearnerId();

    state.learnerId = id;
    state.learnerName = id
      ? getLearnerName(id)
      : null;

    $("learner-display").textContent =
      state.learnerName
        ? "👤 Current Learner: " +
          state.learnerName
        : id
          ? "👤 当前学生姓名未设置"
          : "👤 请先选择学生";

    $("start-btn").disabled = !id;

    return Boolean(id);
  }

  // ========================================
  // 2. QUESTION CONSTRUCTION
  // ========================================

  function buildQuestions() {
    const knowledge =
      window.AuraSpellingKnowledge;

    if (!knowledge) {
      throw new Error(
        "Spelling Knowledge Model 未加载"
      );
    }

    const specification = [
      ["S1-W1", "word"],
      ["S1-W2", "word"],
      ["S2-W3", "word"],
      ["S3-W1", "word"],
      ["S1-W3", "sentence"],
      ["S2-W1", "sentence"],
      ["S2-W2", "sentence"],
      ["S3-W3", "sentence"]
    ];

    return specification.map(
      ([wordId, taskType], index) => {
        const word = knowledge.getWord(
          wordId
        );

        if (!word) {
          throw new Error(
            "找不到词汇：" + wordId
          );
        }

        return {
          questionId: "SD-" + (index + 1),
          wordId,
          taskType,
          target: word.word,
          meaning: word.meaning,
          sentenceBlank: word.sentenceBlank,
          sentence: word.sentence
        };
      }
    );
  }

  // ========================================
  // 3. START DIAGNOSTIC
  // ========================================

  function startDiagnostic() {
    if (state.busy || state.startedAt) {
      return;
    }

    if (!updateIdentity()) {
      $("intro-message").textContent =
        "请先在 Learner Manager 选择学生。";
      return;
    }

    try {
      state.questions = buildQuestions();
    } catch (error) {
      $("intro-message").textContent =
        error.message;
      return;
    }

    state.currentIndex = 0;
    state.records = [];
    state.completed = false;
    state.result = null;
    state.busy = false;

    state.sessionId =
      "SPELLING-DIAG-" +
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
  // 4. QUESTION DISPLAY
  // ========================================

  function showQuestion() {
    const question =
      state.questions[state.currentIndex];

    if (!question) {
      finishDiagnostic();
      return;
    }

    const number =
      state.currentIndex + 1;

    $("question-counter").textContent =
      "Question " + number +
      " / " + state.questions.length;

    $("progress-fill").style.width =
      (
        state.currentIndex /
        state.questions.length *
        100
      ) + "%";

    if (question.taskType === "word") {
      $("question-type").textContent =
        "WORD SPELLING / 单词拼写";

      $("question-title").textContent =
        "Write the English word for: " +
        question.meaning;

      $("question-context").textContent =
        "中文提示：" + question.meaning;
    } else {
      $("question-type").textContent =
        "SENTENCE APPLICATION / 句子填空";

      $("question-title").textContent =
        "Complete the sentence.";

      $("question-context").textContent =
        question.sentenceBlank +
        "\n中文词义：" +
        question.meaning;
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
  // 5. ANSWER SUBMISSION
  // ========================================

  function submitAnswer() {
    if (
      state.busy ||
      state.completed ||
      !state.startedAt
    ) {
      return;
    }

    const currentLearner =
      getActiveLearnerId();

    if (
      !currentLearner ||
      currentLearner !== state.learnerId
    ) {
      $("quiz-message").textContent =
        "检测到学生身份变化。请返回地图，" +
        "重新选择学生后开始新测评。";

      $("answer-input").disabled = true;
      $("submit-btn").disabled = true;
      return;
    }

    const input =
      $("answer-input").value.trim();

    if (!input) {
      $("quiz-message").textContent =
        "请输入答案后再提交。";
      return;
    }

    const question =
      state.questions[state.currentIndex];

    if (!question) return;

    state.busy = true;
    $("submit-btn").disabled = true;

    const knowledge =
      window.AuraSpellingKnowledge;

    const analysis =
      question.taskType === "word"
        ? knowledge.analyzeWord(
            input,
            question.target
          )
        : knowledge.analyzeSentenceBlank(
            input,
            question.target
          );

    const timeMs = Math.max(
      0,
      Math.round(
        performance.now() -
        state.questionStartedAt
      )
    );

    state.records.push({
      questionId: question.questionId,
      wordId: question.wordId,
      taskType: question.taskType,
      target: question.target,
      answer: input,
      correct: analysis.correct,
      errorCode: analysis.errorCode,
      spellingErrorCode:
        analysis.spellingErrorCode ||
        analysis.errorCode,
      editDistance: analysis.editDistance,
      firstAttemptCorrect: analysis.correct,
      attempts: [
        {
          attemptNumber: 1,
          answer: input,
          correct: analysis.correct,
          errorCode: analysis.errorCode,
          timeMs,
          hintLevel: 0,
          submittedAt:
            new Date().toISOString()
        }
      ],
      highestHintUsed: 0,
      timeMs
    });

    state.currentIndex += 1;
    state.busy = false;

    if (
      state.currentIndex >=
      state.questions.length
    ) {
      finishDiagnostic();
    } else {
      showQuestion();
    }
  }

  // ========================================
  // 6. RESULT CALCULATION
  // ========================================

  function calculateResult() {
    const records = state.records;

    const wordRecords = records.filter(
      record =>
        record.taskType === "word"
    );

    const sentenceRecords = records.filter(
      record =>
        record.taskType === "sentence"
    );

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

    const errors = {};

    records.forEach(record => {
      if (!record.correct) {
        const code = record.errorCode;

        errors[code] =
          (errors[code] || 0) + 1;
      }
    });

    return {
      overall: score(records),
      wordSpelling: score(wordRecords),
      sentenceApplication:
        score(sentenceRecords),
      errorSummary: errors,
      totalTimeMs: records.reduce(
        (sum, item) =>
          sum + item.timeMs,
        0
      )
    };
  }

  // ========================================
  // 7. SAVE COMPLETED SESSION
  // ========================================

  function saveSession(session) {
    try {
      const existing =
        readJSON(RECORDS_KEY, []);

      if (!Array.isArray(existing)) {
        throw new Error(
          "已有记录格式不正确，已停止保存以保护数据。"
        );
      }

      const updated = [
        ...existing,
        session
      ];

      localStorage.setItem(
        RECORDS_KEY,
        JSON.stringify(updated)
      );

      return {
        ok: true,
        message: "学习记录已保存"
      };
    } catch (error) {
      console.error(
        "[Spelling Diagnostic] Save error:",
        error
      );

      return {
        ok: false,
        message:
          "记录未能保存，请复制 JSON 备份。" +
          "错误：" + error.message
      };
    }
  }

  // ========================================
  // 8. FINISH DIAGNOSTIC
  // ========================================

  function finishDiagnostic() {
    if (state.completed) return;

    state.completed = true;

    const result = calculateResult();

    const session = {
      schemaVersion: "1.0",
      moduleId: "SPELLING",
      stage: "diagnostic",
      sessionId: state.sessionId,
      learnerId: state.learnerId,
      learnerName: state.learnerName,
      startedAt: state.startedAt,
      completedAt: new Date().toISOString(),
      questionCount: state.questions.length,
      records: state.records,
      result,
      masteryState: "NOT_EVALUATED",
      recommendedPath:
        "ADAPTIVE_PRACTICE_PENDING",
      independentReassessmentCompleted: false,
      grammarUnlockChanged: false
    };

    state.result = session;

    const saved = saveSession(session);

    $("quiz-panel").classList.add("hidden");
    $("result-panel").classList.remove("hidden");

    showResults(session, saved);
  }

  // ========================================
  // 9. RESULT DISPLAY
  // ========================================

  function showResults(session, saved) {
    const result = session.result;

    const summary = $("result-summary");
    const details = $("result-details");

    summary.replaceChildren();
    details.replaceChildren();

    const summaryBox =
      document.createElement("div");

    summaryBox.className = "result";

    const heading =
      document.createElement("h3");

    heading.textContent =
      "Overall: " +
      result.overall.correct +
      " / " +
      result.overall.total +
      " (" +
      result.overall.percent +
      "%)";

    summaryBox.appendChild(heading);

    const word =
      document.createElement("p");

    word.textContent =
      "Word Spelling: " +
      result.wordSpelling.correct +
      " / " +
      result.wordSpelling.total;

    summaryBox.appendChild(word);

    const sentence =
      document.createElement("p");

    sentence.textContent =
      "Sentence Application: " +
      result.sentenceApplication.correct +
      " / " +
      result.sentenceApplication.total;

    summaryBox.appendChild(sentence);

    const status =
      document.createElement("p");

    status.textContent = saved.message;
    summaryBox.appendChild(status);

    summary.appendChild(summaryBox);

    const title =
      document.createElement("h3");

    title.textContent =
      "Question-Level Evidence / 逐题记录";

    details.appendChild(title);

    session.records.forEach(
      (record, index) => {
        const row =
          document.createElement("div");

        row.className = "result-row";

        const answer =
          document.createElement("div");

        answer.textContent =
          "Q" + (index + 1) +
          " · Your answer: " +
          record.answer;

        const expected =
          document.createElement("div");

        expected.textContent =
          "Target: " +
          record.target;

        const feedback =
          document.createElement("div");

        feedback.textContent =
          (record.correct
            ? "✓ Correct"
            : "✗ Review needed") +
          " · " +
          record.errorCode;

        row.appendChild(answer);
        row.appendChild(expected);
        row.appendChild(feedback);

        details.appendChild(row);
      }
    );

    const note =
      document.createElement("p");

    note.className = "small";

    note.textContent =
      "这只是诊断结果。下一阶段将根据错误类型" +
      "安排不同的学习支架与练习，" +
      "之后还需要独立复测。";

    details.appendChild(note);
  }

  // ========================================
  // 10. COPY JSON
  // ========================================

  async function copyJSON() {
    if (!state.result) return;

    const text =
      JSON.stringify(
        state.result,
        null,
        2
      );

    try {
      await navigator.clipboard.writeText(
        text
      );

      $("result-message").textContent =
        "✓ JSON 已复制到剪贴板。";
    } catch (error) {
      console.warn(
        "[Spelling Diagnostic] Clipboard:",
        error
      );

      const area =
        document.createElement("textarea");

      area.value = text;
      area.readOnly = true;
      area.style.width = "100%";
      area.style.height = "180px";

      $("result-panel").appendChild(area);
      area.focus();
      area.select();

      $("result-message").textContent =
        "自动复制失败。请在下方文本框中" +
        "手动复制 JSON。";
    }
  }

  // ========================================
  // 11. INITIALIZATION
  // ========================================

  function initialize() {
    updateIdentity();

    $("start-btn").addEventListener(
      "click",
      startDiagnostic
    );

    $("submit-btn").addEventListener(
      "click",
      submitAnswer
    );

    $("answer-input").addEventListener(
      "keydown",
      function (event) {
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
          updateIdentity();
        }
      }
    );

    document.addEventListener(
      "visibilitychange",
      function () {
        if (
          !document.hidden &&
          !state.startedAt
        ) {
          updateIdentity();
        }
      }
    );

    console.info(
      "[AURA Spelling] Diagnostic ready"
    );
  }

  window.AuraSpellingDiagnostic =
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
