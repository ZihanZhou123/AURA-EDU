
/* =====================================================
   AURA EDU — TEACHER EVIDENCE TRACE
   STAGE 25.3.5.2.1 / VERSION 1.0

   Question-Level Learning Evidence Traceability

   Modules:
   - G1: Verb to Be
   - G2: Subject–Verb Agreement
   - G3: Sentence Construction

   Research principles:
   - Read-only analysis
   - Learner-bound evidence
   - No invented attempts or error codes
   - No assumed matching between different questions
   - No causal or durable-mastery claims

   This service does NOT:
   - Modify localStorage
   - Switch active learners
   - Change mastery decisions
   - Create new learning sessions
   - Modify student learning modules
===================================================== */

(function () {
  "use strict";

  const VERSION = "1.0";

  const MODULES = Object.freeze({
    G1: {
      id: "G1",
      name: "Verb to Be",
      storageKey: "aura_g1_learning_records_v1"
    },

    G2: {
      id: "G2",
      name: "Subject–Verb Agreement",
      storageKey: "aura_g2_learning_records_v1"
    },

    G3: {
      id: "G3",
      name: "Sentence Construction",
      storageKey: "aura_g3_learning_records_v1"
    }
  });

  const STAGES = [
    "diagnostic",
    "practice",
    "reassessment"
  ];

  function readStorage(key) {
    try {
      const raw = localStorage.getItem(key);

      if (raw === null) {
        return {
          ok: true,
          records: []
        };
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return {
          ok: false,
          error: "INVALID_STORAGE_FORMAT",
          records: []
        };
      }

      return {
        ok: true,
        records: parsed
      };
    } catch (error) {
      return {
        ok: false,
        error: "STORAGE_READ_ERROR",
        records: []
      };
    }
  }

  function learnerSessions(moduleId, learnerId) {
    const module = MODULES[moduleId];

    if (!module) {
      return {
        ok: false,
        error: "UNKNOWN_MODULE",
        sessions: []
      };
    }

    const loaded = readStorage(module.storageKey);

    if (!loaded.ok) {
      return {
        ok: false,
        error: loaded.error,
        sessions: []
      };
    }

    const sessions = loaded.records.filter(session =>
      session &&
      typeof session === "object" &&
      String(session.learnerId) === String(learnerId)
    );

    return {
      ok: true,
      sessions
    };
  }

  function sessionTime(session) {
    const value =
      session.completedAt ||
      session.startedAt ||
      "";

    const parsed = Date.parse(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  function sortSessions(sessions) {
    return [...sessions].sort(
      (a, b) => sessionTime(b) - sessionTime(a)
    );
  }

  function hasStage(session, stage) {
    return (
      Array.isArray(session.records) &&
      session.records.some(
        record => record && record.stage === stage
      )
    );
  }

  function isCompleteSession(session) {
    return Boolean(
      session &&
      session.result &&
      Array.isArray(session.records) &&
      STAGES.every(stage => hasStage(session, stage))
    );
  }

  function getAttempts(record) {
    if (!Array.isArray(record.attempts)) {
      return [];
    }

    return record.attempts.map((attempt, index) => {
      const value = attempt || {};

      return {
        attemptNumber:
          Number.isFinite(value.attemptNumber)
            ? value.attemptNumber
            : index + 1,

        selectedAnswer:
          value.selectedAnswer === undefined
            ? null
            : value.selectedAnswer,

        correct:
          typeof value.correct === "boolean"
            ? value.correct
            : null,

        hintLevelAtAttempt:
          Number.isFinite(value.hintLevelAtAttempt)
            ? value.hintLevelAtAttempt
            : null,

        timestamp:
          value.timestamp || null
      };
    });
  }

  function getErrors(record, moduleId) {
    const source = moduleId === "G1"
      ? record.errorCodes
      : record.errors;

    if (!Array.isArray(source)) {
      return [];
    }

    return source.map(error => {
      if (typeof error === "string") {
        return {
          code: error,
          label: error,
          selected: null,
          expected: null,
          rule: null,
          structure: null
        };
      }

      if (!error || typeof error !== "object") {
        return null;
      }

      return {
        code: error.code || "UNCLASSIFIED",
        label: error.label || null,
        selected:
          error.selected === undefined
            ? null
            : error.selected,
        expected:
          error.expected === undefined
            ? null
            : error.expected,
        rule: error.rule || null,
        structure: error.structure || null
      };
    }).filter(Boolean);
  }

  function traceQuestion(record, moduleId, index) {
    const attempts = getAttempts(record);
    const errors = getErrors(record, moduleId);

    const firstAttempt = attempts.length
      ? attempts[0]
      : null;

    const firstAttemptCorrect =
      typeof record.firstAttemptCorrect === "boolean"
        ? record.firstAttemptCorrect
        : firstAttempt
          ? firstAttempt.correct
          : null;

    const highestHintUsed =
      Number.isFinite(record.highestHintUsed)
        ? record.highestHintUsed
        : null;

    const completedCorrectly =
      typeof record.completedCorrectly === "boolean"
        ? record.completedCorrectly
        : null;

    return {
      questionId:
        record.questionId || "UNKNOWN_QUESTION_" + (index + 1),

      stage: record.stage || "unknown",

      knowledgePoint:
        record.knowledgePoint || moduleId,

      firstAttemptCorrect,

      completedCorrectly,

      attemptCount: attempts.length,

      highestHintUsed,

      attempts,

      errors,

      startedAt: record.startedAt || null,

      completedAt: record.completedAt || null,

      evidenceStatus: "RECORDED",

      interpretationLimits: [
        "The record describes this question only.",
        "Errors do not establish cognitive causes.",
        "Hint use does not prove dependency."
      ]
    };
  }

  function countErrors(questions) {
    const counts = {};

    questions.forEach(question => {
      question.errors.forEach(error => {
        const key = String(
          error.code || "UNCLASSIFIED"
        );

        counts[key] = (counts[key] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .map(([code, count]) => ({
        code,
        count
      }))
      .sort((a, b) =>
        b.count - a.count ||
        a.code.localeCompare(b.code)
      );
  }

  function summarizeStage(questions) {
    const firstAttemptKnown = questions.filter(
      question =>
        typeof question.firstAttemptCorrect === "boolean"
    );

    const firstAttemptCorrect = firstAttemptKnown.filter(
      question => question.firstAttemptCorrect === true
    ).length;

    const hintsKnown = questions.filter(
      question =>
        Number.isFinite(question.highestHintUsed)
    );

    const questionsUsingHints = hintsKnown.filter(
      question => question.highestHintUsed > 0
    ).length;

    const highestHint = hintsKnown.length
      ? Math.max(
          ...hintsKnown.map(
            question => question.highestHintUsed
          )
        )
      : null;

    const totalAttempts = questions.reduce(
      (sum, question) => sum + question.attemptCount,
      0
    );

    return {
      questionCount: questions.length,

      firstAttemptCorrect,

      firstAttemptObserved:
        firstAttemptKnown.length,

      firstAttemptAccuracy:
        firstAttemptKnown.length === questions.length &&
        questions.length > 0
          ? Math.round(
              firstAttemptCorrect / questions.length * 100
            )
          : null,

      questionsUsingHints:
        hintsKnown.length === questions.length
          ? questionsUsingHints
          : null,

      highestHintUsed: highestHint,

      totalRecordedAttempts: totalAttempts,

      errorSummary: countErrors(questions)
    };
  }

  function traceSession(session, moduleId) {
    const records = Array.isArray(session.records)
      ? session.records
      : [];

    const questions = records
      .filter(record =>
        record &&
        typeof record === "object" &&
        STAGES.includes(record.stage)
      )
      .map((record, index) =>
        traceQuestion(record, moduleId, index)
      );

    const stages = {};

    STAGES.forEach(stage => {
      const stageQuestions = questions.filter(
        question => question.stage === stage
      );

      stages[stage] = {
        summary: summarizeStage(stageQuestions),
        questions: stageQuestions
      };
    });

    const result = session.result || {};

    return {
      moduleId,

      learnerId: session.learnerId,

      sessionId: session.sessionId || null,

      startedAt: session.startedAt || null,

      completedAt: session.completedAt || null,

      complete: isCompleteSession(session),

      questionCount: questions.length,

      stages,

      existingDecision: {
        masteryState: result.masteryState || null,
        recommendedPath: result.recommendedPath || null,
        highestHintLevel:
          Number.isFinite(result.highestHintLevel)
            ? result.highestHintLevel
            : null
      },

      researchLimitations: [
        "Diagnostic and reassessment questions are not automatically paired.",
        "First-attempt performance is distinct from eventual correctness.",
        "Practice success with hints is not independent performance.",
        "Immediate reassessment is not delayed retention.",
        "No causal effect can be inferred."
      ]
    };
  }

  function getIdentityService() {
    return window.AuraLearnerIdentity || null;
  }

  function validateLearner(learnerId) {
    if (
      typeof learnerId !== "string" ||
      !learnerId.trim()
    ) {
      return {
        ok: false,
        error: "INVALID_LEARNER_ID"
      };
    }

    const identity = getIdentityService();

    if (
      !identity ||
      typeof identity.findLearner !== "function"
    ) {
      return {
        ok: false,
        error: "IDENTITY_SERVICE_UNAVAILABLE"
      };
    }

    const learner = identity.findLearner(learnerId);

    if (!learner) {
      return {
        ok: false,
        error: "LEARNER_NOT_FOUND"
      };
    }

    return {
      ok: true,
      learner
    };
  }

  function evaluateModule(learnerId, moduleId) {
    const validated = validateLearner(learnerId);

    if (!validated.ok) return validated;

    if (!MODULES[moduleId]) {
      return {
        ok: false,
        error: "UNKNOWN_MODULE"
      };
    }

    const loaded = learnerSessions(
      moduleId,
      learnerId
    );

    if (!loaded.ok) {
      return {
        ok: false,
        error: loaded.error
      };
    }

    const completeSessions = sortSessions(
      loaded.sessions.filter(isCompleteSession)
    );

    if (!completeSessions.length) {
      return {
        ok: true,
        moduleId,
        learnerId,
        status: "INSUFFICIENT_EVIDENCE",
        storedSessionCount: loaded.sessions.length,
        completeSessionCount: 0,
        latestSession: null
      };
    }

    return {
      ok: true,
      moduleId,
      learnerId,
      status: "AVAILABLE",
      storedSessionCount: loaded.sessions.length,
      completeSessionCount: completeSessions.length,
      latestSession: traceSession(
        completeSessions[0],
        moduleId
      )
    };
  }

  function evaluateAll(learnerId) {
    const validated = validateLearner(learnerId);

    if (!validated.ok) return validated;

    const modules = {};

    Object.keys(MODULES).forEach(moduleId => {
      modules[moduleId] = evaluateModule(
        learnerId,
        moduleId
      );
    });

    return {
      ok: true,
      version: VERSION,
      learnerId,
      method: "READ_ONLY_QUESTION_LEVEL_TRACE",
      readOnly: true,
      modules,
      researchNote:
        "Question-level evidence is descriptive. " +
        "It must not be interpreted as causal proof " +
        "of instructional effectiveness."
    };
  }

  function getSession(
    learnerId,
    moduleId,
    sessionId
  ) {
    const validated = validateLearner(learnerId);

    if (!validated.ok) return validated;

    if (
      typeof sessionId !== "string" ||
      !sessionId.trim()
    ) {
      return {
        ok: false,
        error: "INVALID_SESSION_ID"
      };
    }

    const loaded = learnerSessions(
      moduleId,
      learnerId
    );

    if (!loaded.ok) {
      return {
        ok: false,
        error: loaded.error
      };
    }

    const session = loaded.sessions.find(
      item => item.sessionId === sessionId
    );

    if (!session) {
      return {
        ok: false,
        error: "SESSION_NOT_FOUND"
      };
    }

    return {
      ok: true,
      status: "AVAILABLE",
      trace: traceSession(session, moduleId)
    };
  }

  function listSessions(learnerId, moduleId) {
    const validated = validateLearner(learnerId);

    if (!validated.ok) return validated;

    const loaded = learnerSessions(
      moduleId,
      learnerId
    );

    if (!loaded.ok) {
      return {
        ok: false,
        error: loaded.error
      };
    }

    return {
      ok: true,
      learnerId,
      moduleId,
      sessions: sortSessions(
        loaded.sessions
      ).map(session => ({
        sessionId: session.sessionId || null,
        startedAt: session.startedAt || null,
        completedAt: session.completedAt || null,
        complete: isCompleteSession(session),
        questionCount:
          Array.isArray(session.records)
            ? session.records.length
            : 0
      }))
    };
  }

  window.AuraTeacherEvidenceTrace =
    Object.freeze({
      version: VERSION,
      evaluateModule,
      evaluateAll,
      getSession,
      listSessions
    });

  console.info(
    "[AURA EDU] Teacher Evidence Trace v1.0 ready."
  );

})();
