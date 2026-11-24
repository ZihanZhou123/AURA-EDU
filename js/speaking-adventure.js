
/* ============================================
   AURA EDU V2.2
   STAGE 22.4.1

   MY CLASSROOM SPEAKING ADVENTURE

   Safe standalone preview:
   - Scripted conversation
   - Limited grammar checks
   - Optional graduated hints
   - Browser voice fallback
   - No localStorage modifications
   - No G1/G2/G3 modifications
============================================ */

(function () {
  "use strict";

  const $ = id => document.getElementById(id);

  const mission = [
    {
      question:
        "Hi! I'm Mia. What's your name?",

      goal:
        "Introduce yourself using My name is... or I am...",

      hints: [
        "Think about how to introduce your name.",
        "You can begin with: My name is...",
        "Try: My name is [your name]."
      ],

      check(answer) {
        return (
          /\bmy name is\s+[\p{L}]+/iu.test(answer) ||
          /\bi am\s+[\p{L}]+/iu.test(answer) ||
          /\bi'm\s+[\p{L}]+/iu.test(answer)
        );
      },

      followUp:
        "Nice to meet you! Let's learn more about each other."
    },

    {
      question:
        "I'm eleven years old. How old are you?",

      goal:
        "Use I am... to describe your age.",

      hints: [
        "You can tell Mia your age.",
        "Remember: I goes with am.",
        "Sentence starter: I am ... years old."
      ],

      check(answer) {
        return (
          /\b(i am|i'm)\s+(?:\d{1,2}|ten|eleven|twelve|thirteen)\b/i
            .test(answer)
        );
      },

      followUp:
        "Thank you for telling me! I like making new friends."
    },

    {
      question:
        "Are you a new student in our classroom?",

      goal:
        "Answer a yes/no question using I am or I am not.",

      hints: [
        "You can answer yes or no.",
        "Try using: Yes, I am. or No, I am not.",
        "Sentence starters: Yes, I am... / No, I'm not..."
      ],

      check(answer) {
        return (
          /\b(yes|no)\b/i.test(answer) &&
          /\b(i am|i'm|i am not|i'm not)\b/i.test(answer)
        );
      },

      followUp:
        "That's great! You're welcome in our classroom."
    },

    {
      question:
        "Can you tell me one thing about yourself?",

      goal:
        "Build an independent sentence using I am...",

      hints: [
        "Think about your personality or how you feel.",
        "You could describe yourself using an adjective.",
        "Sentence starter: I am..."
      ],

      check(answer) {
        return (
          /\b(i am|i'm)\s+[\p{L}]+/iu.test(answer)
        );
      },

      followUp:
        "Wonderful! Thank you for talking with me today!"
    }
  ];

  const state = {
    step: 0,
    completed: 0,
    supportedTurns: 0,
    helpLevel: 0,
    helpUsed: false,
    attempts: 0,
    finished: false,
    lastSpokenText: "",
    speech: null
  };

  // ----------------------------------------
  // Display
  // ----------------------------------------

  function setFeedback(message) {
    $("feedback").textContent = message;
  }

  function setTeacherMessage(message) {
    $("teacher-message").hidden = false;
    $("teacher-message").textContent = message;
  }

  function hideTeacher() {
    $("teacher-message").hidden = true;
    $("teacher-message").textContent = "";
  }

  function updateProgress() {
    const percent =
      (state.completed / mission.length) * 100;

    $("progress-fill").style.width =
      percent + "%";

    $("progress-summary").textContent =
      "Completed turns: " +
      state.completed +
      " / " +
      mission.length;

    $("support-summary").textContent =
      "Supported turns: " +
      state.supportedTurns;

    $("mission-step").textContent =
      state.finished
        ? "Mission Complete!"
        : "Step " +
          (state.step + 1) +
          " of " +
          mission.length;
  }

  function updateQuestion() {
    if (state.finished) return;

    const current = mission[state.step];

    $("mia-dialogue").textContent =
      current.question;

    $("speech-bubble").textContent =
      current.question;

    $("learning-goal").textContent =
      current.goal;

    state.lastSpokenText = current.question;

    updateProgress();
  }

  // ----------------------------------------
  // Voice
  // ----------------------------------------

  function stopSpeech() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    $("mia-character").classList.remove(
      "talking"
    );

    state.speech = null;
  }

  function speak(text, slow = false) {
    state.lastSpokenText = text;

    if (!("speechSynthesis" in window)) {
      setFeedback(
        "Speech playback is not supported " +
        "by this browser."
      );
      return;
    }

    stopSpeech();

    const utterance =
      new SpeechSynthesisUtterance(text);

    utterance.lang = "en-US";
    utterance.rate = slow ? 0.7 : 0.92;
    utterance.pitch = 1.08;

    state.speech = utterance;

    utterance.onstart = () => {
      if (state.speech === utterance) {
        $("mia-character").classList.add(
          "talking"
        );
      }
    };

    const finish = () => {
      if (state.speech === utterance) {
        $("mia-character").classList.remove(
          "talking"
        );
        state.speech = null;
      }
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    window.speechSynthesis.speak(utterance);
  }

  // ----------------------------------------
  // Limited grammar feedback
  // ----------------------------------------

  function detectDifficulty(answer) {
    const text = answer.trim();

    if (/\bi\s+is\b/i.test(text)) {
      return (
        'Check the verb after "I". ' +
        'Should it be am or is?'
      );
    }

    if (/\bmy name\s+(?!is\b)[a-z]+\b/i.test(text)) {
      return (
        'Look at "My name". ' +
        'Do you need the word "is"?'
      );
    }

    if (/\bi\s+are\b/i.test(text)) {
      return (
        'Remember that "I" usually goes ' +
        'with "am", not "are".'
      );
    }

    return null;
  }

  // ----------------------------------------
  // Teacher hints
  // ----------------------------------------

  function offerHelp() {
    if (state.finished) return;

    const current = mission[state.step];

    const index = Math.min(
      state.helpLevel,
      current.hints.length - 1
    );

    const hint = current.hints[index];

    state.helpLevel = Math.min(
      state.helpLevel + 1,
      current.hints.length
    );

    state.helpUsed = true;

    setTeacherMessage(
      "🦉 Ollie says:\n" + hint
    );

    setFeedback(
      "Try again using the hint. " +
      "You can ask for another hint."
    );
  }

  // ----------------------------------------
  // Conversation
  // ----------------------------------------

  function sendAnswer() {
    if (state.finished) return;

    const answer =
      $("student-answer").value.trim();

    if (!answer) {
      setFeedback(
        "Please enter an English answer first."
      );
      return;
    }

    state.attempts += 1;

    const difficulty =
      detectDifficulty(answer);

    if (difficulty) {
      setTeacherMessage(
        "🦉 Ollie noticed a possible " +
        "grammar issue:\n" +
        difficulty +
        "\nTry revising your sentence."
      );

      setFeedback(
        "Self-revision: check your sentence " +
        "and try again."
      );

      return;
    }

    const current = mission[state.step];

    if (!current.check(answer)) {
      setFeedback(
        "I couldn't match that answer " +
        "to this task yet. " +
        "Try a complete sentence or ask Ollie."
      );

      if (state.attempts >= 2) {
        setTeacherMessage(
          "🦉 Ollie says:\n" +
          "Would you like a hint? " +
          "Click Need Help if you do."
        );
      }

      return;
    }

    if (state.helpUsed) {
      state.supportedTurns += 1;
    }

    state.completed += 1;

    const response = current.followUp;

    $("mia-dialogue").textContent =
      response;

    $("speech-bubble").textContent =
      response;

    setFeedback(
      state.helpUsed
        ? "Great effort! You completed " +
          "this turn with a hint."
        : "Nice work! You completed " +
          "this turn without a teacher hint."
    );

    hideTeacher();

    $("student-answer").value = "";

    state.step += 1;
    state.helpLevel = 0;
    state.helpUsed = false;
    state.attempts = 0;

    updateProgress();

    if (state.step >= mission.length) {
      finishMission(response);
    } else {
      const nextQuestion =
        mission[state.step].question;

      updateQuestion();

      // The next question remains visible.
      // Playback is initiated by a user action.
      speak(nextQuestion);
    }
  }

  function finishMission(lastResponse) {
    state.finished = true;

    $("mia-dialogue").textContent =
      lastResponse +
      "\n\nYou completed My Classroom!";

    $("speech-bubble").textContent =
      "Mission Complete! 🌟";

    $("learning-goal").textContent =
      "Review your grammar and practise " +
      "independent speaking next.";

    $("send-answer").disabled = true;
    $("ask-help").disabled = true;
    $("student-answer").disabled = true;

    updateProgress();

    setFeedback(
      "Mission complete! " +
      state.completed +
      " turns completed; " +
      state.supportedTurns +
      " used teacher hints. " +
      "This is a local practice summary, " +
      "not a speaking proficiency score."
    );

    speak(lastResponse);
  }

  // ----------------------------------------
  // Reset
  // ----------------------------------------

  function restartMission() {
    stopSpeech();

    state.step = 0;
    state.completed = 0;
    state.supportedTurns = 0;
    state.helpLevel = 0;
    state.helpUsed = false;
    state.attempts = 0;
    state.finished = false;
    state.lastSpokenText = "";
    state.speech = null;

    $("student-answer").value = "";
    $("student-answer").disabled = false;
    $("send-answer").disabled = false;
    $("ask-help").disabled = false;

    hideTeacher();
    updateQuestion();

    setFeedback(
      "Welcome! Read Mia's question, " +
      "or click Listen Again to hear it."
    );
  }

  // ----------------------------------------
  // Events
  // ----------------------------------------

  function initialize() {
    $("send-answer").addEventListener(
      "click",
      sendAnswer
    );

    $("ask-help").addEventListener(
      "click",
      offerHelp
    );

    $("replay-voice").addEventListener(
      "click",
      () => {
        speak(state.lastSpokenText);
      }
    );

    $("slow-voice").addEventListener(
      "click",
      () => {
        speak(state.lastSpokenText, true);
      }
    );

    $("restart-mission").addEventListener(
      "click",
      restartMission
    );

    restartMission();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  } else {
    initialize();
  }

})();
