
/* ============================================
   AURA EDU — ADVENTURE WORLD
   STAGE 23.2 PARTNER SELECTION

   - Four selectable partners
   - Learner-scoped partner preferences
   - Safe localStorage writes
   - No changes to learner profiles
   - No changes to G1 / G2 / G3
   - No reward or mastery manipulation
============================================ */

(function () {
  "use strict";

  const ACTIVE_KEY = "aura_active_learner_id_v2";
  const PROFILES_KEY = "aura_learner_profiles_v2";

  const PARTNER_KEY_PREFIX =
    "aura_adventure_partner_v1_";

  const partners = {
    mia: {
      name: "Mia",
      avatar: "👧🏻",
      description:
        "Mia is cheerful and friendly. " +
        "She loves meeting new friends. " +
        "Mia 喜欢结交新朋友！"
    },

    leo: {
      name: "Leo",
      avatar: "👦🏻",
      description:
        "Leo is curious and adventurous. " +
        "He loves exploring new places. " +
        "Leo 喜欢探索新世界！"
    },

    luna: {
      name: "Luna",
      avatar: "👩🏻",
      description:
        "Luna is kind and thoughtful. " +
        "She enjoys learning and reading. " +
        "Luna 喜欢阅读和学习！"
    },

    finn: {
      name: "Finn",
      avatar: "🦊",
      description:
        "Finn is a playful little fox. " +
        "He loves adventures and challenges. " +
        "Finn 是一只充满活力的小狐狸！"
    }
  };

  const $ = id => document.getElementById(id);

  let selectedPartner = null;
  let activeLearnerId = null;

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn(
        "[Adventure] Cannot parse storage:",
        error
      );
      return fallback;
    }
  }

  function getActiveLearnerId() {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);

      if (!raw) return null;

      // Supports both a plain string ID and a
      // JSON-encoded string ID.
      if (raw.startsWith('"')) {
        const parsed = JSON.parse(raw);
        return typeof parsed === "string"
          ? parsed
          : null;
      }

      return raw;
    } catch (error) {
      console.warn(
        "[Adventure] Identity read failed:",
        error
      );
      return null;
    }
  }

  function getLearnerName(id) {
    const profiles = readJSON(PROFILES_KEY, null);

    if (!profiles) return null;

    let list = [];

    if (Array.isArray(profiles)) {
      list = profiles;
    } else if (
      profiles &&
      Array.isArray(profiles.profiles)
    ) {
      list = profiles.profiles;
    } else if (
      profiles &&
      typeof profiles === "object"
    ) {
      list = Object.values(profiles);
    }

    const profile = list.find(item =>
      item &&
      typeof item === "object" &&
      String(item.id ?? item.learnerId ?? "") ===
        String(id)
    );

    return profile
      ? (profile.name || profile.displayName || null)
      : null;
  }

  function getPartnerStorageKey() {
    if (!activeLearnerId) return null;

    return PARTNER_KEY_PREFIX +
      encodeURIComponent(activeLearnerId);
  }

  function setStatus(message) {
    $("status").textContent = message;
  }

  function renderSelection() {
    document.querySelectorAll(
      ".character-card"
    ).forEach(card => {
      const id = card.dataset.partner;
      const selected = id === selectedPartner;

      card.classList.toggle(
        "selected",
        selected
      );

      const button = card.querySelector(
        "[data-select]"
      );

      button.textContent = selected
        ? "✓ Selected"
        : "Choose " + partners[id].name;

      button.setAttribute(
        "aria-pressed",
        String(selected)
      );
    });

    if (!selectedPartner) {
      $("preview-name").textContent =
        "Select a partner";

      $("preview-description").textContent =
        "Choose a character above to see your partner.";

      $("preview-avatar").textContent = "✨";
      $("save-partner").disabled = true;
      return;
    }

    const partner = partners[selectedPartner];

    $("preview-name").textContent =
      partner.name;

    $("preview-description").textContent =
      partner.description;

    $("preview-avatar").textContent =
      partner.avatar;

    $("save-partner").disabled =
      !activeLearnerId;
  }

  function selectPartner(id) {
    if (!Object.prototype.hasOwnProperty.call(
      partners, id
    )) {
      return;
    }

    selectedPartner = id;
    renderSelection();

    setStatus(
      partners[id].name +
      " selected. Click Save My Partner to confirm."
    );
  }

  function savePartner() {
    if (!selectedPartner) {
      setStatus("Please choose a partner first.");
      return;
    }

    // Recheck identity before writing, to avoid
    // saving under the wrong learner after a switch.
    const currentId = getActiveLearnerId();

    if (
      !activeLearnerId ||
      currentId !== activeLearnerId
    ) {
      setStatus(
        "Learner identity changed or is missing. " +
        "Please refresh this page."
      );
      return;
    }

    const key = getPartnerStorageKey();

    if (!key) {
      setStatus(
        "Please select an active learner first."
      );
      return;
    }

    try {
      localStorage.setItem(
        key,
        selectedPartner
      );

      setStatus(
        "✓ Saved! " +
        partners[selectedPartner].name +
        " is now your selected adventure partner."
      );
    } catch (error) {
      console.error(
        "[Adventure] Save failed:",
        error
      );

      setStatus(
        "Could not save the selection. " +
        "Please check browser storage settings."
      );
    }
  }

  function loadSavedPartner() {
    const key = getPartnerStorageKey();

    if (!key) return;

    try {
      const saved = localStorage.getItem(key);

      if (
        saved &&
        Object.prototype.hasOwnProperty.call(
          partners, saved
        )
      ) {
        selectedPartner = saved;
        setStatus(
          "Your saved partner has been restored."
        );
      }
    } catch (error) {
      console.warn(
        "[Adventure] Load failed:",
        error
      );
    }
  }

  function initialize() {
    activeLearnerId = getActiveLearnerId();

    if (activeLearnerId) {
      const name = getLearnerName(
        activeLearnerId
      );

      $("learner-label").textContent =
        "👤 Current learner: " +
        (name || activeLearnerId);
    } else {
      $("learner-label").textContent =
        "⚠ No active learner selected";

      setStatus(
        "Open Learner Manager and select a " +
        "student before saving a partner."
      );
    }

    document.querySelectorAll(
      "[data-select]"
    ).forEach(button => {
      button.addEventListener(
        "click",
        () => {
          selectPartner(
            button.dataset.select
          );
        }
      );
    });

    $("save-partner").addEventListener(
      "click",
      savePartner
    );

    $("reset-preview").addEventListener(
      "click",
      () => {
        selectedPartner = null;
        renderSelection();

        setStatus(
          "Selection cleared from the preview. " +
          "Your previously saved partner " +
          "has not been deleted."
        );
      }
    );

    loadSavedPartner();
    renderSelection();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  } else {
    initialize();
  }
})();
