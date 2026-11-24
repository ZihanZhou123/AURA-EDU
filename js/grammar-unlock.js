
/* ============================================
   AURA EDU V2.2
   STAGE 23.3.4

   GRAMMAR UNLOCK ENGINE

   Read-only learning evidence evaluator.

   Reads:
   - Active learner identity
   - G1 learning records
   - G2 learning records
   - G3 learning records

   Does NOT:
   - Modify historical records
   - Create fake mastery results
   - Change learner identity
   - Award stars
   - Unlock Speaking
   - Write to localStorage

   Provisional mastery is NOT
   durable mastery.
============================================ */

(function () {
  "use strict";

  const ACTIVE_KEY =
    "aura_active_learner_id_v2";

  const MODULES = Object.freeze({
    G1: {
      name: "Verb to Be",
      key: "aura_g1_learning_records_v1"
    },

    G2: {
      name: "Subject–Verb Agreement",
      key: "aura_g2_learning_records_v1"
    },

    G3: {
      name: "Sentence Construction",
      key: "aura_g3_learning_records_v1"
    }
  });

  const RULE_VERSION =
    "GRAMMAR-UNLOCK-1.0";

  // ----------------------------------------
  // Safe storage reading
  // ----------------------------------------

  function readStorage(key) {
    try {
      const raw =
        localStorage.getItem(key);

      if (raw === null) {
        return {
          ok: true,
          data: []
        };
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return {
          ok: false,
          data: [],
          error: "Invalid record array"
        };
      }

      return {
        ok: true,
        data: parsed
      };

    } catch (error) {
      return {
        ok: false,
        data: [],
        error: String(error.message)
      };
    }
  }

  // ----------------------------------------
  // Active learner
  // ----------------------------------------

  function getActiveLearnerId() {
    const identity =
      window.AuraLearnerIdentity;

    // Prefer the existing identity service.
    if (
      identity &&
      typeof identity.getActiveLearner ===
        "function"
    ) {
      try {
        const learner =
          identity.getActiveLearner();

        if (
          learner &&
          learner.id !== undefined &&
          learner.id !== null
        ) {
          return String(learner.id);
        }

        return null;

      } catch (error) {
        console.warn(
          "[Grammar Unlock] Identity error",
          error
        );

        return null;
      }
    }

    // Read-only fallback.
    try {
      const raw =
        localStorage.getItem(ACTIVE_KEY);

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

  // ----------------------------------------
  // Extract completed session
  // ----------------------------------------

  function getSession(record) {
    if (
      !record ||
      typeof record !== "object" ||
      Array.isArray(record)
    ) {
      return null;
    }

    // Existing identity service may return
    // the saved session as the record itself.
    if (
      record.result &&
      Array.isArray(record.records)
    ) {
      return record;
    }

    // Supported nested structures.
    const candidates = [
      record.session,
      record.data,
      record.payload
    ];

    for (const candidate of candidates) {
      if (
        candidate &&
        typeof candidate === "object" &&
        candidate.result &&
        Array.isArray(candidate.records)
      ) {
        return candidate;
      }
    }

    return null;
  }

  // ----------------------------------------
  // Score verification
  // ----------------------------------------

  function validScore(score) {
    if (
      !score ||
      typeof score !== "object"
    ) {
      return false;
    }

    const correct = score.correct;
    const total = score.total;
    const percent = score.percent;

    if (
      !Number.isInteger(correct) ||
      !Number.isInteger(total) ||
      !Number.isFinite(percent)
    ) {
      return false;
    }

    if (
      total <= 0 ||
      correct < 0 ||
      correct > total ||
      percent < 0 ||
      percent > 100
    ) {
      return false;
    }

    return percent ===
      Math.round(correct / total * 100);
  }

  function verifyEvidence(session) {
    if (
      !session ||
      !session.result ||
      !Array.isArray(session.records)
    ) {
      return false;
    }

    const result = session.result;

    if (
      !validScore(result.diagnostic) ||
      !validScore(result.reassessment)
    ) {
      return false;
    }

    const stages = [
      "diagnostic",
      "practice",
      "reassessment"
    ];

    const expectedCounts = {
      diagnostic: 4,
      practice: null,
      reassessment: 4
    };

    for (const stage of stages) {
      const items = session.records.filter(
        item =>
          item &&
          item.stage === stage
      );

      if (
        expectedCounts[stage] !== null &&
        items.length !==
          expectedCounts[stage]
      ) {
        return false;
      }

      if (
        stage === "practice" &&
        items.length === 0
      ) {
        return false;
      }

      if (
        items.some(
          item =>
            typeof item.firstAttemptCorrect !==
              "boolean"
        )
      ) {
        return false;
      }
    }

    // Scores must agree with actual
    // first-attempt evidence.
    for (const stage of [
      "diagnostic",
      "reassessment"
    ]) {
      const items = session.records.filter(
        item => item.stage === stage
      );

      const correct = items.filter(
        item =>
          item.firstAttemptCorrect === true
      ).length;

      const stored = result[stage];

      if (
        stored.correct !== correct ||
        stored.total !== items.length
      ) {
        return false;
      }
    }

    return true;
  }

  // ----------------------------------------
  // Evaluate one completed session
  // ----------------------------------------

  function evaluateSession(session) {
    const result = session.result;

    const diagnostic =
      result.diagnostic.percent;

    const reassessment =
      result.reassessment.percent;

    const highestHint =
      result.highestHintLevel;

    const practiceRecords =
      session.records.filter(
        item => item.stage === "practice"
      );

    const highSupport =
      practiceRecords.some(
        item =>
          Number(item.highestHintUsed) >= 2
      );

    const conditions = {
      diagnostic:
        diagnostic >= 75,

      reassessment:
        reassessment >= 75,

      lowHint:
        Number.isInteger(highestHint) &&
        highestHint >= 0 &&
        highestHint <= 1,

      noHighSupport:
        !highSupport
    };

    const meetsThresholds =
      Object.values(conditions).every(
        Boolean
      );

    // Respect the decision stored by the
    // existing teaching module.
    const provisional =
      meetsThresholds &&
      result.masteryState ===
        "Provisional Mastery";

    return {
      provisionalMastery: provisional,

      masteryState:
        result.masteryState,

      recommendedPath:
        result.recommendedPath,

      diagnosticPercent:
        diagnostic,

      reassessmentPercent:
        reassessment,

      highestHintLevel:
        highestHint,

      conditions,

      durableMasteryVerified: false
    };
  }

  // ----------------------------------------
  // Evaluate one grammar module
  // ----------------------------------------

  function evaluateModule(moduleId, learnerId) {
    const module = MODULES[moduleId];

    if (!module) {
      return {
        moduleId,
        status: "UNKNOWN_MODULE",
        provisionalMastery: false
      };
    }

    const stored =
      readStorage(module.key);

    if (!stored.ok) {
      return {
        moduleId,
        name: module.name,
        status: "STORAGE_ERROR",
        provisionalMastery: false,
        error: stored.error
      };
    }

    const matching = stored.data
      .map(record => ({
        original: record,
        session: getSession(record)
      }))
      .filter(item => {
        if (!item.session) {
          return false;
        }

        const recordLearnerId =
          item.original.learnerId;

        const sessionLearnerId =
          item.session.learnerId;

        // Both identity fields must agree
        // when both are present.
        if (
          recordLearnerId != null &&
          sessionLearnerId != null &&
          String(recordLearnerId) !==
            String(sessionLearnerId)
        ) {
          return false;
        }

        const boundId =
          sessionLearnerId ??
          recordLearnerId;

        return (
          boundId != null &&
          String(boundId) ===
            String(learnerId)
        );
      });

    if (matching.length === 0) {
      return {
        moduleId,
        name: module.name,
        status: "NO_RECORD",
        provisionalMastery: false,
        sessionCount: 0
      };
    }

    // Choose the latest completed session,
    // not the highest historical score.
    const completed = matching
      .filter(item => {
        const session = item.session;

        return (
          session.completedAt &&
          session.result
        );
      })
      .sort((a, b) => {
        const timeA = Date.parse(
          a.session.completedAt
        );

        const timeB = Date.parse(
          b.session.completedAt
        );

        const validA =
          Number.isFinite(timeA) ? timeA : 0;

        const validB =
          Number.isFinite(timeB) ? timeB : 0;

        return validB - validA;
      });

    if (completed.length === 0) {
      return {
        moduleId,
        name: module.name,
        status: "NO_COMPLETED_SESSION",
        provisionalMastery: false,
        sessionCount: matching.length
      };
    }

    const latest = completed[0].session;

    if (!verifyEvidence(latest)) {
      return {
        moduleId,
        name: module.name,
        status: "INVALID_EVIDENCE",
        provisionalMastery: false,
        sessionCount: matching.length,
        sessionId:
          latest.sessionId || null
      };
    }

    const evaluation =
      evaluateSession(latest);

    return {
      moduleId,
      name: module.name,
      status: evaluation.provisionalMastery
        ? "PROVISIONAL_MASTERY"
        : "NEEDS_FURTHER_LEARNING",

      sessionId:
        latest.sessionId || null,

      completedAt:
        latest.completedAt,

      sessionCount:
        matching.length,

      ...evaluation
    };
  }

  // ----------------------------------------
  // Overall Grammar evaluation
  // ----------------------------------------

  function evaluateGrammar() {
    const learnerId =
      getActiveLearnerId();

    if (!learnerId) {
      return {
        ok: false,
        learnerId: null,
        grammarComplete: false,
        spellingEligible: false,
        speakingEligible: false,
        status: "NO_ACTIVE_LEARNER",
        modules: {},
        ruleVersion: RULE_VERSION
      };
    }

    const modules = {};

    for (const moduleId of Object.keys(
      MODULES
    )) {
      modules[moduleId] =
        evaluateModule(
          moduleId,
          learnerId
        );
    }

    const grammarComplete =
      Object.values(modules).every(
        item =>
          item.provisionalMastery === true
      );

    const storageError =
      Object.values(modules).some(
        item =>
          item.status === "STORAGE_ERROR"
      );

    return {
      ok: !storageError,

      learnerId,

      grammarComplete,

      // Eligible for a future Spelling
      // challenge, not proof of Spelling
      // mastery.
      spellingEligible:
        grammarComplete,

      // Speaking requires a separate
      // Spelling assessment.
      speakingEligible: false,

      status: storageError
        ? "STORAGE_ERROR"
        : grammarComplete
          ? "GRAMMAR_PROVISIONAL_COMPLETE"
          : "GRAMMAR_IN_PROGRESS",

      modules,

      ruleVersion: RULE_VERSION,

      durableMasteryVerified: false,

      explanation:
        grammarComplete
          ? "G1/G2/G3 最新完成会话均满足暂定掌握规则。"
          : "至少一个语法模块尚未满足暂定掌握规则。"
    };
  }

  // ----------------------------------------
  // Public read-only API
  // ----------------------------------------

  window.AuraGrammarUnlock =
    Object.freeze({
      version: RULE_VERSION,

      getActiveLearnerId,

      evaluateModule,

      evaluateGrammar
    });

  console.info(
    "[AURA EDU] Grammar Unlock Engine ready."
  );

})();
