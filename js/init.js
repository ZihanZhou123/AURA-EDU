
// ==========================================
// AURA EDU V2.2
// INITIALIZATION + EXPLAINABLE ADAPTATION
// STEP 9.2
// ==========================================

"use strict";

let auraInitialized = false;


// ==========================================
// 1. SAFE MODULE INITIALIZATION
// ==========================================

function initializeModule(name, callback) {

  try {

    if (typeof callback !== "function") {
      console.warn(
        "[AURA EDU] Missing module: " + name
      );
      return false;
    }

    callback();

    console.log(
      "[AURA EDU] Ready: " + name
    );

    return true;

  } catch (error) {

    console.error(
      "[AURA EDU] Failed: " + name,
      error
    );

    return false;
  }
}


// ==========================================
// 2. RECOMMENDATION HELPERS
// ==========================================

const auraSkillNames = {
  greetings: "Greetings",
  be_verb: "Verb to Be",
  hobbies: "Hobbies",
  interaction: "Answering Questions",
  transfer: "Conversation Skills"
};

function auraSafeText(value) {
  return String(value ?? "");
}

function auraSkillName(skill) {
  return auraSkillNames[skill] ||
    auraSafeText(skill).replace(/_/g, " ");
}

function auraCount(value) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? number
    : 0;
}


// ==========================================
// 3. FIND RECOMMENDATION EVIDENCE
// ==========================================

function getAuraRecommendation() {

  if (
    typeof data === "undefined" ||
    !data.skills
  ) {
    return null;
  }

  const skills = Object.entries(data.skills);

  if (skills.length === 0) {
    return {
      type: "empty",
      title: "Start Your Learning Journey",
      reason:
        "No skill-level quiz evidence has been recorded yet.",
      action:
        "Complete an Adaptive Learning question to receive a recommendation.",
      evidence:
        "0 recorded skill attempts"
    };
  }

  const pending = skills.filter(
    ([, record]) =>
      record &&
      record.reviewNeeded === true
  );

  if (pending.length > 0) {

    // Prefer the most recently flagged skill
    // when the event history identifies it.

    const history = Array.isArray(data.history)
      ? data.history
      : [];

    const pendingNames = new Set(
      pending.map(([skill]) => skill)
    );

    const latest = [...history]
      .reverse()
      .find(event =>
        (event.type === "quiz" ||
         event.type === "skill_review") &&
        event.correct === false &&
        pendingNames.has(event.skill)
      );

    const chosenSkill = latest
      ? latest.skill
      : pending[0][0];

    const record = data.skills[chosenSkill];

    const attempts = auraCount(record.attempts);
    const correct = auraCount(record.correct);
    const independent = auraCount(
      record.independent
    );

    return {
      type: "review",
      skill: chosenSkill,
      title:
        "Review Recommended: " +
        auraSkillName(chosenSkill),

      reason:
        "The latest recorded result for this " +
        "skill indicates that further practice " +
        "is needed. This is a rule-based " +
        "recommendation, not an AI diagnosis.",

      evidence:
        attempts + " attempt(s), " +
        correct + " correct response(s), " +
        independent + " independent success(es). " +
        "Current review flag: Yes.",

      action:
        "Select Review a Skill to practise " +
        "this skill with another example."
    };
  }

  // No unresolved review flag.
  // Find the most recently practised skill.

  const history = Array.isArray(data.history)
    ? data.history
    : [];

  const latest = [...history]
    .reverse()
    .find(event =>
      (event.type === "quiz" ||
       event.type === "skill_review") &&
      event.skill &&
      data.skills[event.skill]
    );

  const skill = latest
    ? latest.skill
    : skills[skills.length - 1][0];

  const record = data.skills[skill];

  return {
    type: "continue",
    skill: skill,

    title: "Continue Learning",

    reason:
      "There are currently no unresolved " +
      "review flags in the recorded quiz skills. " +
      "This does not establish mastery.",

    evidence:
      auraSkillName(skill) + ": " +
      auraCount(record.correct) + "/" +
      auraCount(record.attempts) +
      " correct responses. " +
      "Current review flag: No.",

    action:
      "Continue to the next task. " +
      "If a later attempt is incorrect, " +
      "the system may recommend review."
  };
}


// ==========================================
// 4. CREATE EXPLANATION PANEL
// ==========================================

function createAuraExplanationPanel() {

  const page = document.getElementById("learn");

  if (!page) {
    console.warn(
      "[AURA EDU] Adaptive Learning page not found."
    );
    return null;
  }

  let panel = document.getElementById(
    "aura-explanation-panel"
  );

  if (panel) {
    return panel;
  }

  panel = document.createElement("section");

  panel.id = "aura-explanation-panel";

  panel.setAttribute(
    "aria-label",
    "Explainable learning recommendation"
  );

  panel.style.cssText = [
    "margin-top:24px",
    "padding:22px",
    "background:#f8faff",
    "border:1px solid #dbe4f0",
    "border-radius:16px",
    "color:#1d2942"
  ].join(";");

  // Place the panel after the existing
  // Adaptive Learning content.

  page.appendChild(panel);

  return panel;
}


// ==========================================
// 5. RENDER EXPLAINABLE RECOMMENDATION
// ==========================================

function renderAuraRecommendation() {

  const panel = createAuraExplanationPanel();

  if (!panel) return;

  const recommendation =
    getAuraRecommendation();

  if (!recommendation) {
    panel.textContent =
      "Learning evidence is not available.";
    return;
  }

  // Create DOM nodes using textContent
  // to avoid injecting learner data as HTML.

  panel.replaceChildren();

  const heading = document.createElement("h3");
  heading.textContent =
    "AURA Learning Recommendation";
  heading.style.margin = "0 0 10px";

  const tag = document.createElement("p");
  tag.textContent =
    "EXPLAINABLE ADAPTATION · RULE-BASED";
  tag.style.cssText =
    "font-size:11px;font-weight:700;" +
    "letter-spacing:1px;color:#586c94;";

  const title = document.createElement("h4");
  title.textContent = recommendation.title;
  title.style.margin = "14px 0 10px";

  const whyTitle = document.createElement("strong");
  whyTitle.textContent =
    "Why this recommendation?";

  const reason = document.createElement("p");
  reason.textContent = recommendation.reason;
  reason.style.lineHeight = "1.7";

  const evidenceTitle =
    document.createElement("strong");
  evidenceTitle.textContent =
    "Evidence used";

  const evidence = document.createElement("p");
  evidence.textContent = recommendation.evidence;
  evidence.style.lineHeight = "1.7";

  const actionTitle =
    document.createElement("strong");
  actionTitle.textContent =
    "Suggested next action";

  const action = document.createElement("p");
  action.textContent = recommendation.action;
  action.style.lineHeight = "1.7";

  const note = document.createElement("p");
  note.textContent =
    "Recommendation logic: an unresolved " +
    "review flag triggers practice advice. " +
    "The panel describes recorded task " +
    "performance only; it does not measure " +
    "overall English proficiency.";
  note.style.cssText =
    "font-size:12px;color:#66738a;" +
    "line-height:1.6;margin-top:18px;";

  panel.append(
    heading,
    tag,
    title,
    whyTitle,
    reason,
    evidenceTitle,
    evidence,
    actionTitle,
    action,
    note
  );
}


// ==========================================
// 6. UPDATE AFTER LEARNING ACTIONS
// ==========================================

function initializeExplanationUpdates() {

  // Existing Adaptive Learning handlers
  // update data synchronously on clicks.
  // Refresh the explanation after they finish.

  document.addEventListener(
    "click",
    event => {

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const learningPage = target.closest(
        "#learn"
      );

      if (!learningPage) {
        return;
      }

      window.setTimeout(
        renderAuraRecommendation,
        0
      );
    }
  );

  // Update when switching back to the
  // Adaptive Learning page.

  document.querySelectorAll(
    '[data-page="learn"],[data-go="learn"]'
  ).forEach(button => {

    button.addEventListener(
      "click",
      () => {
        window.setTimeout(
          renderAuraRecommendation,
          0
        );
      }
    );

  });
}


// ==========================================
// 7. INITIALIZE APPLICATION
// ==========================================

function initializeAuraEdu() {

  if (auraInitialized) return;

  auraInitialized = true;

  console.log(
    "[AURA EDU] Starting V2.2..."
  );

  initializeModule(
    "Student Profile",
    typeof profileUI === "function"
      ? profileUI
      : null
  );

  initializeModule(
    "Curriculum",
    typeof renderUnits === "function"
      ? renderUnits
      : null
  );

  initializeModule(
    "Adaptive Learning",
    typeof resetQuiz === "function"
      ? resetQuiz
      : null
  );

  initializeModule(
    "Speaking Scenarios",
    typeof renderScenarios === "function"
      ? renderScenarios
      : null
  );

  initializeModule(
    "Speaking Session",
    typeof restart === "function"
      ? restart
      : null
  );

  initializeModule(
    "Learning Analytics",
    typeof renderStats === "function"
      ? renderStats
      : null
  );

  initializeModule(
    "Explainable Recommendations",
    renderAuraRecommendation
  );

  initializeModule(
    "Recommendation Updates",
    initializeExplanationUpdates
  );

  console.log(
    "[AURA EDU] Initialization finished."
  );
}


// ==========================================
// 8. START APPLICATION
// ==========================================

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    initializeAuraEdu,
    { once: true }
  );

} else {

  initializeAuraEdu();

}

// ==========================================
// END OF INIT.JS
// ==========================================
