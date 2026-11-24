
/* ==================================================
   AURA EDU — TEACHER RECOMMENDATIONS
   STAGE 25.3.5.1 / VERSION 1.1

   Evidence-based, rule-based recommendations.

   READ ONLY:
   - No storage writes
   - No learner switching
   - No mastery recalculation
   - No changes to historical records

   Compatible with Stage 25.3.4.2 teacher report.
================================================== */

(function () {
  "use strict";

  const VERSION = "1.1";

  const MODULES = [
    {
      id: "G1",
      name: "Verb to Be",
      key: "aura_g1_learning_records_v1"
    },
    {
      id: "G2",
      name: "Subject–Verb Agreement",
      key: "aura_g2_learning_records_v1"
    },
    {
      id: "G3",
      name: "Sentence Construction",
      key: "aura_g3_learning_records_v1"
    },
    {
      id: "SPELLING",
      name: "Spelling and Sentence Application"
    }
  ];

  const SPELLING_KEYS = {
    diagnostic: "aura_spelling_diagnostic_records_v1",
    practice: "aura_spelling_practice_records_v1",
    reassessment: "aura_spelling_reassessment_records_v1"
  };

  function readRecords(key) {
    try {
      const raw = localStorage.getItem(key);

      if (raw === null) {
        return { ok: true, records: [] };
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return {
          ok: false,
          records: [],
          error: "INVALID_RECORD_FORMAT"
        };
      }

      return {
        ok: true,
        records: parsed
      };
    } catch (error) {
      return {
        ok: false,
        records: [],
        error: "RECORD_READ_FAILED"
      };
    }
  }

  function recordsForLearner(key, learnerId) {
    const loaded = readRecords(key);

    if (!loaded.ok) return loaded;

    return {
      ok: true,
      records: loaded.records.filter(item =>
        item &&
        typeof item === "object" &&
        String(item.learnerId) === String(learnerId)
      )
    };
  }

  function latest(records) {
    if (!records.length) return null;

    return [...records].sort((a, b) => {
      const ta = Date.parse(
        a.completedAt || a.startedAt || ""
      ) || 0;

      const tb = Date.parse(
        b.completedAt || b.startedAt || ""
      ) || 0;

      return tb - ta;
    })[0];
  }

  function validScore(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const correct = value.correct;
    const total = value.total;

    if (
      !Number.isInteger(correct) ||
      !Number.isInteger(total) ||
      total <= 0 ||
      correct < 0 ||
      correct > total
    ) {
      return null;
    }

    return {
      correct,
      total,
      percent: Math.round(correct / total * 100)
    };
  }

  function scoreText(score) {
    return score
      ? score.correct + "/" + score.total +
        " (" + score.percent + "%)"
      : "No Evidence";
  }

  function grammarScore(session, stage) {
    const result = session.result || {};

    const stored = validScore(result[stage]);
    if (stored) return stored;

    const records = session.records.filter(
      item => item && item.stage === stage
    );

    if (
      !records.length ||
      !records.every(
        item => typeof item.firstAttemptCorrect === "boolean"
      )
    ) {
      return null;
    }

    return validScore({
      correct: records.filter(
        item => item.firstAttemptCorrect
      ).length,
      total: records.length
    });
  }

  function safeLabel(value) {
    if (value === null || value === undefined) {
      return "Unknown";
    }

    const text = String(value).trim();

    return text
      ? text.slice(0, 120)
      : "Unknown";
  }

  function grammarErrors(moduleId, records) {
    const summary = {};

    records.forEach(record => {
      const entries = moduleId === "G1"
        ? record.errorCodes
        : record.errors;

      if (!Array.isArray(entries)) return;

      entries.forEach(error => {
        if (!error) return;

        const code = typeof error === "string"
          ? error
          : error.code || "UNCLASSIFIED";

        let detail = "";

        if (moduleId === "G1") {
          detail = error.selected
            ? "selected " + safeLabel(error.selected)
            : "";
        }

        if (moduleId === "G2") {
          detail = safeLabel(
            error.rule || record.rule
          );
        }

        if (moduleId === "G3") {
          detail = safeLabel(
            error.structure || record.structure
          );
        }

        const key = safeLabel(code) +
          (detail ? " | " + detail : "");

        summary[key] = (summary[key] || 0) + 1;
      });
    });

    return Object.entries(summary)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) =>
        b.count - a.count ||
        a.label.localeCompare(b.label)
      );
  }

  function stageErrors(moduleId, records, stage) {
    return grammarErrors(
      moduleId,
      records.filter(item => item.stage === stage)
    );
  }

  function grammarEvidence(module, learnerId) {
    const loaded = recordsForLearner(
      module.key,
      learnerId
    );

    if (!loaded.ok) {
      return {
        ok: false,
        status: "READ_ERROR"
      };
    }

    const completed = loaded.records.filter(
      session =>
        session &&
        session.result &&
        Array.isArray(session.records) &&
        ["diagnostic", "practice", "reassessment"]
          .every(stage =>
            session.records.some(
              item => item && item.stage === stage
            )
          )
    );

    const session = latest(completed);

    if (!session) {
      return {
        ok: false,
        status: "INSUFFICIENT_EVIDENCE"
      };
    }

    const diagnostic = grammarScore(
      session, "diagnostic"
    );

    const reassessment = grammarScore(
      session, "reassessment"
    );

    const practice = session.records.filter(
      item => item.stage === "practice"
    );

    const hintsComplete =
      practice.length > 0 &&
      practice.every(
        item => Number.isFinite(item.highestHintUsed)
      );

    const highestHint = Number.isFinite(
      session.result.highestHintLevel
    )
      ? session.result.highestHintLevel
      : hintsComplete
        ? Math.max(
            ...practice.map(item => item.highestHintUsed)
          )
        : null;

    const questionsUsingHints = hintsComplete
      ? practice.filter(
          item => item.highestHintUsed > 0
        ).length
      : null;

    const totalAttemptsKnown = practice.every(
      item => Array.isArray(item.attempts)
    );

    const totalAttempts = totalAttemptsKnown
      ? practice.reduce(
          (sum, item) => sum + item.attempts.length,
          0
        )
      : null;

    const diagnosticErrors = stageErrors(
      module.id,
      session.records,
      "diagnostic"
    );

    const practiceErrors = stageErrors(
      module.id,
      session.records,
      "practice"
    );

    const reassessmentErrors = stageErrors(
      module.id,
      session.records,
      "reassessment"
    );

    return {
      ok: true,
      status: "AVAILABLE",
      sessionId: session.sessionId || null,
      diagnostic,
      reassessment,
      highestHint,
      practiceQuestionCount: practice.length,
      questionsUsingHints,
      totalAttempts,
      diagnosticErrors,
      practiceErrors,
      reassessmentErrors,
      masteryState:
        session.result.masteryState || null,
      recommendedPath:
        session.result.recommendedPath || null
    };
  }

  function spellingEvidence(learnerId) {
    const mastery = window.AuraSpellingMastery;

    if (
      !mastery ||
      typeof mastery.evaluate !== "function"
    ) {
      return {
        ok: false,
        status: "MASTERY_MODEL_UNAVAILABLE"
      };
    }

    let decision;

    try {
      decision = mastery.evaluate(learnerId);
    } catch (error) {
      return {
        ok: false,
        status: "EVALUATION_ERROR"
      };
    }

    if (!decision || !decision.ok) {
      return {
        ok: false,
        status: decision && decision.status
          ? decision.status
          : "INSUFFICIENT_EVIDENCE"
      };
    }

    const sessions = decision.sessions || {};
    const linked = {};

    for (const stage of [
      "diagnostic",
      "practice",
      "reassessment"
    ]) {
      const sessionId =
        sessions[stage + "SessionId"];

      if (!sessionId) {
        return {
          ok: false,
          status: "MISSING_SESSION_LINK"
        };
      }

      const loaded = recordsForLearner(
        SPELLING_KEYS[stage],
        learnerId
      );

      if (!loaded.ok) {
        return {
          ok: false,
          status: "READ_ERROR"
        };
      }

      linked[stage] = loaded.records.find(
        item => item.sessionId === sessionId
      );

      if (
        !linked[stage] ||
        !Array.isArray(linked[stage].records)
      ) {
        return {
          ok: false,
          status: "MISSING_LINKED_RECORD"
        };
      }
    }

    const scores = decision.scores || {};
    const practice = decision.practice || {};

    const errorCounts = {};

    for (const stage of [
      "diagnostic",
      "reassessment"
    ]) {
      linked[stage].records.forEach(item => {
        if (item.correct === true) return;

        const code =
          item.spellingErrorCode ||
          item.errorCode ||
          "SP99";

        const key = stage + " | " + safeLabel(code);

        errorCounts[key] = (errorCounts[key] || 0) + 1;
      });
    }

    const spellingErrors = Object.entries(errorCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    return {
      ok: true,
      status: "AVAILABLE",
      sessionId: sessions.reassessmentSessionId,
      diagnostic: validScore(scores.diagnostic),
      reassessment: validScore(scores.reassessment),
      wordSpelling: validScore(scores.wordSpelling),
      sentenceApplication:
        validScore(scores.sentenceApplication),
      highestHint: Number.isFinite(
        practice.highestHintLevel
      )
        ? practice.highestHintLevel
        : null,
      questionsUsingHints: Number.isFinite(
        practice.questionsUsingHints
      )
        ? practice.questionsUsingHints
        : null,
      practiceQuestionCount: Number.isFinite(
        practice.total
      )
        ? practice.total
        : null,
      spellingErrors,
      masteryState: decision.decision || null,
      recommendedPath:
        decision.recommendedPath || null
    };
  }

  const STRATEGIES = {
    G1: {
      difficulty:
        "结合错误选择检查 I、单数主语、复数主语" +
        "与 am/is/are 的对应关系。",
      scaffolding:
        "先让学生标记主语，再比较 am/is/are。" +
        "根据需要提供 H1–H3，随后逐步撤除提示。",
      independent:
        "使用新的主语和句子，独立选择正确的 be 动词。",
      followUp:
        "安排无提示的新题和延迟复测，" +
        "检查规则是否能够保持和迁移。"
    },
    G2: {
      difficulty:
        "根据错误记录中的 rule，检查主语类别" +
        "与动词形式之间的对应关系。",
      scaffolding:
        "先识别主语，再观察动词形式变化。" +
        "使用示例、对比和逐步撤除的提示。",
      independent:
        "用新的主语和动词组合独立完成选择与改错。",
      followUp:
        "通过不同词汇的新题与延迟独立复测，" +
        "观察主谓一致规则的应用。"
    },
    G3: {
      difficulty:
        "根据 structure 和错误句子记录，" +
        "检查词序与句子结构。",
      scaffolding:
        "先识别句子成分，必要时使用句型框架。" +
        "之后逐步撤除框架和提示。",
      independent:
        "根据新的日常情境独立排列或构建英文句子。",
      followUp:
        "安排新情境、无提示句子任务与延迟复测。"
    },
    SPELLING: {
      difficulty:
        "比较单词拼写和句子应用中的实际错误记录。",
      scaffolding:
        "针对已观察到的错误词，" +
        "提供分段拼读、词形比较和逐级减少的提示。",
      independent:
        "在无提示条件下完成新词或新句子的拼写任务。",
      followUp:
        "使用延迟拼写复测及新语境任务检查保持和迁移。"
    }
  };

  function describeErrors(items, label) {
    if (!items || !items.length) {
      return label + ": no recorded errors";
    }

    return label + ": " +
      items.slice(0, 4).map(
        item => item.label + " (" + item.count + ")"
      ).join("; ");
  }

  function recommendation(module, evidence) {
    if (!evidence.ok) {
      return {
        moduleId: module.id,
        moduleName: module.name,
        status: evidence.status,
        supportLevel: "INSUFFICIENT_EVIDENCE",
        sessionId: null,
        evidence: [
          "No complete linked evidence is available."
        ],
        interpretation:
          "目前证据不足，不能推断学生的具体困难。",
        scaffolding:
          "先检查学习记录是否完整，" +
          "再依据实际错误和提示使用情况制定支持。",
        independentPractice:
          "暂不根据缺失数据指定个性化任务。",
        followUpEvaluation:
          "完成并保存相关学习阶段后重新评估。",
        researchNote:
          "No learner-specific conclusion was drawn " +
          "from missing evidence."
      };
    }

    const strategy = STRATEGIES[module.id];
    const facts = [
      "Diagnostic: " + scoreText(evidence.diagnostic),
      "Independent Reassessment: " +
        scoreText(evidence.reassessment)
    ];

    if (
      evidence.diagnostic &&
      evidence.reassessment
    ) {
      const change =
        evidence.reassessment.percent -
        evidence.diagnostic.percent;

      facts.push(
        "Observed score difference: " +
        (change > 0 ? "+" : "") +
        change + " percentage points"
      );
    }

    if (evidence.highestHint !== null) {
      facts.push(
        "Highest recorded hint: H" +
        evidence.highestHint
      );
    }

    if (
      evidence.questionsUsingHints !== null &&
      evidence.practiceQuestionCount !== null
    ) {
      facts.push(
        "Practice questions using hints: " +
        evidence.questionsUsingHints +
        "/" + evidence.practiceQuestionCount
      );
    }

    if (Number.isFinite(evidence.totalAttempts)) {
      facts.push(
        "Practice attempts recorded: " +
        evidence.totalAttempts
      );
    }

    if (module.id === "SPELLING") {
      facts.push(
        "Word Spelling: " +
        scoreText(evidence.wordSpelling)
      );

      facts.push(
        "Sentence Application: " +
        scoreText(evidence.sentenceApplication)
      );

      facts.push(
        describeErrors(
          evidence.spellingErrors,
          "Recorded Spelling errors"
        )
      );
    } else {
      facts.push(
        describeErrors(
          evidence.diagnosticErrors,
          "Diagnostic errors"
        )
      );

      facts.push(
        describeErrors(
          evidence.practiceErrors,
          "Practice errors"
        )
      );

      facts.push(
        describeErrors(
          evidence.reassessmentErrors,
          "Reassessment errors"
        )
      );
    }

    if (evidence.masteryState) {
      facts.push(
        "Existing mastery decision: " +
        evidence.masteryState
      );
    }

    if (evidence.recommendedPath) {
      facts.push(
        "Existing recommended path: " +
        evidence.recommendedPath
      );
    }

    let supportLevel = "EVIDENCE_REVIEW";

    let interpretation =
      "当前证据可用于描述学习表现，" +
      "但不能单凭分数确定错误成因。";

    const score = evidence.reassessment;

    if (score) {
      if (score.percent < 60) {
        supportLevel = "INTENSIVE_SUPPORT";

        interpretation =
          "即时独立复测正确率低于 60%，" +
          "建议优先复核相关知识点和错误题目。";
      } else if (score.percent < 80) {
        supportLevel = "TARGETED_SUPPORT";

        interpretation =
          "即时独立复测正确率为 60%–79%，" +
          "建议针对实际错误开展定向练习。";
      } else {
        supportLevel = "INDEPENDENT_EXTENSION";

        interpretation =
          "即时独立复测正确率达到 80% 或以上，" +
          "可以考虑增加新情境的独立练习，" +
          "但尚不能确认长期掌握。";
      }
    }

    if (
      evidence.highestHint !== null &&
      evidence.highestHint >= 2
    ) {
      interpretation +=
        " 练习中曾使用 H2/H3 提示，" +
        "建议观察撤除提示后的表现。";
    }

    let observedErrors = [];

    if (module.id === "SPELLING") {
      observedErrors = evidence.spellingErrors || [];
    } else {
      observedErrors =
        evidence.reassessmentErrors || [];
    }

    if (observedErrors.length) {
      interpretation +=
        " 已记录的错误类别包括：" +
        observedErrors.slice(0, 3)
          .map(item => item.label)
          .join("、") +
        "。这些是观察到的错误类别，" +
        "并不等同于已确认的认知困难。";
    } else {
      interpretation +=
        " 当前对应错误记录中没有可进一步分类的错误，" +
        "不应据此推断学生存在特定困难。";
    }

    interpretation += " " + strategy.difficulty;

    return {
      moduleId: module.id,
      moduleName: module.name,
      status: "AVAILABLE",
      supportLevel,
      sessionId: evidence.sessionId || null,
      evidence: facts,
      interpretation,
      scaffolding: strategy.scaffolding,
      independentPractice: strategy.independent,
      followUpEvaluation: strategy.followUp,
      researchNote:
        "The recommendation uses recorded evidence " +
        "and predefined descriptive rules. " +
        "Error categories do not establish causes. " +
        "No causal effectiveness, durable mastery " +
        "or transfer has been demonstrated."
    };
  }

  function evaluate(learnerId) {
    if (
      typeof learnerId !== "string" ||
      !learnerId.trim()
    ) {
      return {
        ok: false,
        error: "INVALID_LEARNER_ID"
      };
    }

    const identity = window.AuraLearnerIdentity;

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

    const results = MODULES.map(module => {
      const evidence = module.id === "SPELLING"
        ? spellingEvidence(learnerId)
        : grammarEvidence(module, learnerId);

      return recommendation(module, evidence);
    });

    return {
      ok: true,
      version: VERSION,
      learnerId: learner.id,
      generatedAt: new Date().toISOString(),
      method: "RULE_BASED_ERROR_EVIDENCE",
      readOnly: true,
      recommendations: results,
      limitations: [
        "Recorded errors are not confirmed causes",
        "No causal inference",
        "No delayed retention evidence",
        "No independent transfer validation",
        "No clinical or psychological diagnosis"
      ]
    };
  }

  window.AuraTeacherRecommendations =
    Object.freeze({
      version: VERSION,
      evaluate
    });

  console.info(
    "[AURA EDU] Teacher Recommendations v1.1 ready."
  );
})();
