
/* =====================================================
   AURA EDU — RESEARCH EVIDENCE INTEGRITY VALIDATOR
   STAGE 25.3.5.4.1 / VERSION 1.0

   Purpose:
   Validate the integrity of learner-bound
   question-level evidence and recommendation mappings.

   Dependencies:
   - js/learner-identity.js
   - js/teacher-evidence-trace.js
   - js/teacher-evidence-mapping.js

   READ ONLY:
   - No localStorage writes
   - No learner switching
   - No mastery recalculation
   - No modification of historical sessions

   Important:
   This validator checks data consistency.
   It does NOT establish educational effectiveness,
   causal relationships, or durable mastery.
===================================================== */

(function () {
  "use strict";

  const VERSION = "1.0";

  const MODULES = ["G1", "G2", "G3"];

  const STAGES = [
    "diagnostic",
    "practice",
    "reassessment"
  ];

  const VALID_PRIORITIES = [
    "HIGH",
    "MODERATE",
    "LOW",
    "UNDETERMINED"
  ];

  function check(id, status, message, details) {
    return {
      id,
      status,
      message,
      details: details || null
    };
  }

  function isNonEmptyString(value) {
    return (
      typeof value === "string" &&
      value.trim().length > 0
    );
  }

  function identityService() {
    return window.AuraLearnerIdentity || null;
  }

  function traceService() {
    return window.AuraTeacherEvidenceTrace || null;
  }

  function mappingService() {
    return window.AuraTeacherEvidenceMapping || null;
  }

  function validateIdentity(learnerId) {
    const identity = identityService();

    if (
      !identity ||
      typeof identity.findLearner !== "function"
    ) {
      return {
        ok: false,
        error: "IDENTITY_SERVICE_UNAVAILABLE"
      };
    }

    if (!isNonEmptyString(learnerId)) {
      return {
        ok: false,
        error: "INVALID_LEARNER_ID"
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

  function validateQuestion(question, stage, index) {
    const checks = [];

    const reference =
      stage + ":" +
      (question.questionId || index + 1);

    if (!isNonEmptyString(question.questionId)) {
      checks.push(check(
        "QUESTION_ID_MISSING",
        "WARNING",
        "Question ID is missing or generated.",
        reference
      ));
    } else {
      checks.push(check(
        "QUESTION_ID_PRESENT",
        "PASS",
        "Question ID is available.",
        question.questionId
      ));
    }

    if (question.stage !== stage) {
      checks.push(check(
        "QUESTION_STAGE_MISMATCH",
        "WARNING",
        "Question stage does not match its container.",
        reference
      ));
    }

    if (
      typeof question.firstAttemptCorrect !== "boolean"
    ) {
      checks.push(check(
        "FIRST_ATTEMPT_UNKNOWN",
        "WARNING",
        "First-attempt correctness is not recorded.",
        reference
      ));
    }

    if (
      !Array.isArray(question.attempts) ||
      question.attempts.length === 0
    ) {
      checks.push(check(
        "ATTEMPT_EVIDENCE_MISSING",
        "WARNING",
        "Attempt-level evidence is unavailable.",
        reference
      ));
    } else {
      question.attempts.forEach((attempt, attemptIndex) => {
        if (
          typeof attempt.correct !== "boolean"
        ) {
          checks.push(check(
            "ATTEMPT_CORRECTNESS_UNKNOWN",
            "WARNING",
            "Attempt correctness is not recorded.",
            reference + ":attempt:" + (attemptIndex + 1)
          ));
        }

        if (
          attempt.hintLevelAtAttempt !== null &&
          !Number.isFinite(attempt.hintLevelAtAttempt)
        ) {
          checks.push(check(
            "ATTEMPT_HINT_INVALID",
            "WARNING",
            "Hint level has an invalid value.",
            reference + ":attempt:" + (attemptIndex + 1)
          ));
        }
      });
    }

    if (
      question.highestHintUsed === null ||
      question.highestHintUsed === undefined
    ) {
      checks.push(check(
        "HINT_EVIDENCE_MISSING",
        "WARNING",
        "Highest hint level is not recorded.",
        reference
      ));
    } else if (
      !Number.isInteger(question.highestHintUsed) ||
      question.highestHintUsed < 0 ||
      question.highestHintUsed > 3
    ) {
      checks.push(check(
        "HINT_LEVEL_INVALID",
        "WARNING",
        "Highest hint level is outside H0–H3.",
        reference
      ));
    }

    if (!Array.isArray(question.errors)) {
      checks.push(check(
        "ERROR_ARRAY_MISSING",
        "WARNING",
        "Error evidence is not an array.",
        reference
      ));
    }

    return checks;
  }

  function validateSessionTrace(trace) {
    const checks = [];

    if (!trace || typeof trace !== "object") {
      return [
        check(
          "TRACE_MISSING",
          "WARNING",
          "Session trace is unavailable."
        )
      ];
    }

    if (!isNonEmptyString(trace.sessionId)) {
      checks.push(check(
        "SESSION_ID_MISSING",
        "WARNING",
        "Session ID is missing."
      ));
    } else {
      checks.push(check(
        "SESSION_ID_PRESENT",
        "PASS",
        "Session ID is available.",
        trace.sessionId
      ));
    }

    if (!trace.complete) {
      checks.push(check(
        "SESSION_INCOMPLETE",
        "WARNING",
        "The session does not contain all required stages."
      ));
    }

    const allQuestions = [];

    STAGES.forEach(stage => {
      const data = trace.stages && trace.stages[stage];

      if (!data || !Array.isArray(data.questions)) {
        checks.push(check(
          "STAGE_MISSING",
          "WARNING",
          "Stage evidence is missing.",
          stage
        ));
        return;
      }

      if (data.questions.length === 0) {
        checks.push(check(
          "STAGE_EMPTY",
          "WARNING",
          "No question records are available.",
          stage
        ));
      }

      data.questions.forEach((question, index) => {
        allQuestions.push({
          stage,
          question
        });

        checks.push(
          ...validateQuestion(question, stage, index)
        );
      });
    });

    const seen = new Set();

    allQuestions.forEach(item => {
      const question = item.question;

      if (!isNonEmptyString(question.questionId)) {
        return;
      }

      const key =
        item.stage + "|" + question.questionId;

      if (seen.has(key)) {
        checks.push(check(
          "DUPLICATE_QUESTION_REFERENCE",
          "WARNING",
          "The same question ID appears more than once " +
          "within the same stage.",
          key
        ));
      }

      seen.add(key);
    });

    if (trace.questionCount !== allQuestions.length) {
      checks.push(check(
        "QUESTION_COUNT_MISMATCH",
        "WARNING",
        "Question count does not match stage records.",
        {
          reported: trace.questionCount,
          observed: allQuestions.length
        }
      ));
    }

    return checks;
  }

  function mappingReferenceKey(reference) {
    return [
      reference.moduleId,
      reference.sessionId,
      reference.stage,
      reference.questionId
    ].join("|");
  }

  function validateMappings(trace, mappingResult) {
    const checks = [];

    if (
      !mappingResult ||
      !mappingResult.ok ||
      !Array.isArray(mappingResult.mappings)
    ) {
      return [
        check(
          "MAPPING_UNAVAILABLE",
          "WARNING",
          "Recommendation mapping evidence is unavailable."
        )
      ];
    }

    const questionReferences = new Map();

    STAGES.forEach(stage => {
      const data = trace.stages && trace.stages[stage];

      if (!data || !Array.isArray(data.questions)) {
        return;
      }

      data.questions.forEach(question => {
        const reference = {
          moduleId: trace.moduleId,
          sessionId: trace.sessionId,
          stage,
          questionId: question.questionId
        };

        const key = mappingReferenceKey(reference);

        if (!questionReferences.has(key)) {
          questionReferences.set(key, []);
        }

        questionReferences.get(key).push(question);
      });
    });

    const mappedReferences = new Map();

    mappingResult.mappings.forEach(mapping => {
      const reference = mapping.evidenceReference;

      if (!reference) {
        checks.push(check(
          "MAPPING_REFERENCE_MISSING",
          "WARNING",
          "A mapping has no evidence reference."
        ));
        return;
      }

      const key = mappingReferenceKey(reference);

      const matched = questionReferences.get(key) || [];

      if (matched.length === 0) {
        checks.push(check(
          "EVIDENCE_REFERENCE_MISMATCH",
          "WARNING",
          "Mapping references a question not found " +
          "in the corresponding session.",
          key
        ));
        return;
      }

      if (matched.length > 1) {
        checks.push(check(
          "AMBIGUOUS_EVIDENCE_REFERENCE",
          "WARNING",
          "Mapping references a non-unique question.",
          key
        ));
      }

      mappedReferences.set(
        key,
        (mappedReferences.get(key) || 0) + 1
      );

      if (!VALID_PRIORITIES.includes(mapping.priority)) {
        checks.push(check(
          "INVALID_MAPPING_PRIORITY",
          "WARNING",
          "Mapping priority is not recognized.",
          key
        ));
      }

      const observed = mapping.observedEvidence || {};
      const question = matched[0];

      if (
        observed.firstAttemptCorrect !==
        question.firstAttemptCorrect
      ) {
        checks.push(check(
          "FIRST_ATTEMPT_MAPPING_MISMATCH",
          "WARNING",
          "Mapped first-attempt result differs " +
          "from the question trace.",
          key
        ));
      }

      if (
        observed.highestHintUsed !==
        question.highestHintUsed
      ) {
        checks.push(check(
          "HINT_MAPPING_MISMATCH",
          "WARNING",
          "Mapped highest hint differs " +
          "from the question trace.",
          key
        ));
      }

      if (
        observed.attemptCount !==
        question.attemptCount
      ) {
        checks.push(check(
          "ATTEMPT_COUNT_MAPPING_MISMATCH",
          "WARNING",
          "Mapped attempt count differs " +
          "from the question trace.",
          key
        ));
      }

      if (
        !isNonEmptyString(mapping.interpretation) ||
        !isNonEmptyString(mapping.teachingSupport) ||
        !isNonEmptyString(mapping.independentValidation)
      ) {
        checks.push(check(
          "MAPPING_CONTENT_INCOMPLETE",
          "WARNING",
          "Interpretation, support or validation " +
          "content is missing.",
          key
        ));
      }
    });

    questionReferences.forEach((questions, key) => {
      if (!mappedReferences.has(key)) {
        checks.push(check(
          "QUESTION_MAPPING_MISSING",
          "WARNING",
          "A recorded question has no recommendation mapping.",
          key
        ));
      }

      if ((mappedReferences.get(key) || 0) > 1) {
        checks.push(check(
          "DUPLICATE_MAPPING_REFERENCE",
          "WARNING",
          "Multiple mappings reference the same question.",
          key
        ));
      }
    });

    if (
      mappingResult.mappingCount !==
      mappingResult.mappings.length
    ) {
      checks.push(check(
        "MAPPING_COUNT_MISMATCH",
        "WARNING",
        "Reported mapping count differs from the " +
        "actual number of mappings."
      ));
    }

    if (!checks.some(item => item.status === "WARNING")) {
      checks.push(check(
        "MAPPING_REFERENCES_VALID",
        "PASS",
        "All mapping references match the available " +
        "question-level evidence."
      ));
    }

    return checks;
  }

  function summarizeChecks(checks) {
    const pass = checks.filter(
      item => item.status === "PASS"
    ).length;

    const warning = checks.filter(
      item => item.status === "WARNING"
    ).length;

    return {
      total: checks.length,
      pass,
      warning,
      status:
        warning > 0
          ? "WARNING"
          : "PASS"
    };
  }

  function validateSession(
    learnerId,
    moduleId,
    sessionId
  ) {
    const identity = validateIdentity(learnerId);

    if (!identity.ok) {
      return identity;
    }

    if (!MODULES.includes(moduleId)) {
      return {
        ok: false,
        error: "UNKNOWN_MODULE"
      };
    }

    const trace = traceService();
    const mapping = mappingService();

    if (
      !trace ||
      typeof trace.getSession !== "function"
    ) {
      return {
        ok: false,
        error: "TRACE_SERVICE_UNAVAILABLE"
      };
    }

    if (
      !mapping ||
      typeof mapping.getSessionMapping !== "function"
    ) {
      return {
        ok: false,
        error: "MAPPING_SERVICE_UNAVAILABLE"
      };
    }

    const traceResult = trace.getSession(
      learnerId,
      moduleId,
      sessionId
    );

    if (!traceResult.ok) {
      return traceResult;
    }

    const sessionTrace = traceResult.trace;

    const checks = validateSessionTrace(sessionTrace);

    if (
      String(sessionTrace.learnerId) !==
      String(learnerId)
    ) {
      checks.push(check(
        "LEARNER_ID_MISMATCH",
        "WARNING",
        "Session learner ID does not match " +
        "the selected learner."
      ));
    } else {
      checks.push(check(
        "LEARNER_ID_MATCH",
        "PASS",
        "Session belongs to the selected learner."
      ));
    }

    if (sessionTrace.moduleId !== moduleId) {
      checks.push(check(
        "MODULE_ID_MISMATCH",
        "WARNING",
        "Session module ID does not match " +
        "the selected module."
      ));
    }

    const mappingResult = mapping.getSessionMapping(
      learnerId,
      moduleId,
      sessionId
    );

    checks.push(
      ...validateMappings(sessionTrace, mappingResult)
    );

    checks.push(check(
      "RESEARCH_INTERPRETATION_LIMIT",
      "PASS",
      "Validation concerns record consistency only. " +
      "It does not establish causal effectiveness, " +
      "long-term retention or transfer."
    ));

    return {
      ok: true,
      version: VERSION,
      learnerId,
      moduleId,
      sessionId,
      method: "READ_ONLY_EVIDENCE_INTEGRITY_VALIDATION",
      readOnly: true,
      summary: summarizeChecks(checks),
      checks,
      limitations: [
        "Data consistency is not educational validity.",
        "Recorded errors are not confirmed cognitive causes.",
        "Hint use alone does not prove dependence.",
        "Immediate reassessment is not delayed retention.",
        "No causal effectiveness can be inferred."
      ]
    };
  }

  function validateModule(learnerId, moduleId) {
    const identity = validateIdentity(learnerId);

    if (!identity.ok) {
      return identity;
    }

    const trace = traceService();

    if (
      !trace ||
      typeof trace.listSessions !== "function"
    ) {
      return {
        ok: false,
        error: "TRACE_SERVICE_UNAVAILABLE"
      };
    }

    const result = trace.listSessions(
      learnerId,
      moduleId
    );

    if (!result.ok) {
      return result;
    }

    const sessions = result.sessions.filter(
      item => isNonEmptyString(item.sessionId)
    );

    if (!sessions.length) {
      return {
        ok: true,
        learnerId,
        moduleId,
        status: "INSUFFICIENT_EVIDENCE",
        sessionCount: result.sessions.length,
        validatedSessions: []
      };
    }

    const validatedSessions = sessions.map(session =>
      validateSession(
        learnerId,
        moduleId,
        session.sessionId
      )
    );

    const warningCount = validatedSessions.reduce(
      (total, item) =>
        total +
        (item.summary ? item.summary.warning : 1),
      0
    );

    return {
      ok: true,
      learnerId,
      moduleId,
      status:
        warningCount > 0 ? "WARNING" : "PASS",
      sessionCount: result.sessions.length,
      validatedSessions
    };
  }

  function validateAll(learnerId) {
    const identity = validateIdentity(learnerId);

    if (!identity.ok) {
      return identity;
    }

    const modules = {};

    MODULES.forEach(moduleId => {
      modules[moduleId] = validateModule(
        learnerId,
        moduleId
      );
    });

    return {
      ok: true,
      version: VERSION,
      learnerId,
      method: "READ_ONLY_RESEARCH_EVIDENCE_VALIDATION",
      readOnly: true,
      modules,
      researchNote:
        "The validator identifies consistency issues " +
        "in recorded learning evidence. It does not " +
        "validate the effectiveness of instruction."
    };
  }

  window.AuraTeacherEvidenceValidator =
    Object.freeze({
      version: VERSION,
      validateSession,
      validateModule,
      validateAll
    });

  console.info(
    "[AURA EDU] Evidence Integrity Validator v1.0 ready."
  );

})();
