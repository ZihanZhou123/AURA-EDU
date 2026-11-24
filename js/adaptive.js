
// ==========================================
// AURA EDU V2.2
// ADAPTIVE LEARNING MODULE
// ==========================================

"use strict";

// ------------------------------------------
// 1. QUESTION BANK
// Original demonstration learning activities
// ------------------------------------------

const questions = [
  {
    skill: "greetings",
    level: "FOUNDATION",
    title: "Choose the greeting.",
    context: "You meet a classmate in the morning.",
    options: [
      "Good morning!",
      "Good night!",
      "Goodbye!"
    ],
    answer: 0,
    hints: [
      "Think about the time of day.",
      "You are meeting someone, not leaving.",
      "The greeting starts with Good m..."
    ],
    explain:
      "Good morning is a greeting used in the morning."
  },

  {
    skill: "be_verb",
    level: "FOUNDATION",
    title: "Complete the introduction.",
    context: "My name ___ Amy.",
    options: [
      "am",
      "is",
      "are"
    ],
    answer: 1,
    hints: [
      "Look at the subject: My name.",
      "My name is singular.",
      "We say: My name is Amy."
    ],
    explain:
      "Use is after My name.",

    review: {
      title: "Review: Verb to Be",
      context: "Her name ___ Lucy.",
      options: [
        "am",
        "is",
        "are"
      ],
      answer: 1,
      explain:
        "Her name is Lucy. The singular subject takes is."
    }
  },

  {
    skill: "hobbies",
    level: "DEVELOPING",
    title: "Talk about a hobby.",
    context: "Choose a natural sentence.",
    options: [
      "I likes drawing.",
      "I like drawing.",
      "I liking drawing."
    ],
    answer: 1,
    hints: [
      "Look at the subject I.",
      "Use like, not likes, with I.",
      "Use I like + -ing."
    ],
    explain:
      "I like drawing is a natural sentence.",

    review: {
      title: "Review: Hobbies",
      context: "Choose the correct sentence.",
      options: [
        "I like swimming.",
        "I likes swimming.",
        "I liking swimming."
      ],
      answer: 0,
      explain:
        "Use I like followed by an -ing activity."
    }
  },

  {
    skill: "interaction",
    level: "DEVELOPING",
    title: "Answer a classmate.",
    context: "What is your favourite colour?",
    options: [
      "I am twelve.",
      "My favourite colour is blue.",
      "I live near school."
    ],
    answer: 1,
    hints: [
      "Think about the information requested.",
      "The question asks about a colour.",
      "Try: My favourite colour is..."
    ],
    explain:
      "A relevant answer names a colour.",

    review: {
      title: "Review: Answering Questions",
      context: "What is your favourite food?",
      options: [
        "I am happy.",
        "My favourite food is pizza.",
        "I am eleven."
      ],
      answer: 1,
      explain:
        "Answer the question by naming a food."
    }
  },

  {
    skill: "transfer",
    level: "TRANSFER",
    title: "Continue the conversation.",
    context:
      'A classmate says: "I like football. What about you?"',
    options: [
      "I like basketball.",
      "I am fine, thank you.",
      "Goodbye!"
    ],
    answer: 0,
    hints: [
      "The classmate is discussing interests.",
      "Reply with something you like.",
      "Try: I like + activity."
    ],
    explain:
      "I like basketball continues the conversation.",

    review: {
      title: "Review: Conversation",
      context:
        'A friend says: "I enjoy reading. What about you?"',
      options: [
        "See you tomorrow.",
        "I enjoy drawing.",
        "My name is Ben."
      ],
      answer: 1,
      explain:
        "Respond with an activity you enjoy."
    }
  }
];


// ------------------------------------------
// 2. LEARNING STATE
// ------------------------------------------

let quizIndex = 0;
let quizHint = 0;
let quizAnswered = false;
let quizCount = 0;

let quizMode = "normal";
let reviewSkill = null;
let reviewHints = 0;


// ------------------------------------------
// 3. HELPER FUNCTIONS
// ------------------------------------------

function quizElement(id) {
  return document.getElementById(id);
}

function setQuizText(id, text) {
  const element = quizElement(id);

  if (element) {
    element.textContent = text;
  }
}

function getCurrentQuestion() {
  return questions[quizIndex];
}

function findQuestionBySkill(skill) {
  return questions.find(
    question => question.skill === skill
  );
}


// ------------------------------------------
// 4. RESET LEARNING SESSION
// ------------------------------------------

function resetQuiz() {
  quizIndex = 0;
  quizHint = 0;
  quizAnswered = false;
  quizCount = 0;

  quizMode = "normal";
  reviewSkill = null;
  reviewHints = 0;

  renderQuiz();
}


// ------------------------------------------
// 5. DISPLAY NORMAL QUESTION
// ------------------------------------------

function renderQuiz() {

  quizMode = "normal";
  quizHint = 0;
  quizAnswered = false;

  const question = getCurrentQuestion();

  if (!question) {
    return;
  }

  setQuizText(
    "lesson-badge",
    question.level + " · " +
    question.skill.toUpperCase()
  );

  setQuizText(
    "question-title",
    question.title
  );

  setQuizText(
    "question-context",
    question.context
  );

  const optionsBox =
    quizElement("question-options");

  if (!optionsBox) {
    return;
  }

  optionsBox.innerHTML =
    question.options.map((option, index) => {

      return `
        <button
          type="button"
          class="option"
          data-answer="${index}"
        >
          ${escapeHTML(option)}
        </button>
      `;

    }).join("");

  optionsBox
    .querySelectorAll("[data-answer]")
    .forEach(button => {

      button.onclick = () => {

        answerQuiz(
          Number(button.dataset.answer)
        );

      };

    });

  const feedback =
    quizElement("question-feedback");

  if (feedback) {
    feedback.className = "feedback";
    feedback.textContent =
      "Try this task independently.";
  }

  setQuizText(
    "quiz-hint-box",
    "Request a hint if you need support."
  );

  quizProgress();
  renderDiagnosis();
}


// ------------------------------------------
// 6. PROGRESS BAR
// ------------------------------------------

function quizProgress() {

  const total = questions.length;

  setQuizText(
    "quiz-progress-label",
    `${quizCount} / ${total}`
  );

  const progress =
    quizElement("quiz-progress");

  if (progress) {

    progress.style.width =
      `${Math.min(100, 100 * quizCount / total)}%`;

  }
}


// ------------------------------------------
// 7. RECORD SKILL EVIDENCE
// ------------------------------------------

function recordSkill(skill, correct, hints) {

  if (!data.skills) {
    data.skills = {};
  }

  const record =
    data.skills[skill] || {
      attempts: 0,
      correct: 0,
      independent: 0,
      hintUsed: 0,
      reviewNeeded: false
    };

  record.attempts += 1;

  if (correct) {
    record.correct += 1;
  }

  if (correct && hints === 0) {
    record.independent += 1;
  }

  record.hintUsed += hints;

  record.reviewNeeded = !correct;

  data.skills[skill] = record;

  logEvent("quiz", {
    skill: skill,
    correct: correct,
    hints: hints
  });
}


// ------------------------------------------
// 8. ANSWER NORMAL QUESTION
// ------------------------------------------

function answerQuiz(selectedIndex) {

  if (quizAnswered) {
    return;
  }

  const question = getCurrentQuestion();

  if (!question) {
    return;
  }

  quizAnswered = true;

  const correct =
    selectedIndex === question.answer;

  data.attempts += 1;

  if (correct) {

    data.correct += 1;
    chime("correct");

  }

  recordSkill(
    question.skill,
    correct,
    quizHint
  );

  quizCount += 1;

  const buttons =
    quizElement("question-options")
      .querySelectorAll("button");

  buttons.forEach((button, index) => {

    button.disabled = true;

    if (index === question.answer) {
      button.classList.add("right");
    }

    if (
      index === selectedIndex &&
      !correct
    ) {
      button.classList.add("wrong");
    }

  });

  const feedback =
    quizElement("question-feedback");

  if (feedback) {

    feedback.className =
      "feedback " +
      (correct ? "good" : "warn");

    let message = correct
      ? "✓ Correct. "
      : "Review this skill. ";

    message += question.explain;

    if (correct && quizHint === 0) {
      message +=
        " Independent first attempt.";
    }

    feedback.textContent = message;
  }

  quizProgress();
  renderDiagnosis();
  persist();
}


// ------------------------------------------
// 9. HINT SYSTEM
// ------------------------------------------

function showQuizHint() {

  if (quizMode === "review") {

    if (quizAnswered) {
      setQuizText(
        "quiz-hint-box",
        "Review already completed."
      );
      return;
    }

    const question =
      findQuestionBySkill(reviewSkill);

    if (!question) {
      return;
    }

    const hints = question.hints;

    if (reviewHints < hints.length) {

      setQuizText(
        "quiz-hint-box",
        `Review Hint ${reviewHints + 1}: ` +
        hints[reviewHints]
      );

      reviewHints += 1;
      data.hints += 1;

      persist();

    }

    return;
  }

  if (quizAnswered) {

    setQuizText(
      "quiz-hint-box",
      "Move to the next task."
    );

    return;
  }

  const question = getCurrentQuestion();

  const hints = question.hints;

  if (quizHint < hints.length) {

    setQuizText(
      "quiz-hint-box",
      `Hint ${quizHint + 1}: ` +
      hints[quizHint]
    );

    quizHint += 1;
    data.hints += 1;

    persist();

  } else {

    setQuizText(
      "quiz-hint-box",
      "All available hints have been shown."
    );

  }
}


// ------------------------------------------
// 10. NEXT TASK
// ------------------------------------------

function nextQuizTask() {

  if (quizMode === "review") {

    quizMode = "normal";
    reviewSkill = null;

  }

  if (quizIndex >= questions.length - 1) {

    quizIndex = 0;
    quizCount = 0;

    chime("complete");

  } else {

    quizIndex += 1;

  }

  renderQuiz();
}


// ------------------------------------------
// 11. REVIEW A SKILL
// ------------------------------------------

function startSkillReview() {

  const entries =
    Object.entries(data.skills || {});

  const pending =
    entries.find(
      ([skill, record]) =>
        record.reviewNeeded &&
        findQuestionBySkill(skill)
    );

  if (!pending) {

    setQuizText(
      "skill-diagnosis",
      "No unresolved review flag. " +
      "You can continue practising."
    );

    return;
  }

  reviewSkill = pending[0];
  reviewHints = 0;

  quizMode = "review";
  quizAnswered = false;

  renderReview();
}


// ------------------------------------------
// 12. DISPLAY REVIEW QUESTION
// ------------------------------------------

function renderReview() {

  const question =
    findQuestionBySkill(reviewSkill);

  if (!question) {
    return;
  }

  const review = question.review || {
    title: question.title,
    context: question.context,
    options: question.options,
    answer: question.answer,
    explain: question.explain
  };

  setQuizText(
    "lesson-badge",
    "TARGETED REVIEW · " +
    reviewSkill.toUpperCase()
  );

  setQuizText(
    "question-title",
    review.title
  );

  setQuizText(
    "question-context",
    review.context
  );

  const optionsBox =
    quizElement("question-options");

  if (!optionsBox) {
    return;
  }

  optionsBox.innerHTML =
    review.options.map((option, index) => {

      return `
        <button
          type="button"
          class="option"
          data-review-answer="${index}"
        >
          ${escapeHTML(option)}
        </button>
      `;

    }).join("");

  optionsBox
    .querySelectorAll("[data-review-answer]")
    .forEach(button => {

      button.onclick = () => {

        answerReview(
          Number(button.dataset.reviewAnswer)
        );

      };

    });

  const feedback =
    quizElement("question-feedback");

  if (feedback) {

    feedback.className = "feedback";

    feedback.textContent =
      "Apply the same skill to a new example.";

  }

  setQuizText(
    "quiz-hint-box",
    "Try the review independently first."
  );

  renderDiagnosis();
}


// ------------------------------------------
// 13. ANSWER REVIEW QUESTION
// ------------------------------------------

function answerReview(selectedIndex) {

  if (quizAnswered || quizMode !== "review") {
    return;
  }

  const question =
    findQuestionBySkill(reviewSkill);

  if (!question) {
    return;
  }

  const review =
    question.review || question;

  const correct =
    selectedIndex === review.answer;

  quizAnswered = true;

  data.attempts += 1;

  if (correct) {

    data.correct += 1;
    chime("correct");

  }

  const skillRecord =
    data.skills[reviewSkill];

  if (skillRecord) {

    skillRecord.attempts += 1;

    if (correct) {
      skillRecord.correct += 1;
    }

    if (correct && reviewHints === 0) {
      skillRecord.independent += 1;
    }

    skillRecord.hintUsed += reviewHints;

    skillRecord.reviewNeeded = !correct;
  }

  logEvent("skill_review", {
    skill: reviewSkill,
    correct: correct,
    hints: reviewHints
  });

  const buttons =
    quizElement("question-options")
      .querySelectorAll("button");

  buttons.forEach((button, index) => {

    button.disabled = true;

    if (index === review.answer) {
      button.classList.add("right");
    }

    if (
      index === selectedIndex &&
      !correct
    ) {
      button.classList.add("wrong");
    }

  });

  const feedback =
    quizElement("question-feedback");

  if (feedback) {

    feedback.className =
      "feedback " +
      (correct ? "good" : "warn");

    feedback.textContent = correct
      ? "✓ Review successful! " + review.explain
      : "Review not yet successful. " +
        review.explain +
        " Select Review a Skill to try again.";

  }

  if (correct) {

    setQuizText(
      "quiz-hint-box",
      "Review completed. Continue to the next task."
    );

  }

  renderDiagnosis();
  persist();
}


// ------------------------------------------
// 14. LEARNING DIAGNOSIS
// ------------------------------------------

function renderDiagnosis() {

  const entries =
    Object.entries(data.skills || {});

  const diagnosis =
    quizElement("skill-diagnosis");

  if (!diagnosis) {
    return;
  }

  if (entries.length === 0) {

    diagnosis.textContent =
      "No task evidence yet.";

    return;
  }

  const summary = entries.map(
    ([skill, record]) => {

      const status = record.reviewNeeded
        ? "review suggested"
        : "last attempt successful";

      return (
        `${skill}: ` +
        `${record.correct}/${record.attempts} correct; ` +
        `${record.independent} independent; ` +
        status
      );

    }
  );

  diagnosis.textContent =
    summary.join("\n");

  diagnosis.style.whiteSpace = "pre-line";
}


// ------------------------------------------
// 15. CONNECT BUTTONS
// ------------------------------------------

function initializeAdaptiveLearning() {

  const hintButton =
    quizElement("quiz-hint");

  const nextButton =
    quizElement("quiz-next");

  const reviewButton =
    quizElement("retry-needs");

  if (hintButton) {

    hintButton.onclick = showQuizHint;

  }

  if (nextButton) {

    nextButton.onclick = nextQuizTask;

  }

  if (reviewButton) {

    reviewButton.onclick = startSkillReview;

  }
}


// ------------------------------------------
// 16. INITIALIZE BUTTON HANDLERS
// ------------------------------------------

initializeAdaptiveLearning();
