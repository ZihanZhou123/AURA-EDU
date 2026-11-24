
/* ==========================================
   AURA EDU V2.2
   CORE APPLICATION

   STAGE 21.5.2
   MULTI-LEARNER DATA ISOLATION

   - Bind activity data to learner ID
   - Preserve legacy data
   - Prevent cross-learner writes
   - Keep original module interfaces
========================================== */

"use strict";

// ------------------------------------------
// 1. DOM HELPERS
// ------------------------------------------

const $ = id => document.getElementById(id);

// ------------------------------------------
// 2. STORAGE CONFIGURATION
// ------------------------------------------

// Legacy storage: READ-ONLY.
// Never migrate or overwrite automatically.

const KEY = "aura_edu_v2";

const LEGACY_BACKUP_KEY =
  "aura_edu_v2_legacy_backup";

const LEARNER_STORAGE_PREFIX =
  "aura_edu_v2_learner_";

// ------------------------------------------
// 3. DEFAULT LEARNING DATA
// ------------------------------------------

const defaults = {
  name: "Explorer",
  grade: 3,

  attempts: 0,
  correct: 0,
  hints: 0,

  speaking: 0,
  voiceAttempts: 0,
  typedAttempts: 0,
  speakingSuccess: 0,

  independentTurns: 0,
  supportedTurns: 0,
  speakingRetries: 0,
  completedDialogues: 0,

  writing: 0,
  revisions: 0,
  lastWriting: "",

  sound: true,
  voice: true,
  speechRate: 0.88,

  skills: {},
  history: []
};

function freshDefaults() {
  return {
    ...defaults,
    skills: {},
    history: []
  };
}

// ------------------------------------------
// 4. IDENTITY SERVICE
// ------------------------------------------

function getIdentityService() {
  const service = window.AuraLearnerIdentity;

  if (
    !service ||
    typeof service.getActiveLearner !== "function" ||
    typeof service.findLearner !== "function"
  ) {
    return null;
  }

  return service;
}

function getCurrentLearner() {
  const service = getIdentityService();

  if (!service) {
    return null;
  }

  try {
    const learner = service.getActiveLearner();

    if (
      !learner ||
      typeof learner.id !== "string" ||
      !learner.id.trim()
    ) {
      return null;
    }

    return learner;

  } catch (error) {
    console.warn(
      "[AURA EDU] Cannot read active learner:",
      error
    );

    return null;
  }
}

function getLearnerStorageKey(learnerId) {
  if (
    typeof learnerId !== "string" ||
    !learnerId.trim()
  ) {
    return null;
  }

  return (
    LEARNER_STORAGE_PREFIX +
    encodeURIComponent(learnerId)
  );
}

// ------------------------------------------
// 5. SAFE JSON READING
// ------------------------------------------

function readStoredJSON(key) {
  if (!key) {
    return null;
  }

  try {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return null;
    }

    return JSON.parse(raw);

  } catch (error) {
    console.warn(
      "[AURA EDU] Cannot read storage:",
      key,
      error
    );

    return null;
  }
}

// ------------------------------------------
// 6. DATA NORMALIZATION
// ------------------------------------------

function normalizeLearningData(saved, learner) {
  const base = freshDefaults();

  if (
    !saved ||
    typeof saved !== "object" ||
    Array.isArray(saved)
  ) {
    return {
      ...base,
      learnerId: learner.id,
      name: learner.nickname || "Explorer"
    };
  }

  return {
    ...base,
    ...saved,

    learnerId: learner.id,
    name: learner.nickname || "Explorer",

    skills:
      saved.skills &&
      typeof saved.skills === "object" &&
      !Array.isArray(saved.skills)
        ? saved.skills
        : {},

    history:
      Array.isArray(saved.history)
        ? saved.history
        : []
  };
}

// ------------------------------------------
// 7. LOAD CURRENT LEARNER DATA
// ------------------------------------------

function load() {
  const learner = getCurrentLearner();

  if (!learner) {
    console.warn(
      "[AURA EDU] No valid active learner. " +
      "Learning data will not be saved."
    );

    return freshDefaults();
  }

  const storageKey =
    getLearnerStorageKey(learner.id);

  const saved = readStoredJSON(storageKey);

  // Never accept data explicitly bound
  // to a different learner.

  if (
    saved &&
    saved.learnerId &&
    saved.learnerId !== learner.id
  ) {
    console.error(
      "[AURA EDU] Learner identity conflict. " +
      "Stored data was not loaded."
    );

    return normalizeLearningData(null, learner);
  }

  return normalizeLearningData(saved, learner);
}

// ------------------------------------------
// 8. ACTIVE SESSION BINDING
// ------------------------------------------

// Capture the learner at page initialization.
// Never silently reassign an existing session
// when the active learner changes.

const initialLearner = getCurrentLearner();

const sessionLearnerId =
  initialLearner ? initialLearner.id : null;

let data = load();

function validateActiveSession() {
  if (!sessionLearnerId) {
    return false;
  }

  const current = getCurrentLearner();

  if (!current) {
    return false;
  }

  if (current.id !== sessionLearnerId) {
    console.warn(
      "[AURA EDU] Active learner changed. " +
      "Refresh the page before continuing."
    );

    return false;
  }

  if (
    data.learnerId &&
    data.learnerId !== sessionLearnerId
  ) {
    console.error(
      "[AURA EDU] Data identity mismatch."
    );

    return false;
  }

  return true;
}

// ------------------------------------------
// 9. SAVE CURRENT LEARNER DATA
// ------------------------------------------

function persist() {
  if (!validateActiveSession()) {
    console.warn(
      "[AURA EDU] Save blocked: " +
      "invalid learner session."
    );

    return false;
  }

  const storageKey =
    getLearnerStorageKey(sessionLearnerId);

  if (!storageKey) {
    return false;
  }

  // Protect existing data if the target key
  // contains a conflicting learner ID.

  const existing = readStoredJSON(storageKey);

  if (
    existing &&
    existing.learnerId &&
    existing.learnerId !== sessionLearnerId
  ) {
    console.error(
      "[AURA EDU] Save blocked: " +
      "storage identity conflict."
    );

    return false;
  }

  const learner = getCurrentLearner();

  data.learnerId = sessionLearnerId;
  data.name = learner.nickname || "Explorer";

  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify(data)
    );

  } catch (error) {
    console.warn(
      "[AURA EDU] Storage unavailable:",
      error
    );

    return false;
  }

  if (typeof renderStats === "function") {
    renderStats();
  }

  return true;
}

// ------------------------------------------
// 10. HTML ESCAPING
// ------------------------------------------

function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char])
  );
}

// ------------------------------------------
// 11. LEARNING EVENT LOGGING
// ------------------------------------------

function logEvent(type, details = {}) {
  if (!validateActiveSession()) {
    console.warn(
      "[AURA EDU] Event not recorded: " +
      "learner identity unavailable or changed."
    );

    return false;
  }

  const safeDetails = {
    ...details
  };

  // Caller-supplied identity fields
  // cannot override the session identity.

  delete safeDetails.learnerId;
  delete safeDetails.sessionLearnerId;

  data.history.push({
    ...safeDetails,
    type,
    time: new Date().toISOString(),
    learnerId: sessionLearnerId
  });

  if (data.history.length > 300) {
    data.history =
      data.history.slice(-300);
  }

  return true;
}

// ------------------------------------------
// 12. PAGE NAVIGATION
// ------------------------------------------

function navigate(id) {
  document.querySelectorAll(".page")
    .forEach(page => {
      page.classList.toggle(
        "active",
        page.id === id
      );
    });

  document.querySelectorAll(".nav")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === id
      );
    });

  if (
    id === "analytics" &&
    typeof renderStats === "function"
  ) {
    renderStats();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

document.querySelectorAll("[data-page]")
  .forEach(button => {
    button.onclick = () => {
      navigate(button.dataset.page);
    };
  });

document.querySelectorAll("[data-go]")
  .forEach(button => {
    button.onclick = () => {
      navigate(button.dataset.go);
    };
  });

// ------------------------------------------
// 13. GRADE OPTIONS
// ------------------------------------------

function gradeOptions() {
  return [3, 4, 5, 6, 7, 8, 9]
    .map(grade => {
      const level =
        grade <= 6
          ? "Primary"
          : "Junior Secondary";

      return (
        `<option value="${grade}">` +
        `Grade ${grade} · ${level}` +
        `</option>`
      );
    })
    .join("");
}

// ------------------------------------------
// 14. STUDENT PROFILE UI
// ------------------------------------------

function profileUI() {
  const learner = getCurrentLearner();

  const validSession =
    validateActiveSession();

  const nickname =
    validSession && learner
      ? learner.nickname || "Explorer"
      : "Select a learner";

  for (const id of [
    "student-grade",
    "curriculum-grade"
  ]) {
    const element = $(id);

    if (element) {
      element.innerHTML = gradeOptions();
      element.value = String(data.grade);
    }
  }

  if ($("student-name")) {
    $("student-name").value =
      validSession && learner
        ? learner.nickname || ""
        : "";

    // Nickname is managed centrally
    // by Learner Manager.
    $("student-name").readOnly = true;

    $("student-name").title =
      "Manage learner nicknames in Learner Manager.";
  }

  if ($("student-label")) {
    $("student-label").textContent =
      nickname;
  }

  if ($("sound-toggle")) {
    $("sound-toggle").checked =
      Boolean(data.sound);
  }

  if ($("voice-toggle")) {
    $("voice-toggle").checked =
      Boolean(data.voice);
  }

  if ($("voice-rate")) {
    $("voice-rate").value =
      String(data.speechRate);
  }

  if ($("save-profile")) {
    $("save-profile").disabled =
      !validSession;
  }
}

// ------------------------------------------
// 15. SAVE GRADE PREFERENCE
// ------------------------------------------

if ($("save-profile")) {
  $("save-profile").onclick = () => {
    if (!validateActiveSession()) {
      alert(
        "当前学生身份无效或已切换。" +
        "请先在 Learner Manager 选择学生，" +
        "然后刷新首页。"
      );

      return;
    }

    const grade = Number(
      $("student-grade").value
    );

    if (
      !Number.isInteger(grade) ||
      grade < 3 ||
      grade > 9
    ) {
      alert("Please choose a valid grade.");
      return;
    }

    data.grade = grade;

    if ($("curriculum-grade")) {
      $("curriculum-grade").value =
        String(grade);
    }

    if (typeof renderUnits === "function") {
      renderUnits();
    }

    if (persist()) {
      profileUI();

      alert(
        "Grade saved for the current learner. " +
        "Nickname is managed in Learner Manager."
      );
    } else {
      alert(
        "Save blocked because the learner " +
        "identity could not be verified."
      );
    }
  };
}

// ------------------------------------------
// 16. IDENTITY STATUS
// ------------------------------------------

function getAuraLearnerDataStatus() {
  const learner = getCurrentLearner();

  const storageKey =
    sessionLearnerId
      ? getLearnerStorageKey(sessionLearnerId)
      : null;

  return {
    identityServiceLoaded:
      Boolean(getIdentityService()),

    sessionLearnerId,

    activeLearnerId:
      learner ? learner.id : null,

    activeLearnerNickname:
      learner ? learner.nickname : null,

    sessionValid:
      validateActiveSession(),

    storageKey,

    learnerDataExists:
      storageKey
        ? localStorage.getItem(storageKey) !== null
        : false,

    legacyDataPreserved:
      localStorage.getItem(KEY) !== null,

    legacyBackupPreserved:
      localStorage.getItem(
        LEGACY_BACKUP_KEY
      ) !== null
  };
}

window.AuraLearnerDataStatus =
  getAuraLearnerDataStatus;

// ------------------------------------------
// 17. IDENTITY CHANGE PROTECTION
// ------------------------------------------

// If another page changes the active learner,
// reload this page so all modules initialize
// with the correct learner's data.

window.addEventListener(
  "focus",
  () => {
    const current = getCurrentLearner();

    const currentId =
      current ? current.id : null;

    if (currentId !== sessionLearnerId) {
      console.warn(
        "[AURA EDU] Learner changed. " +
        "Reloading to prevent data mixing."
      );

      window.location.reload();
    }
  }
);

window.addEventListener(
  "pageshow",
  event => {
    if (!event.persisted) {
      return;
    }

    const current = getCurrentLearner();

    const currentId =
      current ? current.id : null;

    if (currentId !== sessionLearnerId) {
      window.location.reload();
    }
  }
);

// ------------------------------------------
// 18. STARTUP MESSAGE
// ------------------------------------------

console.info(
  "[AURA EDU] Stage 21.5.2 " +
  "Multi-Learner Core ready."
);

console.info(
  "[AURA EDU] Learner storage:",
  getAuraLearnerDataStatus()
);
