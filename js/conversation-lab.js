
/* ==========================================
   AURA EDU V2.2
   STAGE 22.3.2

   ADAPTIVE CONVERSATION
   & GRAMMAR CONNECTION

   LOCAL RULE-BASED SIMULATION

   - No generative AI
   - No existing learner data changes
   - No localStorage writes
   - No changes to G1/G2/G3
========================================== */

"use strict";

(function () {

  const $ = id => document.getElementById(id);

  // ========================================
  // 1. CONVERSATION CURRICULUM
  // ========================================

  const steps = [
    {
      question: "What did you do last weekend?",

      grammar: "Simple Past Tense",

      objective:
        "Describe a completed activity in the past.",

      keywords: [
        "went", "played", "visited",
        "watched", "studied", "walked",
        "stayed", "did", "ate",
        "read", "swam", "bought",
        "saw", "made", "cooked",
        "travelled", "traveled",
        "slept", "cleaned",
        "go", "play", "visit",
        "watch", "study", "walk",
        "stay", "eat", "swim",
        "buy", "see", "make",
        "cook", "travel", "sleep",
        "clean"
      ],

      hints: [
        "Think about one activity you did last weekend.",
        "Try using a past-tense verb such as went, played, or visited.",
        "Sentence starter: Last weekend, I..."
      ]
    },

    {
      question: "Who did you spend time with?",

      grammar: "People and Sentence Construction",

      objective:
        "Identify the people involved in an activity.",

      keywords: [
        "friend", "friends", "mother",
        "father", "mum", "mom",
        "dad", "family", "parents",
        "brother", "sister",
        "grandmother", "grandfather",
        "cousin", "classmate",
        "teacher", "alone", "myself"
      ],

      hints: [
        "Think about the people who were with you.",
        "You can mention your family, friends, or classmates.",
        "Sentence starter: I spent time with..."
      ]
    },

    {
      question: "What was your favourite part?",

      grammar: "Expressing Preferences",

      objective:
        "Describe a preferred activity or experience.",

      keywords: [
        "fun", "happy", "enjoy",
        "enjoyed", "liked", "loved",
        "favourite", "favorite",
        "best", "interesting",
        "exciting", "playing",
        "walking", "watching",
        "swimming", "reading",
        "football", "basketball",
        "food", "game", "movie",
        "park", "trip", "shopping"
      ],

      hints: [
        "Think about the most enjoyable part of your weekend.",
        "You can describe an activity or explain how you felt.",
        "Sentence starter: My favourite part was..."
      ]
    },

    {
      question:
        "Would you like to do it again? Why?",

      grammar: "Giving Reasons",

      objective:
        "Express a preference and explain a reason.",

      keywords: [
        "yes", "no", "because",
        "would", "like", "want",
        "fun", "enjoy", "interesting",
        "happy", "exciting",
        "boring", "tired",
        "again", "prefer"
      ],

      hints: [
        "Decide whether you would like to repeat the activity.",
        "Think about one reason for your answer.",
        "Sentence starter: Yes, because... or No, because..."
      ]
    }
  ];

  // ========================================
  // 2. SESSION STATE
  // ========================================

  const state = {
    mode: "partner",
    step: 0,

    studentTurns: 0,
    helpRequests: 0,
    supportedTurns: 0,
    independentTurns: 0,

    currentHint: 0,
    difficultyCount: 0,

    helpUsedThisTurn: false,
    revisionRequired: false,

    offerPending: false,
    finished: false,

    lastReply: "",
    currentDifficulty: null,

    events: []
  };

  // ========================================
  // 3. UTILITIES
  // ========================================

  function normalize(text) {
    return String(text)
      .toLowerCase()
      .replace(/[.,!?;:]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeRegex(text) {
    return text.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
  }

  function containsWord(text, word) {
    const expression = new RegExp(
      "\\b" + escapeRegex(word) + "\\b",
      "i"
    );

    return expression.test(text);
  }

  function logSimulationEvent(type, details) {
    state.events.push({
      type: type,
      step: state.step + 1,
      details: details,
      time: new Date().toISOString(),
      source: "local_simulation"
    });
  }

  // ========================================
  // 4. CHAT DISPLAY
  // ========================================

  function addMessage(role, text) {

    const element = document.createElement("div");

    element.className = "message " + role;

    const heading = document.createElement("strong");

    const labels = {
      partner: "AI Partner · Simulated",
      teacher: "AI Teacher · Simulated",
      student: "Student",
      system: "System"
    };

    heading.textContent = labels[role] || role;

    const body = document.createElement("div");

    body.textContent = text;

    element.appendChild(heading);
    element.appendChild(body);

    $("chat").appendChild(element);

    $("chat").scrollTop =
      $("chat").scrollHeight;
  }

  function setStatus(message) {
    $("status").textContent = message;
  }

  function updateStats() {

    $("student-turns").textContent =
      state.studentTurns;

    $("help-count").textContent =
      state.helpRequests;

    $("supported-turns").textContent =
      state.supportedTurns;
  }

  function showGrammarFocus() {

    const step = steps[state.step];

    if (!step) return;

    addMessage(
      "system",
      "Grammar Focus: " + step.grammar +
      "\nLearning Goal: " + step.objective
    );
  }

  // ========================================
  // 5. MODE MANAGEMENT
  // ========================================

  function setMode(mode) {

    state.mode = mode;

    $("partner-mode").classList.toggle(
      "active",
      mode === "partner"
    );

    $("teacher-mode").classList.toggle(
      "active",
      mode === "teacher"
    );

    $("current-mode").textContent =
      mode === "partner"
        ? "PARTNER MODE"
        : "TEACHER MODE";

    setStatus(
      mode === "partner"
        ? "Partner mode: conversation practice."
        : "Teacher mode: guided support."
    );
  }

  // ========================================
  // 6. AUDIO
  // ========================================

  function speakText(text) {

    if (!("speechSynthesis" in window)) {
      setStatus(
        "Speech playback is unavailable."
      );
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(text);

    utterance.lang = "en-US";
    utterance.rate = 0.88;

    window.speechSynthesis.speak(utterance);
  }

  function partnerReply(text) {

    state.lastReply = text;

    addMessage("partner", text);

    speakText(text);
  }

  function teacherReply(text) {

    state.lastReply = text;

    addMessage("teacher", text);

    speakText(text);
  }

  // ========================================
  // 7. LIMITED GRAMMAR DETECTION
  // ========================================

  function detectGrammarDifficulty(raw) {

    const text = normalize(raw);

    // Only check past tense in Step 1.
    // These rules detect selected patterns,
    // not all possible grammar errors.

    if (state.step !== 0) {
      return null;
    }

    const patterns = [
      {
        regex:
          /\b(i|we)\s+go\b/i,

        code: "PAST_GO",

        feedback:
          "You are describing last weekend. " +
          "Check the past form of go.",

        support:
          "The past form of go is went. " +
          "Try making your own sentence."
      },

      {
        regex:
          /\b(i|we)\s+play\b/i,

        code: "PAST_PLAY",

        feedback:
          "The activity happened last weekend. " +
          "Check the tense of play.",

        support:
          "For a completed past activity, " +
          "play changes to played."
      },

      {
        regex:
          /\b(i|we)\s+watch\b/i,

        code: "PAST_WATCH",

        feedback:
          "Think about when the activity happened. " +
          "Does watch need a past form?",

        support:
          "The past form of watch is watched."
      },

      {
        regex:
          /\b(i|we)\s+visit\b/i,

        code: "PAST_VISIT",

        feedback:
          "You are talking about the past. " +
          "Check the verb visit.",

        support:
          "The past form of visit is visited."
      },

      {
        regex:
          /\b(i|we)\s+study\b/i,

        code: "PAST_STUDY",

        feedback:
          "Check the past-tense form of study.",

        support:
          "Study changes to studied in the past."
      }
    ];

    // Avoid flagging some auxiliary constructions.
    // This is not a complete grammar parser.

    if (
      /\b(did|didn't|did not)\s+(?:\w+\s+){0,3}(go|play|watch|visit|study)\b/i
        .test(text)
    ) {
      return null;
    }

    for (const rule of patterns) {

      if (rule.regex.test(text)) {

        return {
          code: rule.code,
          feedback: rule.feedback,
          support: rule.support
        };
      }
    }

    return null;
  }

  // ========================================
  // 8. LIMITED RELEVANCE CHECK
  // ========================================

  function isRelevant(raw) {

    const text = normalize(raw);

    const step = steps[state.step];

    if (!step) return false;

    return step.keywords.some(
      keyword => containsWord(text, keyword)
    );
  }

  // ========================================
  // 9. TEACHER SUPPORT OFFER
  // ========================================

  function hideOffer() {

    state.offerPending = false;

    $("support-box").hidden = true;
  }

  function showHelpOffer() {

    if (
      state.offerPending ||
      state.finished
    ) {
      return;
    }

    state.offerPending = true;

    $("support-message").textContent =
      "Would you like a little help " +
      "from AI Teacher?";

    $("support-box").hidden = false;

    setStatus(
      "Support is optional. " +
      "You may also try again."
    );
  }

  // ========================================
  // 10. ADAPTIVE TEACHER HINTS
  // ========================================

  function offerTeacherHint() {

    if (state.finished) return;

    hideOffer();

    const step = steps[state.step];

    if (!step) return;

    let hint = "";

    if (
      state.currentDifficulty &&
      state.currentHint === 0
    ) {

      hint = state.currentDifficulty.support;

    } else {

      const index = Math.min(
        state.currentHint,
        step.hints.length - 1
      );

      hint = step.hints[index];
    }

    state.currentHint = Math.min(
      state.currentHint + 1,
      step.hints.length
    );

    state.helpUsedThisTurn = true;

    logSimulationEvent(
      "teacher_support",
      {
        hintLevel: state.currentHint,
        difficulty:
          state.currentDifficulty
            ? state.currentDifficulty.code
            : "GENERAL_SUPPORT"
      }
    );

    setMode("teacher");

    teacherReply(
      "Let's work on this together. " + hint
    );

    setStatus(
      "Now try writing your own answer."
    );
  }

  function requestHelp() {

    if (state.finished) return;

    // Count actual requests for help,
    // not automatically generated offers.

    state.helpRequests += 1;

    logSimulationEvent(
      "help_request",
      { source: "student" }
    );

    updateStats();

    showHelpOffer();
  }

  // ========================================
  // 11. DIFFICULTY HANDLING
  // ========================================

  function handleGrammarDifficulty(
    difficulty
  ) {

    state.currentDifficulty = difficulty;

    state.revisionRequired = true;

    state.difficultyCount += 1;

    logSimulationEvent(
      "grammar_pattern_detected",
      {
        code: difficulty.code,
        detectionMethod: "regex"
      }
    );

    setMode("teacher");

    teacherReply(
      "Let's check your sentence. " +
      difficulty.feedback +
      "\nCan you try again?"
    );

    if (state.difficultyCount >= 2) {
      showHelpOffer();
    } else {
      setStatus(
        "Self-revision: try correcting your sentence."
      );
    }
  }

  function handleUnmatchedResponse() {

    state.difficultyCount += 1;

    logSimulationEvent(
      "unmatched_response",
      {
        reason:
          "No configured keyword matched"
      }
    );

    if (state.difficultyCount >= 2) {

      showHelpOffer();

    } else {

      setMode("partner");

      partnerReply(
        "Could you tell me a little more " +
        "about that?"
      );

      setStatus(
        "The local simulation could not " +
        "match your answer. " +
        "You can try again or request help."
      );
    }
  }

  // ========================================
  // 12. COMPLETE A TURN
  // ========================================

  function completeTurn() {

    const supported =
      state.helpUsedThisTurn;

    const revised =
      state.revisionRequired;

    if (supported) {
      state.supportedTurns += 1;
    }

    if (!supported && !revised) {
      state.independentTurns += 1;
    }

    logSimulationEvent(
      "turn_completed",
      {
        supported: supported,
        selfRevision: revised,
        assessment:
          "simulation_only"
      }
    );

    addMessage(
      "system",
      supported
        ? "Turn completed with teacher support."
        : revised
          ? "Turn completed after self-revision."
          : "Turn completed without teacher hints."
    );

    advanceConversation();
  }

  // ========================================
  // 13. NEXT CONVERSATION TURN
  // ========================================

  function advanceConversation() {

    state.step += 1;

    state.currentHint = 0;
    state.difficultyCount = 0;

    state.helpUsedThisTurn = false;
    state.revisionRequired = false;

    state.currentDifficulty = null;

    hideOffer();
    updateStats();

    setMode("partner");

    if (state.step >= steps.length) {

      state.finished = true;

      partnerReply(
        "Thank you for telling me " +
        "about your weekend! " +
        "You completed this simulated conversation."
      );

      addMessage(
        "system",
        "Session Summary" +
        "\nStudent responses: " +
        state.studentTurns +
        "\nTurns without teacher hints " +
        "or flagged revision: " +
        state.independentTurns +
        "\nSupported turns: " +
        state.supportedTurns +
        "\nHelp requests: " +
        state.helpRequests +
        "\nThese are simulation indicators, " +
        "not validated oral proficiency scores."
      );

      $("send-message").disabled = true;

      $("request-help").disabled = true;

      setStatus(
        "Simulation complete. " +
        "Restart to practise again."
      );

      return;
    }

    showGrammarFocus();

    partnerReply(
      steps[state.step].question
    );
  }

  // ========================================
  // 14. PROCESS STUDENT RESPONSE
  // ========================================

  function sendResponse() {

    if (state.finished) return;

    const input = $("student-input");

    const response = input.value.trim();

    if (!response) {

      setStatus(
        "Please enter your response."
      );

      return;
    }

    hideOffer();

    addMessage("student", response);

    input.value = "";

    state.studentTurns += 1;

    updateStats();

    logSimulationEvent(
      "student_response",
      {
        inputMode: "typed",
        text: response
      }
    );

    // Check selected grammar patterns first.

    const difficulty =
      detectGrammarDifficulty(response);

    if (difficulty) {

      handleGrammarDifficulty(difficulty);

      return;
    }

    // Next check limited topic relevance.

    if (isRelevant(response)) {

      completeTurn();

      return;
    }

    handleUnmatchedResponse();
  }

  // ========================================
  // 15. RESET SIMULATION
  // ========================================

  function restartConversation() {

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    state.mode = "partner";
    state.step = 0;

    state.studentTurns = 0;
    state.helpRequests = 0;
    state.supportedTurns = 0;
    state.independentTurns = 0;

    state.currentHint = 0;
    state.difficultyCount = 0;

    state.helpUsedThisTurn = false;
    state.revisionRequired = false;

    state.offerPending = false;
    state.finished = false;

    state.lastReply = "";
    state.currentDifficulty = null;

    state.events = [];

    $("chat").textContent = "";

    $("student-input").value = "";

    $("send-message").disabled = false;
    $("request-help").disabled = false;

    hideOffer();

    updateStats();

    setMode("partner");

    addMessage(
      "system",
      "Local adaptive conversation simulation." +
      "\nNo existing learner history is modified." +
      "\nResponses are checked using limited rules."
    );

    showGrammarFocus();

    partnerReply(
      steps[0].question
    );
  }

  // ========================================
  // 16. BUTTON CONNECTIONS
  // ========================================

  function initialize() {

    $("partner-mode").onclick = () => {

      hideOffer();

      setMode("partner");
    };

    $("teacher-mode").onclick = () => {

      hideOffer();

      setMode("teacher");

      offerTeacherHint();
    };

    $("send-message").onclick =
      sendResponse;

    $("student-input").addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter" &&
          !event.shiftKey
        ) {

          event.preventDefault();

          sendResponse();
        }
      }
    );

    $("request-help").onclick =
      requestHelp;

    $("accept-support").onclick = () => {

      offerTeacherHint();
    };

    $("decline-support").onclick = () => {

      hideOffer();

      setMode("partner");

      logSimulationEvent(
        "support_declined",
        {}
      );

      setStatus(
        "You can try again independently."
      );
    };

    $("listen-reply").onclick = () => {

      if (state.lastReply) {

        speakText(
          state.lastReply
        );
      }
    };

    $("restart-conversation").onclick =
      restartConversation;

    restartConversation();
  }

  document.addEventListener(
    "DOMContentLoaded",
    initialize
  );

})();
