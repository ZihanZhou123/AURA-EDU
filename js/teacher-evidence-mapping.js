
/* ===================================================
   AURA EDU — EVIDENCE-TO-RECOMMENDATION MAPPING
   STAGE 25.3.5.3.1 / VERSION 1.0

   Purpose:
   Connect recorded question-level learning evidence
   to transparent, rule-based teaching suggestions.

   Required dependency:
   js/teacher-evidence-trace.js

   READ ONLY:
   - No localStorage writes
   - No learner identity changes
   - No mastery decision changes
   - No session creation or deletion

   Research limitations:
   - Error codes are observations, not diagnoses.
   - Hint use does not prove dependence.
   - Recommendations are not causal findings.
   - Immediate reassessment is not durable mastery.
=================================================== */

(function () {
  "use strict";

  const VERSION = "1.0";

  const MODULES = ["G1", "G2", "G3"];

  const STAGES = [
    "diagnostic",
    "practice",
    "reassessment"
  ];

  const STRATEGIES = {
    G1: {
      focus: "Verb to Be",
      interpretation:
        "检查学生是否能够识别主语，并正确选择 " +
        "am、is 或 are。具体困难仍需教师确认。",
      support:
        "先标记主语，再使用 am/is/are 对照表；" +
        "通过示例和逐步撤除提示支持练习。",
      validation:
        "使用新的主语和句子进行无提示独立复测，" +
        "之后安排延迟复测。"
    },

    G2: {
      focus: "Subject–Verb Agreement",
      interpretation:
        "检查学生是否能够根据主语类别选择正确的" +
        "动词形式，尤其是第三人称单数。",
      support:
        "先识别主语，再比较动词形式；" +
        "根据需要提供示例、对比和逐步减少的提示。",
      validation:
        "使用新的主语和动词组合，" +
        "进行无提示改错与独立复测。"
    },

    G3: {
      focus: "Sentence Construction",
      interpretation:
        "检查学生对词序、句子成分和结构的理解。" +
        "错误记录不能单独证明其认知原因。",
      support:
        "先标记句子成分，必要时提供句型框架，" +
        "然后逐步撤除框架和提示。",
      validation:
        "使用新的生活情境进行无提示句子构建，" +
        "并安排延迟评估。"
    }
  };

  function safeText(value) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "string") {
      return value.trim().slice(0, 200);
    }

    if (
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    return null;
  }

  function classifyEvidence(question) {
    const observations = [];

    if (question.firstAttemptCorrect === false) {
      observations.push({
        type: "FIRST_ATTEMPT_ERROR",
        label: "First attempt was incorrect"
      });
    }

    if (question.firstAttemptCorrect === true) {
      observations.push({
        type: "FIRST_ATTEMPT_CORRECT",
        label: "First attempt was correct"
      });
    }

    if (
      Number.isFinite(question.highestHintUsed) &&
      question.highestHintUsed > 0
    ) {
      observations.push({
        type: "HINT_USED",
        label:
          "Highest recorded hint: H" +
          question.highestHintUsed
      });
    }

    if (
      Number.isFinite(question.attemptCount) &&
      question.attemptCount > 1
    ) {
      observations.push({
        type: "MULTIPLE_ATTEMPTS",
        label:
          "Recorded attempts: " +
          question.attemptCount
      });
    }

    if (
      question.stage === "reassessment" &&
      question.firstAttemptCorrect === true
    ) {
      observations.push({
        type: "INDEPENDENT_CORRECT",
        label:
          "Correct on first attempt during reassessment"
      });
    }

    if (
      question.stage === "reassessment" &&
      question.firstAttemptCorrect === false
    ) {
      observations.push({
        type: "INDEPENDENT_ERROR",
        label:
          "Incorrect on first attempt during reassessment"
      });
    }

    return observations;
  }

  function extractErrors(question) {
    if (!Array.isArray(question.errors)) {
      return [];
    }

    return question.errors.map(error => ({
      code: safeText(error.code) || "UNCLASSIFIED",
      label: safeText(error.label),
      selected: safeText(error.selected),
      expected: safeText(error.expected),
      rule: safeText(error.rule),
      structure: safeText(error.structure)
    }));
  }

  function determinePriority(question) {
    if (
      question.stage === "reassessment" &&
      question.firstAttemptCorrect === false
    ) {
      return "HIGH";
    }

    if (
      question.firstAttemptCorrect === false &&
      Number.isFinite(question.highestHintUsed) &&
      question.highestHintUsed >= 2
    ) {
      return "HIGH";
    }

    if (
      question.firstAttemptCorrect === false ||
      (
        Number.isFinite(question.highestHintUsed) &&
        question.highestHintUsed > 0
      )
    ) {
      return "MODERATE";
    }

    if (question.firstAttemptCorrect === true) {
      return "LOW";
    }

    return "UNDETERMINED";
  }

  function buildInterpretation(
    moduleId,
    question,
    observations,
    errors
  ) {
    const strategy = STRATEGIES[moduleId];

    let interpretation = strategy.interpretation;

    if (errors.length) {
      const codes = [
        ...new Set(errors.map(error => error.code))
      ];

      interpretation +=
        " 记录到的错误代码：" +
        codes.join(", ") + "。";
    }

    if (
      question.stage === "practice" &&
      Number.isFinite(question.highestHintUsed) &&
      question.highestHintUsed >= 2
    ) {
      interpretation +=
        " 该题练习过程中使用过 H2 或更高提示，" +
        "需要进一步观察无提示表现。";
    }

    if (
      question.stage === "reassessment" &&
      question.firstAttemptCorrect === false
    ) {
      interpretation +=
        " 即时独立复测首次作答错误，" +
        "建议教师复核相关知识点。";
    }

    if (
      question.stage === "reassessment" &&
      question.firstAttemptCorrect === true
    ) {
      interpretation +=
        " 即时独立复测首次作答正确，" +
        "但尚不能证明长期保持或迁移。";
    }

    if (!observations.length && !errors.length) {
      interpretation =
        "当前题目缺少足够的表现指标，" +
        "不能提出具体的困难判断。";
    }

    return interpretation;
  }

  function buildSupport(moduleId, question, priority) {
    const strategy = STRATEGIES[moduleId];

    if (priority === "UNDETERMINED") {
      return (
        "先检查题目记录的完整性，" +
        "再决定是否需要教学支持。"
      );
    }

    if (priority === "LOW") {
      return (
        "当前题目首次作答正确。" +
        "可以安排新的独立应用任务，" +
        "但不必仅凭这一题增加教学提示。"
      );
    }

    return strategy.support;
  }

  function mapQuestion(moduleId, sessionId, question) {
    const observations = classifyEvidence(question);
    const errors = extractErrors(question);

    const priority = determinePriority(question);

    return {
      mappingId:
        moduleId + "|" +
        sessionId + "|" +
        question.stage + "|" +
        question.questionId,

      moduleId,
      sessionId,

      questionId: question.questionId,
      stage: question.stage,

      priority,

      observedEvidence: {
        firstAttemptCorrect:
          question.firstAttemptCorrect,

        completedCorrectly:
          question.completedCorrectly,

        attemptCount:
          question.attemptCount,

        highestHintUsed:
          question.highestHintUsed,

        observations,
        errors
      },

      interpretation: buildInterpretation(
        moduleId,
        question,
        observations,
        errors
      ),

      teachingSupport: buildSupport(
        moduleId,
        question,
        priority
      ),

      independentValidation:
        STRATEGIES[moduleId].validation,

      evidenceReference: {
        moduleId,
        sessionId,
        questionId: question.questionId,
        stage: question.stage
      },

      researchNote:
        "This is a transparent rule-based mapping. " +
        "It does not establish the cause of an error " +
        "or the effectiveness of the suggested support."
    };
  }

  function mapSession(trace) {
    const moduleId = trace.moduleId;
    const mappings = [];

    STAGES.forEach(stage => {
      const stageData =
        trace.stages && trace.stages[stage];

      if (
        !stageData ||
        !Array.isArray(stageData.questions)
      ) {
        return;
      }

      stageData.questions.forEach(question => {
        mappings.push(
          mapQuestion(
            moduleId,
            trace.sessionId,
            question
          )
        );
      });
    });

    return {
      ok: true,
      moduleId,
      learnerId: trace.learnerId,
      sessionId: trace.sessionId,
      complete: trace.complete,
      mappingCount: mappings.length,
      mappings
    };
  }

  function evaluateModule(learnerId, moduleId) {
    if (!MODULES.includes(moduleId)) {
      return {
        ok: false,
        error: "UNKNOWN_MODULE"
      };
    }

    const trace = window.AuraTeacherEvidenceTrace;

    if (
      !trace ||
      typeof trace.evaluateModule !== "function"
    ) {
      return {
        ok: false,
        error: "EVIDENCE_TRACE_UNAVAILABLE"
      };
    }

    const result = trace.evaluateModule(
      learnerId,
      moduleId
    );

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    if (!result.latestSession) {
      return {
        ok: true,
        status: "INSUFFICIENT_EVIDENCE",
        moduleId,
        learnerId,
        mappingCount: 0,
        mappings: []
      };
    }

    return {
      ...mapSession(result.latestSession),
      status: "AVAILABLE"
    };
  }

  function evaluateAll(learnerId) {
    const modules = {};

    MODULES.forEach(moduleId => {
      modules[moduleId] = evaluateModule(
        learnerId,
        moduleId
      );
    });

    return {
      ok: true,
      version: VERSION,
      learnerId,
      method: "RULE_BASED_EVIDENCE_MAPPING",
      readOnly: true,
      modules,
      limitations: [
        "Observed errors are not cognitive diagnoses.",
        "Hint usage alone does not prove dependence.",
        "Question-level evidence is descriptive.",
        "Recommendations are not causal findings.",
        "Independent reassessment is not delayed retention."
      ]
    };
  }

  function getSessionMapping(
    learnerId,
    moduleId,
    sessionId
  ) {
    if (!MODULES.includes(moduleId)) {
      return {
        ok: false,
        error: "UNKNOWN_MODULE"
      };
    }

    const trace = window.AuraTeacherEvidenceTrace;

    if (
      !trace ||
      typeof trace.getSession !== "function"
    ) {
      return {
        ok: false,
        error: "EVIDENCE_TRACE_UNAVAILABLE"
      };
    }

    const result = trace.getSession(
      learnerId,
      moduleId,
      sessionId
    );

    if (!result.ok) {
      return result;
    }

    return {
      ...mapSession(result.trace),
      status: "AVAILABLE"
    };
  }

  window.AuraTeacherEvidenceMapping =
    Object.freeze({
      version: VERSION,
      evaluateModule,
      evaluateAll,
      getSessionMapping
    });

  console.info(
    "[AURA EDU] Evidence Mapping v1.0 ready."
  );

})();
