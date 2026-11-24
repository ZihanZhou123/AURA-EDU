
/* ============================================
   AURA EDU V2.2
   STAGE 24.8.1

   ADVENTURE MAP + SPELLING INTEGRATION

   Preserved:
   - Learner identity and name
   - Selected learning partner
   - SVG walking path and animation
   - Demo Walk / Back to Start
   - Grammar G1/G2/G3 eligibility
   - Learner isolation
   - Read-only progression

   New:
   - Spelling Garden destination
   - Grammar-gated Spelling access
   - Spelling checkpoint movement
   - Speaking remains locked

   No localStorage writes.
============================================ */

(function () {
  "use strict";

  const $ = id => document.getElementById(id);

  const ACTIVE_KEY =
    "aura_active_learner_id_v2";

  const PROFILES_KEY =
    "aura_learner_profiles_v2";

  const PARTNER_PREFIX =
    "aura_adventure_partner_v1_";

  const partners = {
    mia: { name: "Mia", avatar: "👧🏻" },
    leo: { name: "Leo", avatar: "👦🏻" },
    luna: { name: "Luna", avatar: "👩🏻" },
    finn: { name: "Finn", avatar: "🦊" }
  };

  const levels = {
    1: {
      name: "Grammar",
      title: "📚 Grammar Challenge",
      progress: 0,
      destination: "grammar-hub.html"
    },
    2: {
      name: "Spelling",
      title: "✏️ Spelling Garden",
      progress: 0.48,
      destination: "spelling-garden.html"
    },
    3: {
      name: "Speaking",
      title: "🎤 Speaking Classroom",
      progress: 1,
      destination: null
    }
  };

  const state = {
    selectedLevel: 1,
    position: 0,
    moving: false,
    animationId: null,
    motionToken: 0,
    demoRunning: false,
    learnerId: null,
    grammarReport: null,
    spellingEligible: false,
    evidenceError: false
  };

  let path = null;
  let character = null;

  // ========================================
  // 1. STORAGE READING
  // ========================================

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);

      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn(
        "[Adventure] Storage read error:",
        error
      );
      return fallback;
    }
  }

  function getActiveLearnerId() {
    try {
      const identity = window.AuraLearnerIdentity;

      if (
        identity &&
        typeof identity.getActiveLearnerId ===
          "function"
      ) {
        const id = identity.getActiveLearnerId();

        if (id !== null && id !== undefined) {
          return String(id);
        }
      }

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
      console.warn(
        "[Adventure] Identity error:",
        error
      );
      return null;
    }
  }

  // ========================================
  // 2. LEARNER PROFILE
  // ========================================

  function findLearnerProfile(data, id) {
    if (!data || !id) return null;

    const target = String(id);
    const visited = new Set();

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

  function getProfileName(profile) {
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

    for (const candidate of candidates) {
      if (
        typeof candidate === "string" &&
        candidate.trim()
      ) {
        return candidate.trim();
      }
    }

    return null;
  }

  function getLearnerName(id) {
    if (!id) return null;

    const data = readJSON(PROFILES_KEY, null);

    const profile = findLearnerProfile(
      data,
      id
    );

    return getProfileName(profile);
  }

  function loadLearnerAndPartner() {
    const id = getActiveLearnerId();

    state.learnerId = id;

    if (!id) {
      $("learner-name").textContent =
        "👤 请先选择学生";

      $("partner-name").textContent =
        "🎒 Explorer";

      $("character-name").textContent =
        "Explorer";

      $("character-avatar").textContent =
        "🧑‍🚀";

      return;
    }

    const name = getLearnerName(id);

    $("learner-name").textContent =
      name
        ? "👤 " + name
        : "👤 姓名未设置";

    $("learner-name").title =
      name
        ? "当前学习者：" + name
        : "请在 Learner Manager 检查姓名";

    const key =
      PARTNER_PREFIX +
      encodeURIComponent(id);

    let savedPartner = null;

    try {
      savedPartner = localStorage.getItem(key);
    } catch (error) {
      console.warn(
        "[Adventure] Partner read error:",
        error
      );
    }

    const partner =
      partners[savedPartner] || {
        name: "Explorer",
        avatar: "🧑‍🚀"
      };

    $("partner-name").textContent =
      "🎒 " + partner.name;

    $("character-name").textContent =
      partner.name;

    $("character-avatar").textContent =
      partner.avatar;
  }

  // ========================================
  // 3. GRAMMAR EVIDENCE
  // ========================================

  function readGrammarEvidence() {
    state.grammarReport = null;
    state.spellingEligible = false;
    state.evidenceError = false;

    const engine = window.AuraGrammarUnlock;

    if (
      !engine ||
      typeof engine.evaluateGrammar !==
        "function"
    ) {
      state.evidenceError = true;
      return;
    }

    try {
      const report = engine.evaluateGrammar();

      state.grammarReport = report;

      if (
        !report ||
        report.ok !== true ||
        !state.learnerId ||
        String(report.learnerId) !==
          String(state.learnerId)
      ) {
        state.evidenceError = true;
        return;
      }

      state.spellingEligible =
        report.spellingEligible === true &&
        report.grammarComplete === true;

    } catch (error) {
      console.error(
        "[Adventure] Grammar evidence:",
        error
      );

      state.evidenceError = true;
    }
  }

  function loadGrammarEngine() {
    if (
      window.AuraGrammarUnlock &&
      typeof window.AuraGrammarUnlock.evaluateGrammar ===
        "function"
    ) {
      refreshLearningState();
      return;
    }

    const script = document.createElement("script");

    script.src = "js/grammar-unlock.js";

    script.onload = refreshLearningState;

    script.onerror = function () {
      console.warn(
        "[Adventure] Grammar engine unavailable"
      );

      refreshLearningState();
    };

    document.head.appendChild(script);
  }

  // ========================================
  // 4. LEVEL ELIGIBILITY
  // ========================================

  function canEnter(level) {
    if (level === 1) return true;

    if (level === 2) {
      return Boolean(
        state.learnerId &&
        !state.evidenceError &&
        state.spellingEligible
      );
    }

    return false;
  }

  function getLevelDescription(level) {
    if (level === 1) {
      return (
        "第一关：进入 Grammar Hub，" +
        "学习或复习 G1、G2、G3。"
      );
    }

    if (level === 2) {
      if (!state.learnerId) {
        return (
          "请先在 Learner Manager 选择学生，" +
          "再检查 Grammar 学习进度。"
        );
      }

      if (state.evidenceError) {
        return (
          "暂时无法验证 Grammar 学习证据。" +
          "请刷新页面或检查学习记录。" +
          "Spelling 入口暂时保持锁定。"
        );
      }

      if (state.spellingEligible) {
        return (
          "🌟 Grammar 暂定掌握条件已满足！" +
          "可以进入 Spelling Garden，" +
          "完成诊断、自适应练习和独立复测。"
        );
      }

      return (
        "🔒 请先完成 G1、G2、G3 的学习" +
        "及独立复测，并达到 Grammar" +
        " 暂定掌握条件。"
      );
    }

    return (
      "🔒 Speaking 正式挑战尚未开放。" +
      "当前 Spelling 暂定掌握不代表" +
      " Speaking 已经解锁。"
    );
  }

  function updateCheckpointVisuals() {
    document.querySelectorAll(
      "[data-level]"
    ).forEach(button => {
      const level = Number(button.dataset.level);

      const symbol = button.querySelector(
        ".level-symbol"
      );

      const label = $("label-" + level);

      const available = canEnter(level);

      button.classList.toggle(
        "locked",
        !available
      );

      // Keep checkpoints selectable so students
      // can read explanations for locked levels.
      button.disabled = false;

      if (level === 1) {
        button.setAttribute(
          "aria-label",
          "Grammar checkpoint, available"
        );

        if (symbol) symbol.textContent = "⭐";
      } else if (level === 2 && available) {
        button.setAttribute(
          "aria-label",
          "Spelling checkpoint, available"
        );

        if (symbol) symbol.textContent = "🌟";
      } else {
        button.setAttribute(
          "aria-label",
          levels[level].name +
          " checkpoint, locked"
        );

        if (symbol) symbol.textContent = "🔒";
      }

      if (label) {
        label.title = available
          ? "可以进入 " + levels[level].name
          : "尚未解锁";
      }
    });
  }

  function showLevel(level) {
    const data = levels[level];

    if (!data) return;

    state.selectedLevel = level;

    $("checkpoint-title").textContent =
      data.title;

    $("checkpoint-description").textContent =
      getLevelDescription(level);

    const enter = $("enter-level");

    if (level === 1) {
      enter.textContent = "Enter Grammar";
      enter.disabled = false;
    } else if (level === 2 && canEnter(2)) {
      enter.textContent =
        "Enter Spelling Garden ✨";

      enter.disabled = false;
    } else {
      enter.textContent =
        data.name + " Locked";

      enter.disabled = true;
    }

    document.querySelectorAll(
      ".level"
    ).forEach(button => {
      button.classList.toggle(
        "selected",
        Number(button.dataset.level) === level
      );
    });
  }

  function refreshLearningState() {
    const previousId = state.learnerId;

    loadLearnerAndPartner();
    readGrammarEvidence();

    if (previousId !== state.learnerId) {
      stopDemo();

      state.position = 0;
      placeCharacter(0);
    }

    updateCheckpointVisuals();
    showLevel(state.selectedLevel);

    console.info(
      "[Adventure] Stage 24.8.1 refreshed",
      {
        learnerId: state.learnerId,
        learnerName:
          getLearnerName(state.learnerId),
        spellingEligible:
          state.spellingEligible,
        evidenceError:
          state.evidenceError,
        speakingEligible: false
      }
    );
  }

  // ========================================
  // 5. SVG PATH
  // ========================================

  function getPathPoint(progress) {
    const length = path.getTotalLength();

    const safe = Math.max(
      0,
      Math.min(1, progress)
    );

    return path.getPointAtLength(
      length * safe
    );
  }

  function setPosition(element, x, y) {
    element.style.left =
      (x / 1000 * 100) + "%";

    element.style.top =
      (y / 620 * 100) + "%";
  }

  function placeCharacter(progress) {
    const point = getPathPoint(progress);

    setPosition(
      character,
      point.x,
      point.y - 19
    );
  }

  function positionCheckpoints() {
    Object.keys(levels).forEach(key => {
      const level = Number(key);
      const data = levels[level];

      const point = getPathPoint(data.progress);

      const button = document.querySelector(
        '[data-level="' + level + '"]'
      );

      const label = $("label-" + level);

      if (button) {
        setPosition(
          button,
          point.x,
          point.y
        );
      }

      if (label) {
        setPosition(
          label,
          point.x,
          point.y + 70
        );
      }
    });
  }

  // ========================================
  // 6. WALKING ANIMATION
  // ========================================

  function cancelMovement() {
    state.motionToken += 1;

    if (state.animationId !== null) {
      cancelAnimationFrame(
        state.animationId
      );
    }

    state.animationId = null;
    state.moving = false;

    character.classList.remove("walking");
  }

  function moveTo(target, onComplete) {
    cancelMovement();

    const token = state.motionToken;

    const startPosition = state.position;

    const endPosition = Math.max(
      0,
      Math.min(1, target)
    );

    const distance = Math.abs(
      endPosition - startPosition
    );

    const reducedMotion =
      window.matchMedia &&
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    if (distance < 0.001 || reducedMotion) {
      state.position = endPosition;
      placeCharacter(endPosition);

      if (onComplete) onComplete();
      return;
    }

    const duration = Math.max(
      600,
      distance * 3400
    );

    let startTime = null;

    state.moving = true;
    character.classList.add("walking");

    function animate(timestamp) {
      if (token !== state.motionToken) return;

      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;

      const t = Math.min(
        elapsed / duration,
        1
      );

      const eased = t * t * (3 - 2 * t);

      const progress =
        startPosition +
        (endPosition - startPosition) * eased;

      placeCharacter(progress);

      if (t < 1) {
        state.animationId =
          requestAnimationFrame(animate);
      } else {
        state.position = endPosition;
        state.animationId = null;
        state.moving = false;

        character.classList.remove("walking");

        if (onComplete) onComplete();
      }
    }

    state.animationId =
      requestAnimationFrame(animate);
  }

  // ========================================
  // 7. CHECKPOINT SELECTION
  // ========================================

  function selectLevel(level) {
    const data = levels[level];

    if (!data) return;

    state.demoRunning = false;
    setDemoButton(false);
    cancelMovement();

    showLevel(level);

    // Locked checkpoints remain selectable
    // for explanation but cannot be entered.
    if (!canEnter(level)) return;

    const selectedLearner = state.learnerId;

    moveTo(data.progress, function () {
      // Refresh evidence before displaying
      // arrival state, protecting learner changes.
      refreshLearningState();

      if (state.learnerId !== selectedLearner) {
        return;
      }

      if (canEnter(level)) {
        $("checkpoint-description").textContent =
          level === 1
            ? "📚 已到达 Grammar 关卡！" +
              "可以进入 Grammar Hub。"
            : "🌟 已到达 Spelling Garden！" +
              "点击 Enter Spelling Garden 开始学习。";
      }
    });
  }

  function enterLevel() {
    // Re-read identity and real evidence at click.
    refreshLearningState();

    const level = state.selectedLevel;

    if (!canEnter(level)) {
      showLevel(level);
      return;
    }

    const destination =
      levels[level]?.destination;

    if (!destination) return;

    stopDemo();

    window.location.href = destination;
  }

  // ========================================
  // 8. DEMO WALK
  // ========================================

  function setDemoButton(running) {
    $("demo-walk").textContent =
      running
        ? "■ Stop Demo"
        : "▶ Demo Walk";
  }

  function stopDemo() {
    state.demoRunning = false;
    cancelMovement();
    setDemoButton(false);
  }

  function startDemo() {
    if (state.demoRunning) {
      stopDemo();

      $("checkpoint-description").textContent =
        "试玩已停止，真实关卡状态不变。";

      return;
    }

    cancelMovement();

    state.demoRunning = true;
    setDemoButton(true);

    $("checkpoint-description").textContent =
      "试玩模式：伙伴经过三个关卡。" +
      "不会写入学习记录或解锁资格。";

    const route = [
      levels[1].progress,
      levels[2].progress,
      levels[3].progress
    ];

    let index = 0;

    function walkNext() {
      if (!state.demoRunning) return;

      if (index >= route.length) {
        state.demoRunning = false;
        setDemoButton(false);

        $("checkpoint-description").textContent =
          "🌟 试玩完成！" +
          "真实关卡状态没有改变。";

        return;
      }

      const target = route[index];
      index += 1;

      moveTo(target, walkNext);
    }

    walkNext();
  }

  // ========================================
  // 9. BACK TO START
  // ========================================

  function backToStart() {
    stopDemo();

    showLevel(1);

    moveTo(
      levels[1].progress,
      function () {
        $("checkpoint-description").textContent =
          "已回到 Grammar 起点。" +
          "可以重新开始冒险。";
      }
    );
  }

  // ========================================
  // 10. INITIALIZATION
  // ========================================

  function initialize() {
    path = $("walking-path");
    character = $("character");

    if (!path || !character) {
      console.error(
        "[Adventure] SVG path or character missing"
      );
      return;
    }

    positionCheckpoints();
    placeCharacter(0);

    loadLearnerAndPartner();
    showLevel(1);

    document.querySelectorAll(
      "[data-level]"
    ).forEach(button => {
      button.addEventListener(
        "click",
        function () {
          selectLevel(
            Number(button.dataset.level)
          );
        }
      );
    });

    $("enter-level").addEventListener(
      "click",
      enterLevel
    );

    $("demo-walk").addEventListener(
      "click",
      startDemo
    );

    $("back-start").addEventListener(
      "click",
      backToStart
    );

    window.addEventListener(
      "focus",
      refreshLearningState
    );

    document.addEventListener(
      "visibilitychange",
      function () {
        if (!document.hidden) {
          refreshLearningState();
        }
      }
    );

    window.addEventListener(
      "storage",
      refreshLearningState
    );

    window.addEventListener(
      "pagehide",
      stopDemo
    );

    loadGrammarEngine();
  }

  window.AuraAdventureMap =
    Object.freeze({
      refresh: refreshLearningState
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
