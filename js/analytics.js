
/* ==========================================
   AURA EDU V2.2
   LEARNING ANALYTICS — RESEARCH UPGRADE

   STAGE 21.5.6
   MULTI-LEARNER IDENTITY INTEGRATION

   - Preserve original research metrics
   - Export only current learner data
   - Verify identity before sensitive actions
   - Clear only current learner activity
   - Preserve legacy and G1/G2/G3 records
========================================== */

"use strict";

// ------------------------------------------
// 1. SAFE HELPERS
// ------------------------------------------

function analyticsElement(id) {
  return document.getElementById(id);
}

function analyticsText(id, value) {
  const element = analyticsElement(id);

  if (element) {
    element.textContent = String(value);
  }
}

function analyticsNumber(value) {
  const n = Number(value);

  return Number.isFinite(n) && n >= 0
    ? n
    : 0;
}

function analyticsPercent(numerator, denominator) {
  if (!denominator) {
    return "No data";
  }

  return Math.round(
    numerator / denominator * 100
  ) + "%";
}

// ------------------------------------------
// 2. IDENTITY AND STORAGE SAFETY
// ------------------------------------------

const ANALYTICS_LEARNER_PREFIX =
  "aura_edu_v2_learner_";

function analyticsIdentityStatus() {
  if (
    typeof window.AuraLearnerDataStatus !== "function"
  ) {
    return {
      ok: false,
      reason: "LEARNER_DATA_SERVICE_UNAVAILABLE"
    };
  }

  let status;

  try {
    status = window.AuraLearnerDataStatus();
  } catch (error) {
    return {
      ok: false,
      reason: "IDENTITY_STATUS_ERROR"
    };
  }

  if (
    !status ||
    status.sessionValid !== true ||
    !status.activeLearnerId ||
    !status.sessionLearnerId ||
    status.activeLearnerId !== status.sessionLearnerId
  ) {
    return {
      ok: false,
      reason: "LEARNER_SESSION_INVALID"
    };
  }

  const expectedKey =
    ANALYTICS_LEARNER_PREFIX +
    encodeURIComponent(status.activeLearnerId);

  if (
    status.storageKey !== expectedKey
  ) {
    return {
      ok: false,
      reason: "STORAGE_KEY_MISMATCH"
    };
  }

  if (
    typeof data === "undefined" ||
    !data ||
    data.learnerId !== status.activeLearnerId
  ) {
    return {
      ok: false,
      reason: "MEMORY_IDENTITY_MISMATCH"
    };
  }

  return {
    ok: true,
    learnerId: status.activeLearnerId,
    nickname:
      status.activeLearnerNickname || "Learner",
    storageKey: expectedKey
  };
}

function analyticsReadCurrentData() {
  const identity = analyticsIdentityStatus();

  if (!identity.ok) {
    return {
      ok: false,
      reason: identity.reason
    };
  }

  let raw;

  try {
    raw = localStorage.getItem(
      identity.storageKey
    );
  } catch (error) {
    return {
      ok: false,
      reason: "STORAGE_READ_FAILED"
    };
  }

  if (!raw) {
    return {
      ok: false,
      reason: "NO_SAVED_LEARNER_DATA"
    };
  }

  let saved;

  try {
    saved = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      reason: "INVALID_SAVED_JSON"
    };
  }

  if (
    !saved ||
    typeof saved !== "object" ||
    Array.isArray(saved) ||
    saved.learnerId !== identity.learnerId
  ) {
    return {
      ok: false,
      reason: "SAVED_IDENTITY_MISMATCH"
    };
  }

  return {
    ok: true,
    identity,
    saved
  };
}

function analyticsShowIdentityError(reason) {
  console.warn(
    "[AURA Analytics] Action blocked:",
    reason
  );

  window.alert(
    "无法确认当前学生的数据归属。\n\n" +
    "原因：" + reason + "\n\n" +
    "请返回 Learner Manager 确认学生，" +
    "然后刷新 AURA EDU 首页。"
  );
}

// ------------------------------------------
// 3. RESEARCH METRICS
// ------------------------------------------

function calculateResearchMetrics(source = data) {
  const history = Array.isArray(source.history)
    ? source.history
    : [];

  const quizEvents = history.filter(
    event => event && event.type === "quiz"
  );

  const reviewEvents = history.filter(
    event => event && event.type === "skill_review"
  );

  const successfulReviews = reviewEvents.filter(
    event => event.correct === true
  );

  const quizHintLevels = quizEvents.reduce(
    (sum, event) =>
      sum + analyticsNumber(event.hints),
    0
  );

  const independentTurns =
    analyticsNumber(source.independentTurns);

  const supportedTurns =
    analyticsNumber(source.supportedTurns);

  const successfulTurns =
    independentTurns + supportedTurns;

  return {
    independentSpeaking:
      analyticsPercent(
        independentTurns,
        successfulTurns
      ),

    hintPerQuiz:
      quizEvents.length
        ? (
            quizHintLevels / quizEvents.length
          ).toFixed(2)
        : "No data",

    reviewSuccess:
      analyticsPercent(
        successfulReviews.length,
        reviewEvents.length
      ),

    quizEvents: quizEvents.length,
    reviewEvents: reviewEvents.length,
    successfulTurns
  };
}

// ------------------------------------------
// 4. RENDER MAIN STATISTICS
// ------------------------------------------

function renderStats() {
  const identity = analyticsIdentityStatus();

  if (identity.ok) {
    analyticsText(
      "student-label",
      identity.nickname
    );
  } else {
    analyticsText(
      "student-label",
      "Select a learner"
    );
  }

  analyticsText(
    "home-quiz",
    analyticsNumber(data.attempts)
  );

  analyticsText(
    "home-voice",
    analyticsNumber(data.voiceAttempts)
  );

  analyticsText(
    "home-complete",
    analyticsNumber(data.completedDialogues)
  );

  analyticsText(
    "home-hints",
    analyticsNumber(data.hints)
  );

  const attempts =
    analyticsNumber(data.attempts);

  const correct =
    analyticsNumber(data.correct);

  const accuracy =
    analyticsPercent(correct, attempts);

  analyticsText(
    "accuracy",
    accuracy === "No data" ? "—" : accuracy
  );

  analyticsText(
    "voice-count",
    analyticsNumber(data.voiceAttempts)
  );

  analyticsText(
    "dialogue-count",
    analyticsNumber(data.completedDialogues)
  );

  renderActivityBreakdown();
  renderSkillEvidence();
  renderAnalyticsInterpretation();
  renderResearchPanel();
}

// ------------------------------------------
// 5. ACTIVITY BREAKDOWN
// ------------------------------------------

function renderActivityBreakdown() {
  const container =
    analyticsElement("analytics-bars");

  if (!container) {
    return;
  }

  const activities = [
    ["Quiz attempts", data.attempts],
    ["Voice attempts", data.voiceAttempts],
    ["Typed speaking attempts", data.typedAttempts],
    ["Independent speaking turns", data.independentTurns],
    ["Supported speaking turns", data.supportedTurns],
    ["Speaking retries", data.speakingRetries],
    ["Writing submissions", data.writing],
    ["Writing revisions", data.revisions],
    ["Hints requested", data.hints]
  ].map(([name, value]) => [
    name,
    analyticsNumber(value)
  ]);

  const maximum = Math.max(
    1,
    ...activities.map(item => item[1])
  );

  container.innerHTML = activities.map(
    ([name, value]) => {
      const width = Math.min(
        100,
        value / maximum * 100
      );

      return `
        <div class="barline">
          <div class="barlabel">
            <span>${escapeHTML(name)}</span>
            <strong>${value}</strong>
          </div>

          <div class="bar">
            <div style="width:${width}%"></div>
          </div>
        </div>
      `;
    }
  ).join("");
}

// ------------------------------------------
// 6. SKILL EVIDENCE
// ------------------------------------------

function renderSkillEvidence() {
  const container =
    analyticsElement("skill-evidence");

  if (!container) {
    return;
  }

  const skills = Object.entries(
    data.skills || {}
  );

  if (!skills.length) {
    container.innerHTML =
      '<p class="small muted">' +
      'No skill evidence recorded yet.' +
      '</p>';

    return;
  }

  container.innerHTML = skills.map(
    ([skill, record]) => {
      const attempts =
        analyticsNumber(record.attempts);

      const correct =
        analyticsNumber(record.correct);

      const independent =
        analyticsNumber(record.independent);

      const hints =
        analyticsNumber(record.hintUsed);

      const percentage = attempts
        ? Math.min(
            100,
            correct / attempts * 100
          )
        : 0;

      return `
        <div class="barline">
          <div class="barlabel">
            <strong>${escapeHTML(skill)}</strong>
            <span>${Math.round(percentage)}%</span>
          </div>

          <div class="bar">
            <div style="width:${percentage}%"></div>
          </div>

          <p class="small muted">
            ${correct}/${attempts} correct ·
            ${independent} independent ·
            ${hints} hint levels used
          </p>

          <p class="small muted">
            ${
              record.reviewNeeded
                ? "Review suggested"
                : "No current review flag"
            }
          </p>
        </div>
      `;
    }
  ).join("");
}

// ------------------------------------------
// 7. RESEARCH INTERPRETATION
// ------------------------------------------

function renderAnalyticsInterpretation() {
  const element =
    analyticsElement("analytics-note");

  if (!element) {
    return;
  }

  const flaggedSkills = Object.entries(
    data.skills || {}
  )
    .filter(([, record]) =>
      record && record.reviewNeeded
    )
    .map(([skill]) => skill);

  const total =
    analyticsNumber(data.attempts) +
    analyticsNumber(data.speaking) +
    analyticsNumber(data.writing);

  if (!total) {
    element.textContent =
      "No learning activity recorded yet. " +
      "Complete learning tasks to generate evidence.";

    return;
  }

  let message =
    "This dashboard summarizes activity " +
    "recorded in the AURA EDU prototype.";

  if (flaggedSkills.length) {
    message +=
      "\n\nSkills flagged for review: " +
      flaggedSkills.join(", ") + ".";
  }

  message +=
    "\n\nThese indicators describe task-level " +
    "behaviour. They do not establish English " +
    "proficiency or prove learning improvement.";

  element.textContent = message;
  element.style.whiteSpace = "pre-line";
}

// ------------------------------------------
// 8. RESEARCH METRICS PANEL
// ------------------------------------------

function renderResearchPanel() {
  const anchor =
    analyticsElement("analytics-note");

  if (!anchor || !anchor.parentElement) {
    return;
  }

  let panel =
    analyticsElement("aura-research-panel");

  if (!panel) {
    panel = document.createElement("section");
    panel.id = "aura-research-panel";

    panel.style.cssText = [
      "margin-top:24px",
      "padding:22px",
      "border:1px solid #dbe4f0",
      "border-radius:16px",
      "background:#f8faff",
      "color:#1d2942"
    ].join(";");

    anchor.insertAdjacentElement(
      "afterend",
      panel
    );
  }

  const metrics =
    calculateResearchMetrics();

  const cards = [
    {
      title: "Independent Speaking Rate",
      value: metrics.independentSpeaking,
      description:
        "Independent successful turns / all successful turns"
    },
    {
      title: "Hint Use per Quiz Attempt",
      value: metrics.hintPerQuiz,
      description:
        "Recorded quiz hint levels / recorded quiz attempts"
    },
    {
      title: "Review Success Rate",
      value: metrics.reviewSuccess,
      description:
        "Successful review attempts / all review attempts"
    }
  ];

  panel.innerHTML = `
    <h3 style="margin:0 0 8px">
      Learning Process Indicators
    </h3>

    <p style="font-size:13px;line-height:1.6">
      Research-oriented descriptive metrics
      derived from recorded learning activity.
    </p>

    <div style="
      display:grid;
      grid-template-columns:
        repeat(auto-fit,minmax(180px,1fr));
      gap:12px;
      margin-top:16px;
    ">
      ${cards.map(card => `
        <div style="
          background:white;
          padding:16px;
          border:1px solid #e1e7f1;
          border-radius:12px;
        ">
          <div style="
            font-size:13px;
            font-weight:600;
          ">
            ${escapeHTML(card.title)}
          </div>

          <div style="
            font-size:27px;
            font-weight:700;
            margin:10px 0;
          ">
            ${escapeHTML(card.value)}
          </div>

          <div style="
            font-size:12px;
            color:#66738a;
            line-height:1.5;
          ">
            ${escapeHTML(card.description)}
          </div>
        </div>
      `).join("")}
    </div>

    <p style="
      font-size:12px;
      line-height:1.6;
      margin-top:16px;
      color:#66738a;
    ">
      Missing observations are displayed as
      No data. These metrics are exploratory
      and have not been validated as measures
      of language proficiency.
    </p>
  `;
}

// ------------------------------------------
// 9. EXPORT CURRENT LEARNER DATA
// ------------------------------------------

function exportLearningData() {
  const result = analyticsReadCurrentData();

  if (!result.ok) {
    analyticsShowIdentityError(result.reason);
    return;
  }

  const { identity, saved } = result;

  // Create a separate export snapshot.
  // Do not mutate stored learning data.

  const exported = JSON.parse(
    JSON.stringify(saved)
  );

  // Preserve the existing privacy exclusions.

  delete exported.name;
  delete exported.lastWriting;

  // Do not include free-text event fields
  // in this research-oriented export.

  if (Array.isArray(exported.history)) {
    exported.history = exported.history.map(
      event => {
        if (
          !event ||
          typeof event !== "object"
        ) {
          return null;
        }

        const clean = {};

        for (const [key, value] of Object.entries(event)) {
          const sensitiveKey =
            /name|nickname|text|transcript|utterance|response|answer|message|prompt|input|writing|content/i
              .test(key);

          if (!sensitiveKey) {
            clean[key] = value;
          }
        }

        return clean;
      }
    ).filter(Boolean);
  }

  const payload = {
    application: "AURA EDU V2.2",
    exportVersion: "21.5.6",
    exportedAt: new Date().toISOString(),

    learnerId: identity.learnerId,

    source:
      "Current learner's AURA EDU homepage activity",

    researchMetrics:
      calculateResearchMetrics(saved),

    data: exported,

    limitations:
      "Prototype activity data; not validated " +
      "proficiency or learning gain measures. " +
      "G1/G2/G3 records are stored separately. " +
      "Free-text history fields are excluded."
  };

  const json = JSON.stringify(
    payload,
    null,
    2
  );

  const blob = new Blob(
    [json],
    {
      type: "application/json;charset=utf-8"
    }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const safeId = identity.learnerId
    .replace(/[^a-zA-Z0-9_-]/g, "_");

  link.href = url;

  link.download =
    "aura-learning-" +
    safeId +
    ".json";

  link.style.display = "none";

  document.body.appendChild(link);

  try {
    link.click();

    console.info(
      "[AURA Analytics] Export requested:",
      {
        learnerId: identity.learnerId,
        filename: link.download
      }
    );

  } catch (error) {
    console.error(
      "[AURA Analytics] Export failed:",
      error
    );

    window.alert(
      "JSON 下载未能启动，请检查 Safari 下载设置。"
    );

  } finally {
    link.remove();

    // Give Safari sufficient time to
    // process the download request.
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
  }
}

// ------------------------------------------
// 10. CLEAR CURRENT LEARNER DATA
// ------------------------------------------

function clearLearningData() {
  const result = analyticsReadCurrentData();

  if (!result.ok) {
    analyticsShowIdentityError(result.reason);
    return;
  }

  const { identity } = result;

  const confirmed = window.confirm(
    "即将清除当前学生的首页学习记录。\n\n" +
    "学生：" + identity.nickname + "\n" +
    "Learner ID：" + identity.learnerId + "\n\n" +
    "包括 Quiz、Speaking、Writing 和" +
    "原版 Learning Analytics 数据。\n\n" +
    "不会清除：\n" +
    "其他学生的记录\n" +
    "G1/G2/G3 学习记录\n" +
    "旧版数据及其备份\n\n" +
    "此操作不可撤销。是否继续？"
  );

  if (!confirmed) {
    return;
  }

  const typed = window.prompt(
    "为避免误删，请输入当前学生昵称以确认：\n\n" +
    identity.nickname
  );

  if (
    typed === null ||
    typed.trim() !== identity.nickname
  ) {
    window.alert(
      "昵称不一致，已取消清除操作。"
    );

    return;
  }

  // Recheck identity after user interaction.
  // The active learner may have changed.

  const verified = analyticsReadCurrentData();

  if (
    !verified.ok ||
    verified.identity.learnerId !== identity.learnerId ||
    verified.identity.storageKey !== identity.storageKey
  ) {
    analyticsShowIdentityError(
      "IDENTITY_CHANGED_DURING_CLEAR"
    );

    return;
  }

  try {
    // Remove ONLY the current learner's
    // homepage activity storage key.

    localStorage.removeItem(
      identity.storageKey
    );

    // Verify that removal actually happened.

    if (
      localStorage.getItem(
        identity.storageKey
      ) !== null
    ) {
      throw new Error(
        "Storage removal verification failed."
      );
    }

  } catch (error) {
    console.error(
      "[AURA Analytics] Clear failed:",
      error
    );

    window.alert(
      "清除失败，数据可能仍然存在。" +
      "请检查浏览器控制台。"
    );

    return;
  }

  console.info(
    "[AURA Analytics] Current learner data cleared:",
    identity.learnerId
  );

  window.alert(
    "当前学生的首页学习记录已清除。\n" +
    "其他学生、G1/G2/G3 和旧数据未被本操作修改。\n\n" +
    "页面将刷新。"
  );

  // Reload instead of calling resetQuiz/restart:
  // those functions may write new records
  // during reset. Reload safely initializes
  // an empty learner dataset.

  window.location.reload();
}

// ------------------------------------------
// 11. CONNECT BUTTONS
// ------------------------------------------

function initializeAnalytics() {
  const exportButton =
    analyticsElement("export");

  const clearButton =
    analyticsElement("clear");

  if (exportButton) {
    exportButton.onclick =
      exportLearningData;
  }

  if (clearButton) {
    clearButton.onclick =
      clearLearningData;
  }
}

initializeAnalytics();

// ------------------------------------------
// 12. DIAGNOSTIC STATUS
// ------------------------------------------

window.AuraAnalyticsIdentityStatus = function () {
  const identity = analyticsIdentityStatus();

  if (!identity.ok) {
    return {
      ready: false,
      reason: identity.reason
    };
  }

  let savedExists = false;

  try {
    savedExists =
      localStorage.getItem(
        identity.storageKey
      ) !== null;
  } catch (error) {
    return {
      ready: false,
      reason: "STORAGE_READ_FAILED"
    };
  }

  return {
    ready: true,
    learnerId: identity.learnerId,
    learnerNickname: identity.nickname,
    storageKey: identity.storageKey,
    savedDataExists: savedExists,
    exportConnected:
      analyticsElement("export")?.onclick ===
      exportLearningData,
    clearConnected:
      analyticsElement("clear")?.onclick ===
      clearLearningData
  };
};

console.info(
  "[AURA EDU] Stage 21.5.6 " +
  "Learner Analytics Integration ready."
);

// ==========================================
// END OF ANALYTICS.JS
// ==========================================
