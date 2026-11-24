
/* ============================================
   AURA EDU V2.2
   STAGE 24.7

   SPELLING LEARNING ANALYTICS

   READ-ONLY RESEARCH MODULE
   - Learner-specific evidence
   - Linked diagnostic/practice/reassessment
   - Question-level learning analysis
   - Scaffolding and error summaries
   - Descriptive comparisons
   - No causal or durable mastery claims
   - No changes to historical records
============================================ */

(function () {
  "use strict";

  const KEYS = {
    profiles: "aura_learner_profiles_v2",
    diagnostic: "aura_spelling_diagnostic_records_v1",
    practice: "aura_spelling_practice_records_v1",
    reassessment:
      "aura_spelling_reassessment_records_v1"
  };

  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error("[Spelling Analytics]", error);
      return null;
    }
  }

  function sessions(key) {
    const data = read(key);
    return Array.isArray(data) ? data : [];
  }

  function findProfile(data, id) {
    if (!data || !id) return null;

    const seen = new Set();

    function visit(value, depth, key) {
      if (
        !value ||
        typeof value !== "object" ||
        depth > 6 ||
        seen.has(value)
      ) return null;

      seen.add(value);

      if (Array.isArray(value)) {
        for (const item of value) {
          const found = visit(item, depth + 1, null);
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
        (profileId != null &&
          String(profileId) === String(id)) ||
        key === String(id)
      ) return value;

      for (const [childKey, child] of
        Object.entries(value)) {
        const found = visit(child, depth + 1, childKey);
        if (found) return found;
      }

      return null;
    }

    return visit(data, 0, null);
  }

  function getName(id) {
    const profile = findProfile(
      read(KEYS.profiles), id
    );

    if (!profile) return null;

    return [
      profile.name,
      profile.displayName,
      profile.display_name,
      profile.learnerName,
      profile.studentName,
      profile.nickname,
      profile.nickName
    ].find(
      value =>
        typeof value === "string" &&
        value.trim()
    )?.trim() || null;
  }

  function score(records) {
    const correct = records.filter(
      r => r.correct === true
    ).length;

    return {
      correct,
      total: records.length,
      percent: records.length
        ? Math.round(correct / records.length * 100)
        : 0
    };
  }

  function countErrors(records) {
    const counts = {};

    records.forEach(record => {
      if (record.correct) return;

      const code =
        record.spellingErrorCode ||
        record.errorCode ||
        "SP99";

      counts[code] = (counts[code] || 0) + 1;
    });

    return counts;
  }

  function evaluate() {
    const mastery =
      window.AuraSpellingMastery;

    if (!mastery) {
      return {
        ok: false,
        status: "MASTERY_ENGINE_MISSING",
        explanation:
          "Spelling Mastery Model 未加载。"
      };
    }

    const decision = mastery.evaluate();
    const id = decision.learnerId;

    const base = {
      ok: false,
      learnerId: id,
      learnerName: id ? getName(id) : null,
      status: decision.status,
      decision: decision.decision,
      explanation: decision.explanation,
      decisionReport: decision,
      analyticsVersion: "1.0"
    };

    if (!decision.ok) return base;

    const ids = decision.sessions;

    function match(key, sessionId) {
      return sessions(key).find(s =>
        s &&
        s.sessionId === sessionId &&
        String(s.learnerId) === String(id)
      ) || null;
    }

    const diagnostic = match(
      KEYS.diagnostic,
      ids.diagnosticSessionId
    );

    const practice = match(
      KEYS.practice,
      ids.practiceSessionId
    );

    const reassessment = match(
      KEYS.reassessment,
      ids.reassessmentSessionId
    );

    if (
      !diagnostic ||
      !practice ||
      !reassessment
    ) {
      return {
        ...base,
        status: "LINKED_RECORD_MISSING",
        explanation:
          "找不到完整的关联学习记录。"
      };
    }

    const diagnosticRecords = diagnostic.records;
    const practiceRecords = practice.records;
    const reassessmentRecords =
      reassessment.records;

    const practiceMap = new Map();

    practiceRecords.forEach(record => {
      const key =
        record.wordId + "|" + record.taskType;
      practiceMap.set(key, record);
    });

    const diagnosticMap = new Map();

    diagnosticRecords.forEach(record => {
      const key =
        record.wordId + "|" + record.taskType;
      diagnosticMap.set(key, record);
    });

    const questions = reassessmentRecords.map(
      record => {
        const key =
          record.wordId + "|" + record.taskType;

        const initial = diagnosticMap.get(key);
        const guided = practiceMap.get(key);

        return {
          wordId: record.wordId,
          taskType: record.taskType,
          target: record.target,
          diagnosticCorrect:
            initial?.correct ?? null,
          practiced: Boolean(guided),
          practiceFirstAttemptCorrect:
            guided?.firstAttemptCorrect ?? null,
          practiceEventuallyCorrect:
            guided?.eventuallyCorrect ?? null,
          practiceAttempts:
            guided?.attemptCount ?? 0,
          highestHintUsed:
            guided?.highestHintUsed ?? 0,
          reassessmentCorrect: record.correct,
          reassessmentErrorCode:
            record.spellingErrorCode ||
            record.errorCode ||
            "SP99",
          reassessmentTimeMs:
            record.timeMs ?? null,
          changedFromIncorrectToCorrect:
            initial?.correct === false &&
            record.correct === true,
          changedFromCorrectToIncorrect:
            initial?.correct === true &&
            record.correct === false
        };
      }
    );

    const corrected = questions.filter(
      q => q.changedFromIncorrectToCorrect
    ).length;

    const regressed = questions.filter(
      q => q.changedFromCorrectToIncorrect
    ).length;

    const practiceAttempts =
      practiceRecords.flatMap(
        record => Array.isArray(record.attempts)
          ? record.attempts
          : []
      );

    const hintDistribution = {
      H0: 0,
      H1: 0,
      H2: 0,
      H3: 0
    };

    practiceRecords.forEach(record => {
      const level = Number(
        record.highestHintUsed
      );

      if (
        Number.isInteger(level) &&
        level >= 0 &&
        level <= 3
      ) {
        hintDistribution["H" + level]++;
      }
    });

    const attemptErrors = {};

    practiceAttempts.forEach(attempt => {
      if (attempt.correct) return;

      const code =
        attempt.spellingErrorCode ||
        attempt.errorCode ||
        "SP99";

      attemptErrors[code] =
        (attemptErrors[code] || 0) + 1;
    });

    return {
      ...base,
      ok: true,
      status: "ANALYTICS_READY",
      sessions: ids,
      scores: {
        diagnostic: score(diagnosticRecords),
        reassessment: score(reassessmentRecords),
        wordSpelling: score(
          reassessmentRecords.filter(
            r => r.taskType === "word"
          )
        ),
        sentenceApplication: score(
          reassessmentRecords.filter(
            r => r.taskType === "sentence"
          )
        ),
        percentagePointDifference:
          score(reassessmentRecords).percent -
          score(diagnosticRecords).percent
      },
      learningTransitions: {
        incorrectToCorrect: corrected,
        correctToIncorrect: regressed,
        unchanged: questions.length -
          corrected - regressed
      },
      scaffolding: {
        practicedQuestions:
          practiceRecords.length,
        totalAttempts:
          practiceAttempts.length,
        questionsUsingHints:
          practiceRecords.filter(
            r => r.highestHintUsed > 0
          ).length,
        highestHintDistribution:
          hintDistribution,
        highestHintLevel: Math.max(
          0,
          ...practiceRecords.map(
            r => r.highestHintUsed
          )
        )
      },
      errors: {
        diagnostic:
          countErrors(diagnosticRecords),
        practiceAttempts: attemptErrors,
        reassessment:
          countErrors(reassessmentRecords)
      },
      questions,
      researchInterpretation: {
        design:
          "Linked within-learner descriptive analysis",
        evidence:
          "Diagnostic, adaptive practice and independent reassessment",
        limitations: [
          "Diagnostic and reassessment reuse target items",
          "Practice is focused on diagnostic errors",
          "No control group",
          "No delayed retention test",
          "No transfer assessment",
          "No causal inference",
          "Provisional mastery is not durable mastery"
        ]
      }
    };
  }

  window.AuraSpellingAnalytics =
    Object.freeze({
      version: "1.0",
      evaluate
    });

  console.info(
    "[AURA Spelling] Learning Analytics Ready"
  );

})();
