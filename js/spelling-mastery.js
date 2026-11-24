
/* ============================================
   AURA EDU V2.2
   STAGE 24.6

   SPELLING MASTERY DECISION MODEL

   Research prototype / Rule-based model

   READ ONLY:
   - Diagnostic records
   - Adaptive Practice records
   - Independent Reassessment records
   - Active learner identity

   Does NOT:
   - Modify historical records
   - Grant durable mastery
   - Unlock Speaking
   - Change Grammar progression

   Version 1.0
============================================ */

(function () {
  "use strict";

  const KEYS = Object.freeze({
    active: "aura_active_learner_id_v2",
    diagnostic:
      "aura_spelling_diagnostic_records_v1",
    practice:
      "aura_spelling_practice_records_v1",
    reassessment:
      "aura_spelling_reassessment_records_v1"
  });

  const RULES = Object.freeze({
    overallMastery: 75,
    wordMastery: 75,
    sentenceMastery: 75,
    developing: 50,
    expectedQuestions: 8,
    expectedWordQuestions: 4,
    expectedSentenceQuestions: 4
  });

  function getActiveLearnerId() {
    try {
      const raw = localStorage.getItem(KEYS.active);

      if (!raw) return null;

      if (raw.startsWith('"')) {
        const parsed = JSON.parse(raw);
        return typeof parsed === "string"
          ? parsed
          : null;
      }

      return raw;
    } catch (error) {
      console.error(
        "[Spelling Mastery] Identity error:",
        error
      );
      return null;
    }
  }

  function readSessions(key) {
    try {
      const raw = localStorage.getItem(key);

      if (!raw) {
        return { ok: true, sessions: [] };
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return {
          ok: false,
          sessions: [],
          error: "INVALID_STORAGE_FORMAT"
        };
      }

      return {
        ok: true,
        sessions: parsed
      };
    } catch (error) {
      console.error(
        "[Spelling Mastery] Storage error:",
        error
      );

      return {
        ok: false,
        sessions: [],
        error: "STORAGE_READ_ERROR"
      };
    }
  }

  function isRecordValid(record) {
    return Boolean(
      record &&
      typeof record === "object" &&
      typeof record.wordId === "string" &&
      ["word", "sentence"].includes(
        record.taskType
      ) &&
      typeof record.correct === "boolean"
    );
  }

  function validDiagnostic(session, learnerId) {
    return Boolean(
      session &&
      session.stage === "diagnostic" &&
      String(session.learnerId) ===
        String(learnerId) &&
      typeof session.sessionId === "string" &&
      typeof session.completedAt === "string" &&
      Array.isArray(session.records) &&
      session.records.length ===
        RULES.expectedQuestions &&
      session.records.every(isRecordValid)
    );
  }

  function validPractice(
    session,
    learnerId,
    diagnosticId
  ) {
    if (
      !session ||
      session.stage !== "practice" ||
      String(session.learnerId) !==
        String(learnerId) ||
      session.sourceDiagnosticSessionId !==
        diagnosticId ||
      !session.sessionId ||
      !session.completedAt ||
      !Array.isArray(session.records) ||
      session.records.length === 0
    ) {
      return false;
    }

    return session.records.every(record =>
      record &&
      typeof record.wordId === "string" &&
      typeof record.firstAttemptCorrect ===
        "boolean" &&
      typeof record.eventuallyCorrect ===
        "boolean" &&
      Number.isInteger(record.attemptCount) &&
      record.attemptCount >= 1 &&
      Number.isInteger(record.highestHintUsed) &&
      record.highestHintUsed >= 0 &&
      record.highestHintUsed <= 3 &&
      Array.isArray(record.attempts) &&
      record.attempts.length ===
        record.attemptCount
    );
  }

  function validReassessment(
    session,
    learnerId,
    diagnosticId,
    practiceId
  ) {
    if (
      !session ||
      session.stage !== "reassessment" ||
      String(session.learnerId) !==
        String(learnerId) ||
      session.sourceDiagnosticSessionId !==
        diagnosticId ||
      session.sourcePracticeSessionId !==
        practiceId ||
      !session.sessionId ||
      !session.completedAt ||
      !Array.isArray(session.records) ||
      session.records.length !==
        RULES.expectedQuestions
    ) {
      return false;
    }

    return session.records.every(record =>
      isRecordValid(record) &&
      record.highestHintUsed === 0 &&
      record.attemptCount === 1 &&
      Array.isArray(record.attempts) &&
      record.attempts.length === 1 &&
      record.attempts[0].correct ===
        record.correct &&
      record.attempts[0].hintLevelAtAttempt === 0
    );
  }

  function latest(sessions) {
    return [...sessions].sort(
      (a, b) =>
        String(b.completedAt).localeCompare(
          String(a.completedAt)
        )
    )[0] || null;
  }

  function score(records) {
    const correct = records.filter(
      record => record.correct
    ).length;

    return {
      correct,
      total: records.length,
      percent: records.length
        ? Math.round(
            correct / records.length * 100
          )
        : 0
    };
  }

  function scoreByType(records, taskType) {
    return score(
      records.filter(
        record => record.taskType === taskType
      )
    );
  }

  function summarizeErrors(records) {
    const summary = {};

    records.forEach(record => {
      if (record.correct) return;

      const code =
        record.spellingErrorCode ||
        record.errorCode ||
        "SP99";

      summary[code] =
        (summary[code] || 0) + 1;
    });

    return summary;
  }

  function summarizePractice(session) {
    const records = session.records;

    const firstAttemptCorrect =
      records.filter(
        record => record.firstAttemptCorrect
      ).length;

    const eventuallyCorrect =
      records.filter(
        record => record.eventuallyCorrect
      ).length;

    return {
      total: records.length,
      firstAttemptCorrect,
      eventuallyCorrect,
      questionsUsingHints:
        records.filter(
          record => record.highestHintUsed > 0
        ).length,
      highestHintLevel: Math.max(
        0,
        ...records.map(
          record => record.highestHintUsed
        )
      ),
      totalAttempts: records.reduce(
        (sum, record) =>
          sum + record.attemptCount,
        0
      )
    };
  }

  function makeUnavailable(
    learnerId,
    status,
    explanation,
    extra
  ) {
    return {
      ok: false,
      learnerId,
      status,
      decision: "INSUFFICIENT_EVIDENCE",
      provisionalMastery: false,
      readyForNextLearning: false,
      speakingEligible: false,
      durableMasteryVerified: false,
      explanation,
      rules: { ...RULES },
      ...extra
    };
  }

  function evaluate(learnerId) {
    const id = learnerId == null
      ? getActiveLearnerId()
      : String(learnerId);

    if (!id) {
      return makeUnavailable(
        null,
        "NO_ACTIVE_LEARNER",
        "请先选择学生。"
      );
    }

    const diagnosticData =
      readSessions(KEYS.diagnostic);

    const practiceData =
      readSessions(KEYS.practice);

    const reassessmentData =
      readSessions(KEYS.reassessment);

    if (
      !diagnosticData.ok ||
      !practiceData.ok ||
      !reassessmentData.ok
    ) {
      return makeUnavailable(
        id,
        "STORAGE_ERROR",
        "学习记录格式异常。为保护历史记录，" +
        "系统不会自动修改数据。"
      );
    }

    const diagnostic = latest(
      diagnosticData.sessions.filter(
        session => validDiagnostic(session, id)
      )
    );

    if (!diagnostic) {
      return makeUnavailable(
        id,
        "DIAGNOSTIC_MISSING",
        "没有找到完整的拼写诊断记录。"
      );
    }

    const practice = latest(
      practiceData.sessions.filter(
        session => validPractice(
          session,
          id,
          diagnostic.sessionId
        )
      )
    );

    if (!practice) {
      return makeUnavailable(
        id,
        "PRACTICE_MISSING",
        "已找到诊断，但没有找到对应的完整练习。",
        {
          diagnosticSessionId:
            diagnostic.sessionId
        }
      );
    }

    const reassessment = latest(
      reassessmentData.sessions.filter(
        session => validReassessment(
          session,
          id,
          diagnostic.sessionId,
          practice.sessionId
        )
      )
    );

    if (!reassessment) {
      return makeUnavailable(
        id,
        "REASSESSMENT_MISSING",
        "已找到诊断和练习，但没有找到" +
        "对应的有效独立复测。",
        {
          diagnosticSessionId:
            diagnostic.sessionId,
          practiceSessionId:
            practice.sessionId
        }
      );
    }

    // Confirm the same word/task set is assessed.
    const signature = record =>
      record.wordId + "|" + record.taskType;

    const diagnosticItems =
      diagnostic.records.map(signature).sort();

    const reassessmentItems =
      reassessment.records.map(signature).sort();

    const sameItems =
      diagnosticItems.length ===
        reassessmentItems.length &&
      diagnosticItems.every(
        (item, index) =>
          item === reassessmentItems[index]
      );

    const wordCount =
      reassessment.records.filter(
        record => record.taskType === "word"
      ).length;

    const sentenceCount =
      reassessment.records.filter(
        record => record.taskType === "sentence"
      ).length;

    if (
      !sameItems ||
      wordCount !== RULES.expectedWordQuestions ||
      sentenceCount !==
        RULES.expectedSentenceQuestions
    ) {
      return makeUnavailable(
        id,
        "QUESTION_SET_MISMATCH",
        "诊断与复测的题目结构不一致，" +
        "暂不进行掌握度判断。"
      );
    }

    const diagnosticScore =
      score(diagnostic.records);

    const overall =
      score(reassessment.records);

    const wordSpelling =
      scoreByType(
        reassessment.records,
        "word"
      );

    const sentenceApplication =
      scoreByType(
        reassessment.records,
        "sentence"
      );

    const practiceSummary =
      summarizePractice(practice);

    let decision;
    let recommendedPath;
    let explanation;

    if (
      overall.percent >= RULES.overallMastery &&
      wordSpelling.percent >= RULES.wordMastery &&
      sentenceApplication.percent >=
        RULES.sentenceMastery
    ) {
      decision = "PROVISIONAL_MASTERY";
      recommendedPath =
        "NEXT_LEARNING_PREPARATION";

      explanation =
        "学生在当前题目集的无提示复测中，" +
        "总体、单词拼写及句子应用均达到" +
        "暂定阈值。仍需迁移题和延迟复测。";

    } else if (
      overall.percent >= RULES.developing
    ) {
      decision = "DEVELOPING";
      recommendedPath =
        "TARGETED_ADAPTIVE_PRACTICE";

      explanation =
        "学生已表现出部分独立完成能力，" +
        "但尚未达到所有暂定掌握标准。";

    } else {
      decision = "NEEDS_SUPPORT";
      recommendedPath =
        "FOUNDATION_SCAFFOLDING";

      explanation =
        "当前独立复测表现低于暂定发展阈值，" +
        "建议提供基础拼写支持。";
    }

    return {
      ok: true,
      learnerId: id,
      status: "EVALUATED",
      decision,
      provisionalMastery:
        decision === "PROVISIONAL_MASTERY",
      readyForNextLearning:
        decision === "PROVISIONAL_MASTERY",

      // No Speaking unlock in Stage 24.6.
      speakingEligible: false,
      durableMasteryVerified: false,

      recommendedPath,
      explanation,

      sessions: {
        diagnosticSessionId:
          diagnostic.sessionId,
        practiceSessionId:
          practice.sessionId,
        reassessmentSessionId:
          reassessment.sessionId
      },

      scores: {
        diagnostic: diagnosticScore,
        reassessment: overall,
        wordSpelling,
        sentenceApplication,
        percentagePointDifference:
          overall.percent -
          diagnosticScore.percent
      },

      practice: practiceSummary,

      errorSummary: summarizeErrors(
        reassessment.records
      ),

      rules: { ...RULES },

      limitations: [
        "Same-item reassessment",
        "No delayed retention evidence",
        "No transfer assessment",
        "No causal inference",
        "Not durable mastery"
      ],

      ruleVersion: "SPELLING-MASTERY-1.0"
    };
  }

  window.AuraSpellingMastery =
    Object.freeze({
      version: "1.0",
      getActiveLearnerId,
      evaluate,
      rules: RULES
    });

  console.info(
    "[AURA Spelling] Mastery Decision Model Ready"
  );

})();
