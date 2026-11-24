
/* ============================================
   AURA EDU — LEARNER IDENTITY SERVICE
   STEP 18 / VERSION 1.0

   Purpose:
   - Read the active local learner
   - Create learner-bound learning sessions
   - Preserve learner identity during a session
   - Prevent accidental reassignment
   - Support G1 / G2 / G3 integration

   This is NOT user authentication.
============================================ */

(function () {
  "use strict";

  const PROFILES_KEY = "aura_learner_profiles_v2";
  const ACTIVE_KEY = "aura_active_learner_id_v2";

  const MODULES = ["G1", "G2", "G3"];

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);

      if (!raw) {
        return fallback;
      }

      return JSON.parse(raw);
    } catch (error) {
      console.error(
        "[AURA Identity] Storage error:",
        error
      );

      return fallback;
    }
  }

  function getProfiles() {
    const profiles = readJSON(PROFILES_KEY, []);

    if (!Array.isArray(profiles)) {
      return [];
    }

    return profiles.filter(profile =>
      profile &&
      typeof profile.id === "string" &&
      profile.id.length > 0
    );
  }

  function getActiveLearnerId() {
    return localStorage.getItem(ACTIVE_KEY);
  }

  function getActiveLearner() {
    const activeId = getActiveLearnerId();

    if (!activeId) {
      return null;
    }

    return getProfiles().find(
      profile => profile.id === activeId
    ) || null;
  }

  function findLearner(learnerId) {
    if (!learnerId) {
      return null;
    }

    return getProfiles().find(
      profile => profile.id === learnerId
    ) || null;
  }

  function createId(prefix) {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return prefix + "-" + crypto.randomUUID();
    }

    return (
      prefix + "-" +
      Date.now() + "-" +
      Math.random().toString(36).slice(2, 12)
    );
  }

  function validateModule(moduleId) {
    if (!MODULES.includes(moduleId)) {
      throw new Error(
        "Unsupported grammar module: " + moduleId
      );
    }
  }

  function startSession(moduleId) {
    validateModule(moduleId);

    const learner = getActiveLearner();

    if (!learner) {
      return {
        ok: false,
        error: "NO_ACTIVE_LEARNER",
        message:
          "请先在 Learner Manager 选择学习者。"
      };
    }

    const session = {
      sessionId: createId("SESSION"),
      learnerId: learner.id,
      module: moduleId,
      startedAt: new Date().toISOString(),
      completedAt: null,

      identityBinding: {
        method: "session-start",
        version: "1.0",
        boundAt: new Date().toISOString(),
        authenticated: false
      }
    };

    return {
      ok: true,
      session: session
    };
  }

  function validateSessionIdentity(session) {
    if (
      !session ||
      typeof session !== "object" ||
      !session.sessionId ||
      !session.learnerId
    ) {
      return {
        ok: false,
        error: "INVALID_SESSION",
        message: "学习会话缺少必要身份信息。"
      };
    }

    const learner = findLearner(session.learnerId);

    if (!learner) {
      return {
        ok: false,
        error: "LEARNER_NOT_FOUND",
        message:
          "原学习者档案已不存在，无法确认会话归属。"
      };
    }

    const active = getActiveLearner();

    if (!active || active.id !== session.learnerId) {
      return {
        ok: false,
        error: "LEARNER_CHANGED",
        message:
          "当前学习者与会话开始时不一致。" +
          "请恢复原学习者后再保存。"
      };
    }

    return {
      ok: true,
      learner: learner
    };
  }

  function attachIdentity(session, resultData) {
    const validation = validateSessionIdentity(session);

    if (!validation.ok) {
      return validation;
    }

    if (
      !resultData ||
      typeof resultData !== "object" ||
      Array.isArray(resultData)
    ) {
      return {
        ok: false,
        error: "INVALID_RESULT",
        message: "学习结果数据无效。"
      };
    }

    if (
      resultData.learnerId &&
      resultData.learnerId !== session.learnerId
    ) {
      return {
        ok: false,
        error: "IDENTITY_CONFLICT",
        message:
          "学习结果中存在不同的学习者 ID，已阻止覆盖。"
      };
    }

    if (
      resultData.sessionId &&
      resultData.sessionId !== session.sessionId
    ) {
      return {
        ok: false,
        error: "SESSION_CONFLICT",
        message:
          "学习结果中的会话 ID 不一致。"
      };
    }

    if (
      resultData.module &&
      resultData.module !== session.module
    ) {
      return {
        ok: false,
        error: "MODULE_CONFLICT",
        message:
          "学习结果中的模块 ID 不一致。"
      };
    }

    const completed = {
      ...resultData,

      sessionId: session.sessionId,
      learnerId: session.learnerId,
      module: session.module,
      startedAt: session.startedAt,

      completedAt:
        resultData.completedAt ||
        new Date().toISOString(),

      identityBinding: {
        ...session.identityBinding
      }
    };

    return {
      ok: true,
      record: completed
    };
  }

  function saveCompletedSession(
    session,
    resultData,
    storageKey
  ) {
    if (
      typeof storageKey !== "string" ||
      !storageKey.startsWith("aura_g") ||
      !storageKey.endsWith("_learning_records_v1")
    ) {
      return {
        ok: false,
        error: "INVALID_STORAGE_KEY",
        message: "学习记录存储位置不符合要求。"
      };
    }

    const expectedKeys = {
      G1: "aura_g1_learning_records_v1",
      G2: "aura_g2_learning_records_v1",
      G3: "aura_g3_learning_records_v1"
    };

    if (
      !session ||
      expectedKeys[session.module] !== storageKey
    ) {
      return {
        ok: false,
        error: "MODULE_STORAGE_MISMATCH",
        message: "学习模块与存储位置不一致。"
      };
    }

    const attached = attachIdentity(
      session,
      resultData
    );

    if (!attached.ok) {
      return attached;
    }

    const records = readJSON(storageKey, []);

    if (!Array.isArray(records)) {
      return {
        ok: false,
        error: "INVALID_RECORD_STORE",
        message:
          "现有学习记录格式异常，已停止写入以保护数据。"
      };
    }

    if (
      records.some(
        record =>
          record &&
          record.sessionId === session.sessionId
      )
    ) {
      return {
        ok: false,
        error: "DUPLICATE_SESSION",
        message:
          "该会话已经保存，不能重复写入。"
      };
    }

    const nextRecords = [
      ...records,
      attached.record
    ];

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(nextRecords)
      );

      const verified = readJSON(storageKey, []);

      const saved = Array.isArray(verified)
        ? verified.find(
            record =>
              record &&
              record.sessionId === session.sessionId
          )
        : null;

      if (
        !saved ||
        saved.learnerId !== session.learnerId
      ) {
        return {
          ok: false,
          error: "SAVE_VERIFICATION_FAILED",
          message:
            "保存验证失败，请检查浏览器存储。"
        };
      }

      return {
        ok: true,
        record: saved
      };

    } catch (error) {
      return {
        ok: false,
        error: "STORAGE_WRITE_FAILED",
        message:
          "学习记录保存失败：" + error.message
      };
    }
  }

  window.AuraLearnerIdentity = Object.freeze({
    version: "1.0",

    getProfiles,
    getActiveLearnerId,
    getActiveLearner,
    findLearner,

    startSession,
    validateSessionIdentity,
    attachIdentity,
    saveCompletedSession
  });

  console.info(
    "[AURA EDU] Learner Identity Service ready."
  );

})();
