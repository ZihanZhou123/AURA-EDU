
/* ============================================
   AURA EDU V2.2
   STAGE 24.2

   SPELLING KNOWLEDGE MODEL

   Research Prototype:
   Word Spelling + Sentence Application

   Target learners: Ages 10–12

   This module:
   - Defines spelling knowledge units
   - Defines learning objectives
   - Provides deterministic error analysis
   - Supports later adaptive scaffolding
   - Does not change existing learning data

   Version: 1.0
============================================ */

(function () {
  "use strict";

  // ========================================
  // 1. KNOWLEDGE UNITS
  // ========================================

  const units = [
    {
      id: "S1",
      title: "My School",
      titleZh: "我的学校",

      objective:
        "Spell school-related words and use them in simple sentences.",

      words: [
        {
          id: "S1-W1",
          word: "school",
          meaning: "学校",
          sentence: "I go to school.",
          sentenceBlank: "I go to ____."
        },
        {
          id: "S1-W2",
          word: "teacher",
          meaning: "老师",
          sentence: "My teacher is kind.",
          sentenceBlank: "My ____ is kind."
        },
        {
          id: "S1-W3",
          word: "classroom",
          meaning: "教室",
          sentence: "This is my classroom.",
          sentenceBlank: "This is my ____."
        },
        {
          id: "S1-W4",
          word: "student",
          meaning: "学生",
          sentence: "I am a student.",
          sentenceBlank: "I am a ____."
        }
      ]
    },

    {
      id: "S2",
      title: "My Daily Life",
      titleZh: "我的日常生活",

      objective:
        "Spell daily-routine vocabulary and use it in context.",

      words: [
        {
          id: "S2-W1",
          word: "breakfast",
          meaning: "早餐",
          sentence: "I eat breakfast.",
          sentenceBlank: "I eat ____."
        },
        {
          id: "S2-W2",
          word: "morning",
          meaning: "早晨",
          sentence: "I study in the morning.",
          sentenceBlank: "I study in the ____."
        },
        {
          id: "S2-W3",
          word: "homework",
          meaning: "家庭作业",
          sentence: "I do my homework.",
          sentenceBlank: "I do my ____."
        },
        {
          id: "S2-W4",
          word: "evening",
          meaning: "晚上",
          sentence: "I read in the evening.",
          sentenceBlank: "I read in the ____."
        }
      ]
    },

    {
      id: "S3",
      title: "My Friends",
      titleZh: "我的朋友",

      objective:
        "Spell friendship vocabulary and use it in simple sentences.",

      words: [
        {
          id: "S3-W1",
          word: "friend",
          meaning: "朋友",
          sentence: "She is my friend.",
          sentenceBlank: "She is my ____."
        },
        {
          id: "S3-W2",
          word: "happy",
          meaning: "开心的",
          sentence: "I am happy.",
          sentenceBlank: "I am ____."
        },
        {
          id: "S3-W3",
          word: "helpful",
          meaning: "乐于助人的",
          sentence: "My friend is helpful.",
          sentenceBlank: "My friend is ____."
        },
        {
          id: "S3-W4",
          word: "together",
          meaning: "一起",
          sentence: "We learn together.",
          sentenceBlank: "We learn ____."
        }
      ]
    }
  ];

  // ========================================
  // 2. ERROR CATEGORIES
  // ========================================

  const errorCategories = {
    SP00: {
      label: "Correct",
      labelZh: "正确"
    },

    SP01: {
      label: "Missing Letter",
      labelZh: "缺少字母"
    },

    SP02: {
      label: "Extra Letter",
      labelZh: "多余字母"
    },

    SP03: {
      label: "Letter Substitution",
      labelZh: "字母替换"
    },

    SP04: {
      label: "Letter Order",
      labelZh: "字母顺序错误"
    },

    SP05: {
      label: "Sentence Application",
      labelZh: "句子应用错误"
    },

    SP99: {
      label: "Other Spelling Error",
      labelZh: "其他拼写错误"
    }
  };

  // ========================================
  // 3. NORMALIZATION
  // ========================================

  function normalizeWord(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  }

  // ========================================
  // 4. EDIT DISTANCE
  // ========================================

  function editDistance(a, b) {
    const x = normalizeWord(a);
    const y = normalizeWord(b);

    const matrix = Array.from(
      { length: x.length + 1 },
      () => Array(y.length + 1).fill(0)
    );

    for (let i = 0; i <= x.length; i++) {
      matrix[i][0] = i;
    }

    for (let j = 0; j <= y.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= x.length; i++) {
      for (let j = 1; j <= y.length; j++) {
        const cost =
          x[i - 1] === y[j - 1] ? 0 : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[x.length][y.length];
  }

  // ========================================
  // 5. SINGLE-EDIT DETECTION
  // ========================================

  function isOneInsertion(shorter, longer) {
    if (longer.length !== shorter.length + 1) {
      return false;
    }

    let i = 0;
    let j = 0;
    let skipped = false;

    while (i < shorter.length && j < longer.length) {
      if (shorter[i] === longer[j]) {
        i++;
        j++;
      } else if (!skipped) {
        skipped = true;
        j++;
      } else {
        return false;
      }
    }

    return true;
  }

  function isAdjacentSwap(a, b) {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length - 1; i++) {
      if (
        a[i] !== b[i] &&
        a[i] === b[i + 1] &&
        a[i + 1] === b[i]
      ) {
        const swapped =
          a.slice(0, i) +
          a[i + 1] +
          a[i] +
          a.slice(i + 2);

        if (swapped === b) {
          return true;
        }
      }
    }

    return false;
  }

  // ========================================
  // 6. WORD ANALYSIS
  // ========================================

  function analyzeWord(input, target) {
    const actual = normalizeWord(input);
    const expected = normalizeWord(target);

    let code = "SP99";

    if (actual === expected) {
      code = "SP00";
    } else if (isOneInsertion(actual, expected)) {
      code = "SP01";
    } else if (isOneInsertion(expected, actual)) {
      code = "SP02";
    } else if (isAdjacentSwap(actual, expected)) {
      code = "SP04";
    } else if (
      actual.length === expected.length &&
      editDistance(actual, expected) === 1
    ) {
      code = "SP03";
    }

    return {
      input: actual,
      target: expected,
      correct: code === "SP00",
      errorCode: code,
      errorLabel: errorCategories[code].label,
      errorLabelZh: errorCategories[code].labelZh,
      editDistance: editDistance(actual, expected)
    };
  }

  // ========================================
  // 7. SENTENCE APPLICATION
  // ========================================

  function analyzeSentenceBlank(input, target) {
    const wordResult = analyzeWord(input, target);

    return {
      ...wordResult,
      taskType: "sentence_blank",
      correct: wordResult.correct,
      errorCode: wordResult.correct
        ? "SP00"
        : "SP05",
      spellingErrorCode: wordResult.errorCode,
      errorLabel: wordResult.correct
        ? "Correct"
        : "Sentence Application",
      errorLabelZh: wordResult.correct
        ? "正确"
        : "句子应用错误"
    };
  }

  // ========================================
  // 8. KNOWLEDGE LOOKUP
  // ========================================

  function getUnit(unitId) {
    const unit = units.find(
      item => item.id === unitId
    );

    return unit
      ? JSON.parse(JSON.stringify(unit))
      : null;
  }

  function getWord(wordId) {
    for (const unit of units) {
      const found = unit.words.find(
        item => item.id === wordId
      );

      if (found) {
        return JSON.parse(
          JSON.stringify(found)
        );
      }
    }

    return null;
  }

  function getAllUnits() {
    return JSON.parse(
      JSON.stringify(units)
    );
  }

  // ========================================
  // 9. PUBLIC API
  // ========================================

  window.AuraSpellingKnowledge =
    Object.freeze({
      version: "1.0",
      getAllUnits,
      getUnit,
      getWord,
      analyzeWord,
      analyzeSentenceBlank,
      editDistance,
      errorCategories:
        Object.freeze(errorCategories)
    });

  console.info(
    "[AURA Spelling] Knowledge Model Ready"
  );

})();
