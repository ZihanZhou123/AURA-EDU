
// ==========================================
// AURA EDU V2.2
// WRITING TUTOR MODULE
// ==========================================

"use strict";

// ------------------------------------------
// 1. WRITING HINTS
// ------------------------------------------

let writingHintIndex = 0;

const writingHints = [
  "Hint 1 — Idea: Write your name, age or school detail, and one interest.",

  "Hint 2 — Sentence Starters: My name is... / I am... / I like...",

  "Hint 3 — Example: My name is Amy. I am twelve years old. I like drawing."
];


// ------------------------------------------
// 2. WRITING RULES
// ------------------------------------------

// These rules detect selected patterns only.
// They are not a complete grammar checker.

const writingRules = [
  {
    id: "missing_is",
    pattern: /\bmy name\s+(?!is\b)[a-z]+\b/i,
    feedback:
      'Check whether "My name" needs the linking verb "is".',
    suggestion:
      "Example: My name is Amy."
  },

  {
    id: "missing_am",
    pattern: /\bi\s+\d{1,2}\s+years?\s+old\b/i,
    feedback:
      'Check the linking verb after "I" when giving your age.',
    suggestion:
      "Example: I am twelve years old."
  },

  {
    id: "i_likes",
    pattern: /\bi\s+likes\b/i,
    feedback:
      'Check the verb form after the subject "I".',
    suggestion:
      "Example: I like drawing."
  },

  {
    id: "like_verb",
    pattern: /\bi\s+like\s+(play|draw|swim|read|dance|sing)\b/i,
    feedback:
      'After "I like", consider an -ing form for an activity.',
    suggestion:
      "Example: I like reading."
  }
];


// ------------------------------------------
// 3. GET WRITING ELEMENTS
// ------------------------------------------

function getWritingElement(id) {
  return document.getElementById(id);
}


// ------------------------------------------
// 4. SHOW FEEDBACK
// ------------------------------------------

function showWritingFeedback(message, status = "") {
  const feedback =
    getWritingElement("writing-feedback");

  if (!feedback) return;

  feedback.className =
    status ? `feedback ${status}` : "feedback";

  feedback.textContent = message;

  feedback.style.whiteSpace = "pre-line";
}


// ------------------------------------------
// 5. GIVE A HINT
// ------------------------------------------

function giveWritingHint() {
  const index = Math.min(
    writingHintIndex,
    writingHints.length - 1
  );

  showWritingFeedback(
    writingHints[index]
  );

  writingHintIndex = Math.min(
    writingHintIndex + 1,
    writingHints.length
  );

  data.hints += 1;

  logEvent("writing_hint", {
    level: index + 1
  });

  persist();
}


// ------------------------------------------
// 6. DETECT POSSIBLE ERRORS
// ------------------------------------------

function detectWritingIssues(text) {
  return writingRules.filter(rule =>
    rule.pattern.test(text)
  );
}


// ------------------------------------------
// 7. CHECK INTRODUCTION CONTENT
// ------------------------------------------

function checkIntroductionContent(text) {
  const hasIntroduction =
    /\b(my name is|i am|i'm)\b/i.test(text);

  const hasInterest =
    /\b(i like|i love|i enjoy|my hobby is)\b/i.test(text);

  return {
    hasIntroduction,
    hasInterest
  };
}


// ------------------------------------------
// 8. CHECK STUDENT WRITING
// ------------------------------------------

function checkWriting() {
  const input =
    getWritingElement("writing-text");

  if (!input) return;

  const text = input.value.trim();

  // Require a minimum amount of text.

  if (text.length < 12) {
    showWritingFeedback(
      "Please write at least one meaningful sentence before checking.",
      "warn"
    );
    return;
  }

  // Record actual submission activity.

  data.writing += 1;

  const previousText =
    data.lastWriting || "";

  const revised =
    previousText.length > 0 &&
    previousText !== text;

  if (revised) {
    data.revisions += 1;
  }

  data.lastWriting = text;

  // Check selected grammar patterns.

  const issues =
    detectWritingIssues(text);

  const content =
    checkIntroductionContent(text);

  // Record writing evidence.

  logEvent("writing_submission", {
    revision: revised,
    flaggedIssues: issues.length,
    hasIntroduction: content.hasIntroduction,
    hasInterest: content.hasInterest
  });

  // ----------------------------------------
  // A. POSSIBLE ERRORS FOUND
  // ----------------------------------------

  if (issues.length > 0) {
    const feedbackLines = issues.map(
      (issue, index) => {
        return (
          `${index + 1}. ${issue.feedback}\n` +
          `   ${issue.suggestion}`
        );
      }
    );

    showWritingFeedback(
      "Possible issues to review:\n\n" +
      feedbackLines.join("\n\n") +
      "\n\nRevise your writing and check again.",
      "warn"
    );

    persist();
    return;
  }

  // ----------------------------------------
  // B. INTRODUCTION AND INTEREST FOUND
  // ----------------------------------------

  if (
    content.hasIntroduction &&
    content.hasInterest
  ) {
    let message =
      "✓ Your draft includes an introduction " +
      "and an interest.\n\n" +
      "No errors matched this limited rule set. " +
      "This does not guarantee grammatical correctness.";

    if (revised) {
      message +=
        "\n\nRevision recorded. " +
        "Your new version has been saved locally.";
    }

    showWritingFeedback(
      message,
      "good"
    );

    if (typeof chime === "function") {
      chime(revised ? "revision" : "correct");
    }

    persist();
    return;
  }

  // ----------------------------------------
  // C. CONTENT NEEDS DEVELOPMENT
  // ----------------------------------------

  const suggestions = [];

  if (!content.hasIntroduction) {
    suggestions.push(
      "Include an introduction such as: My name is..."
    );
  }

  if (!content.hasInterest) {
    suggestions.push(
      "Include an interest such as: I like drawing."
    );
  }

  showWritingFeedback(
    "Your writing is a good starting point.\n\n" +
    "Try adding:\n" +
    suggestions.map(
      (item, index) => `${index + 1}. ${item}`
    ).join("\n") +
    "\n\nThen check your writing again."
  );

  persist();
}


// ------------------------------------------
// 9. CONNECT HINT BUTTON
// ------------------------------------------

function initializeWritingTutor() {
  const hintButton =
    getWritingElement("writing-hint");

  const checkButton =
    getWritingElement("check-writing");

  if (hintButton) {
    hintButton.onclick = giveWritingHint;
  }

  if (checkButton) {
    checkButton.onclick = checkWriting;
  }
}


// ------------------------------------------
// 10. INITIALIZE WRITING TUTOR
// ------------------------------------------

initializeWritingTutor();

// ==========================================
// END OF WRITING TUTOR MODULE
// ==========================================
