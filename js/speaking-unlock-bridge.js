
/* ============================================
   AURA EDU V3 — STAGE 30.1A

   SPEAKING UNLOCK + MAP POSITION MEMORY

   Preserved:
   - Grammar eligibility
   - Spelling provisional mastery
   - Speaking unlock
   - Speaking navigation
   - Learner-bound evidence
   - Mastery panel updates

   Added:
   - Per-learner map position memory
   - Restore selected checkpoint on return
   - Never use memory to unlock a level
   - No changes to learning records
============================================ */

(function () {
  "use strict";

  const ACTIVE_KEY =
    "aura_active_learner_id_v2";

  const POSITION_PREFIX =
    "aura_adventure_position_v3_";

  const SPEAKING_URL =
    "speaking-stage29.html";

  const $ = id =>
    document.getElementById(id);

  let selectedSpeaking = false;
  let previousLearner = null;
  let restoreTimer = null;
  let restoreToken = 0;

  // ========================================
  // 1. LEARNER IDENTITY
  // ========================================

  function learnerId() {
    try {
      const raw =
        localStorage.getItem(ACTIVE_KEY);

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

  function positionKey(id) {
    return POSITION_PREFIX +
      encodeURIComponent(id);
  }

  // ========================================
  // 2. ORIGINAL SPEAKING ELIGIBILITY
  // ========================================

  function evaluate() {
    const id = learnerId();

    const result = {
      learnerId: id,
      grammarEligible: false,
      spellingMastery: false,
      speakingEligible: false
    };

    if (!id) return result;

    try {
      const grammar =
        window.AuraGrammarUnlock;

      const spelling =
        window.AuraSpellingMastery;

      if (
        !grammar ||
        typeof grammar.evaluateGrammar !==
          "function" ||
        !spelling ||
        typeof spelling.evaluate !==
          "function"
      ) {
        return result;
      }

      const g = grammar.evaluateGrammar();

      result.grammarEligible = Boolean(
        g &&
        g.ok === true &&
        String(g.learnerId) === id &&
        g.grammarComplete === true &&
        g.spellingEligible === true
      );

      if (!result.grammarEligible) {
        return result;
      }

      const s = spelling.evaluate(id);

      result.spellingMastery = Boolean(
        s &&
        s.ok === true &&
        String(s.learnerId) === id &&
        s.decision ===
          "PROVISIONAL_MASTERY" &&
        s.provisionalMastery === true
      );

      result.speakingEligible =
        result.spellingMastery;

    } catch (error) {
      console.error(
        "[Speaking Unlock]",
        error
      );
    }

    return result;
  }

  // ========================================
  // 3. ORIGINAL MASTERY PANEL
  // ========================================

  function updatePanel(report) {
    const footer = document.querySelector(
      "#aura-mastery-panel .am-footer"
    );

    if (!footer) return;

    for (const child of footer.children) {
      if (
        child.id !==
          "aura-speaking-unlock-note" &&
        child.textContent.trim() ===
          "Speaking：等待 Spelling 独立评估。"
      ) {
        child.hidden = true;
      }
    }

    let note =
      $("aura-speaking-unlock-note");

    if (!note) {
      note = document.createElement("p");

      note.id =
        "aura-speaking-unlock-note";

      footer.appendChild(note);
    }

    const message =
      report.speakingEligible
        ? "🎤 Speaking UNLOCKED：" +
          "Spelling 已达到暂定掌握。"
        : "🔒 Speaking LOCKED：" +
          "等待当前学生达到 " +
          "Spelling 暂定掌握。";

    if (note.textContent !== message) {
      note.textContent = message;
    }
  }

  // ========================================
  // 4. ORIGINAL SPEAKING CHECKPOINT
  // ========================================

  function updateCheckpoint(report) {
    const button = document.querySelector(
      '.level[data-level="3"]'
    );

    if (!button) return;

    button.classList.toggle(
      "locked",
      !report.speakingEligible
    );

    button.setAttribute(
      "aria-label",
      report.speakingEligible
        ? "Speaking checkpoint, available"
        : "Speaking checkpoint, locked"
    );

    const symbol =
      button.querySelector(".level-symbol");

    if (symbol) {
      symbol.textContent =
        report.speakingEligible
          ? "🌟"
          : "🔒";
    }

    const label = $("label-3");

    if (label) {
      label.title =
        report.speakingEligible
          ? "Speaking 已解锁"
          : "Speaking 尚未解锁";
    }
  }

  // ========================================
  // 5. ORIGINAL SPEAKING SELECTION
  // ========================================

  function updateSpeakingSelection(report) {
    if (!selectedSpeaking) return;

    const title =
      $("checkpoint-title");

    const description =
      $("checkpoint-description");

    const enter =
      $("enter-level");

    if (title) {
      title.textContent =
        "🎤 Speaking Classroom";
    }

    if (description) {
      description.textContent =
        report.speakingEligible
          ? "🌟 Spelling 已达到 " +
            "Provisional Mastery。" +
            "可以进入 Stage 29 Speaking。" +
            "遇到困难时可返回 " +
            "Grammar 或 Spelling 复习。"
          : "🔒 请先完成当前学生的 " +
            "Spelling 独立复测，" +
            "并达到暂定掌握。";
    }

    if (enter) {
      enter.textContent =
        report.speakingEligible
          ? "Enter Speaking 🎤"
          : "Speaking Locked";

      enter.disabled =
        !report.speakingEligible;
    }

    document.querySelectorAll(
      ".level"
    ).forEach(button => {
      button.classList.toggle(
        "selected",
        Number(button.dataset.level) === 3
      );
    });
  }

  // ========================================
  // 6. POSITION MEMORY
  // ========================================

  function canVisit(level, report) {
    if (!report.learnerId) {
      return false;
    }

    if (level === 1) {
      return true;
    }

    if (level === 2) {
      return report.grammarEligible;
    }

    if (level === 3) {
      return report.speakingEligible;
    }

    return false;
  }

  function savePosition(level) {
    const report = evaluate();

    if (!canVisit(level, report)) {
      return false;
    }

    try {
      localStorage.setItem(
        positionKey(report.learnerId),
        String(level)
      );

      return true;
    } catch (error) {
      console.warn(
        "[Adventure Position] Save failed",
        error
      );

      return false;
    }
  }

  function readPosition(id) {
    if (!id) return null;

    try {
      const raw = localStorage.getItem(
        positionKey(id)
      );

      if (raw === null) {
        return null;
      }

      const level = Number(raw);

      return [1, 2, 3].includes(level)
        ? level
        : null;

    } catch (error) {
      console.warn(
        "[Adventure Position] Read failed",
        error
      );

      return null;
    }
  }

  function restorePosition() {
    const report = evaluate();

    if (!report.learnerId) {
      return;
    }

    const savedLevel =
      readPosition(report.learnerId);

    if (savedLevel === null) {
      return;
    }

    // Saved progress never grants access.
    // Fall back to the highest eligible
    // checkpoint if access has changed.

    let target = savedLevel;

    if (!canVisit(target, report)) {
      target = report.grammarEligible
        ? 2
        : 1;
    }

    if (!canVisit(target, report)) {
      return;
    }

    const button = document.querySelector(
      '.level[data-level="' +
      target +
      '"]'
    );

    if (!button) return;

    // Use the original map's click handling,
    // so the character follows the SVG path.
    // The Speaking bridge handles level 3.

    button.click();

    console.info(
      "[Adventure Position] Restored",
      {
        learnerId: report.learnerId,
        checkpoint: target
      }
    );
  }

  function scheduleRestore() {
    restoreToken += 1;

    const token = restoreToken;

    if (restoreTimer !== null) {
      clearTimeout(restoreTimer);
    }

    restoreTimer = setTimeout(
      function () {
        restoreTimer = null;

        if (token !== restoreToken) {
          return;
        }

        restorePosition();
      },
      180
    );
  }

  // ========================================
  // 7. REFRESH
  // ========================================

  function refresh() {
    const report = evaluate();

    if (
      previousLearner !==
      report.learnerId
    ) {
      const hadPreviousLearner =
        previousLearner !== null;

      selectedSpeaking = false;

      previousLearner =
        report.learnerId;

      if (hadPreviousLearner) {
        scheduleRestore();
      }
    }

    updateCheckpoint(report);
    updatePanel(report);
    updateSpeakingSelection(report);

    return report;
  }

  // ========================================
  // 8. CHECKPOINT INTERACTION
  // ========================================

  function onCheckpointClick(event) {
    const button = event.target.closest(
      ".level[data-level]"
    );

    if (!button) return;

    const level =
      Number(button.dataset.level);

    if (level !== 3) {
      selectedSpeaking = false;

      // Grammar and Spelling retain the
      // original map movement handlers.
      savePosition(level);

      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    selectedSpeaking = true;

    const report = refresh();

    if (report.speakingEligible) {
      savePosition(3);
    }
  }

  // ========================================
  // 9. SPEAKING NAVIGATION
  // ========================================

  function onEnterClick(event) {
    const button = event.target.closest(
      "#enter-level"
    );

    if (!button || !selectedSpeaking) {
      return;
    }

    const selected = document.querySelector(
      '.level[data-level="3"].selected'
    );

    if (!selected) {
      selectedSpeaking = false;
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (!refresh().speakingEligible) {
      return;
    }

    savePosition(3);

    window.top.location.href =
      SPEAKING_URL;
  }

  // ========================================
  // 10. INITIALIZATION
  // ========================================

  function init() {
    document.addEventListener(
      "click",
      onCheckpointClick,
      true
    );

    document.addEventListener(
      "click",
      onEnterClick,
      true
    );

    const panel =
      $("aura-mastery-panel");

    if (panel) {
      const observer =
        new MutationObserver(function () {
          updatePanel(evaluate());
        });

      observer.observe(panel, {
        childList: true,
        subtree: true
      });
    }

    window.addEventListener(
      "focus",
      function () {
        setTimeout(refresh, 0);
      }
    );

    window.addEventListener(
      "pageshow",
      function () {
        setTimeout(refresh, 0);
      }
    );

    window.addEventListener(
      "storage",
      function () {
        setTimeout(refresh, 0);
      }
    );

    document.addEventListener(
      "visibilitychange",
      function () {
        if (!document.hidden) {
          setTimeout(refresh, 0);
        }
      }
    );

    refresh();

    // The parent mastery map loads this
    // script after the original map.
    scheduleRestore();
  }

  window.AuraSpeakingUnlock =
    Object.freeze({
      evaluate,
      refresh,
      restorePosition,
      savePosition,
      readPosition
    });

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
