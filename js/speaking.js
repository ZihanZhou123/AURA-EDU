
// ==========================================
// AURA EDU V2.2
// SPEAKING PARTNER
// ==========================================

"use strict";

// 1. ORIGINAL DEMONSTRATION SCENARIOS

const scenarios = {
  friends: {
    icon: "👋",
    title: "Meet a New Friend",
    turns: [
      {
        q: "Hello! I'm Alex. What's your name?",
        kind: "name",
        h: [
          "Tell me what people call you.",
          "Try: My name is... or I'm...",
          "Example: My name is Lily."
        ],
        next: v => `Nice to meet you, ${v || "my friend"}! How old are you?`
      },
      {
        q: "How old are you?",
        kind: "age",
        h: [
          "Tell me your age.",
          "Try: I am ... years old.",
          "Example: I am twelve years old."
        ],
        next: () => "Thanks! What do you like doing?"
      },
      {
        q: "What do you like doing?",
        kind: "hobby",
        h: [
          "Think about a hobby.",
          "Try: I like... or I enjoy...",
          "Example: I like drawing."
        ],
        next: () => "That sounds interesting! Why do you like it?"
      },
      {
        q: "Why do you like it?",
        kind: "reason",
        h: [
          "Explain why you enjoy it.",
          "Try: Because... or It is...",
          "Example: Because it is fun."
        ],
        next: () => "Thank you for chatting with me!"
      }
    ]
  },

  school: {
    icon: "🏫",
    title: "My School Day",
    turns: [
      {
        q: "What subject do you like at school?",
        kind: "subject",
        h: [
          "Think of a school subject.",
          "Try: I like... or My favourite subject is...",
          "Example: I like science."
        ],
        next: () => "Why do you like that subject?"
      },
      {
        q: "Why do you like that subject?",
        kind: "reason",
        h: [
          "Explain your reason.",
          "Try: Because... or It is...",
          "Example: Because it is interesting."
        ],
        next: () => "What do you usually do after school?"
      },
      {
        q: "What do you usually do after school?",
        kind: "routine",
        h: [
          "Think of an activity.",
          "Try: I usually... or I often...",
          "Example: I usually read after school."
        ],
        next: () => "Who do you spend time with at school?"
      },
      {
        q: "Who do you spend time with at school?",
        kind: "person",
        h: [
          "Think of friends or classmates.",
          "Try: I spend time with...",
          "Example: I spend time with my friends."
        ],
        next: () => "Thanks for telling me about your school day!"
      }
    ]
  },

  hobbies: {
    icon: "🎨",
    title: "My Hobbies",
    turns: [
      {
        q: "What do you enjoy doing in your free time?",
        kind: "hobby",
        h: [
          "Think of something you enjoy.",
          "Try: I enjoy... or I like...",
          "Example: I enjoy reading books."
        ],
        next: () => "When do you usually do it?"
      },
      {
        q: "When do you usually do it?",
        kind: "time",
        h: [
          "Tell me when.",
          "Try: On weekends... or After school...",
          "Example: I usually do it on weekends."
        ],
        next: () => "Do you do it alone or with someone?"
      },
      {
        q: "Do you do it alone or with someone?",
        kind: "company",
        h: [
          "Think about who joins you.",
          "Try: I do it alone or With my friends.",
          "Example: I do it with my friends."
        ],
        next: () => "Why is this hobby special to you?"
      },
      {
        q: "Why is this hobby special to you?",
        kind: "reason",
        h: [
          "Explain what you enjoy.",
          "Try: Because... or It makes me...",
          "Example: Because it makes me happy."
        ],
        next: () => "Thank you for sharing your interests!"
      }
    ]
  }
};


// ==========================================
// 2. RESPONSE CHECKING
// ==========================================

function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function evaluate(kind, raw) {
  const t = normalize(raw);

  if (!t || t.split(" ").length > 90) {
    return { ok: false };
  }

  const tests = {
    name: () => {
      const match = t.match(
        /\b(?:my name is|i am|i'm|you can call me|call me)\s+([a-z]+)\b/
      );

      const excluded = [
        "fine", "happy", "good",
        "old", "years", "student"
      ];

      if (match && !excluded.includes(match[1])) {
        return { ok: true, value: match[1] };
      }

      return { ok: false };
    },

    age: () => ({
      ok: /\b(?:i am|i'm|my age is)\s+(?:\d{1,2}|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen)\b/.test(t)
    }),

    hobby: () => ({
      ok: /\b(?:i like|i love|i enjoy|my hobby is|i'm interested in)\s+\w+/.test(t)
    }),

    reason: () => ({
      ok: /\b(because|since|it is|it's|it makes me|fun|interesting|relaxing|happy|useful|exciting)\b/.test(t)
        && t.split(" ").length >= 3
    }),

    subject: () => ({
      ok: /\b(i like|i love|i enjoy|my favourite subject is|my favorite subject is)\b/.test(t)
        && /\b(english|math|maths|science|history|geography|art|music|pe|chinese|biology|physics|chemistry)\b/.test(t)
    }),

    routine: () => ({
      ok: /\b(i usually|i often|i sometimes|i always|i play|i read|i study|i do|i go|i watch|i help|after school i)\b/.test(t)
        && t.split(" ").length >= 3
    }),

    person: () => ({
      ok: /\b(friend|friends|classmate|classmates|teacher|teachers|brother|sister|family|myself)\b/.test(t)
    }),

    time: () => ({
      ok: /\b(morning|afternoon|evening|night|weekend|weekends|monday|tuesday|wednesday|thursday|friday|saturday|sunday|every day|after school|usually|often)\b/.test(t)
    }),

    company: () => ({
      ok: /\b(alone|myself|friend|friends|family|brother|sister|parents|together)\b/.test(t)
    })
  };

  return (tests[kind] || (() => ({ ok: false })))();
}


// ==========================================
// 3. SPEAKING SESSION STATE
// ==========================================

let scenario = "friends";
let turn = 0;
let turnHints = 0;
let turnRetried = false;

let turnsDone = 0;
let independent = 0;
let retries = 0;

let finished = false;
let recognition = null;
let listening = false;


// ==========================================
// 4. CHAT MESSAGES
// ==========================================

function bubble(type, text) {
  const chat = $("chat");

  if (!chat) return;

  const message = document.createElement("div");

  message.className = "bubble " + type;
  message.textContent = text;

  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}


// ==========================================
// 5. SCENARIO SELECTION
// ==========================================

function renderScenarios() {
  const container = $("scenarios");

  if (!container) return;

  container.innerHTML = Object.entries(scenarios)
    .map(([id, item]) => `
      <button
        type="button"
        class="scenario ${scenario === id ? "active" : ""}"
        data-scenario="${id}"
      >
        <strong>${item.icon} ${escapeHTML(item.title)}</strong>
        <div class="small muted">4 conversational turns</div>
      </button>
    `)
    .join("");

  container.querySelectorAll("[data-scenario]")
    .forEach(button => {
      button.onclick = () => {
        scenario = button.dataset.scenario;
        renderScenarios();
        restart();
      };
    });
}


// ==========================================
// 6. STOP MICROPHONE
// ==========================================

function stopMic() {
  if (recognition) {
    try {
      recognition.abort();
    } catch (error) {
      console.warn(error);
    }

    recognition = null;
  }

  listening = false;

  if ($("mic")) {
    $("mic").classList.remove("live");
  }
}


// ==========================================
// 7. RESTART CONVERSATION
// ==========================================

function restart() {
  stopMic();

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  turn = 0;
  turnHints = 0;
  turnRetried = false;

  turnsDone = 0;
  independent = 0;
  retries = 0;
  finished = false;

  $("chat").innerHTML = "";
  $("speech-input").value = "";

  $("speech-hint-box").textContent =
    "Try to answer independently first.";

  $("speech-status").className = "feedback";
  $("speech-status").textContent =
    "Ready to practise.";

  $("scenario-title").textContent =
    scenarios[scenario].title;

  $("scenario-label").textContent =
    scenarios[scenario].title.toUpperCase();

  bubble(
    "bot",
    scenarios[scenario].turns[0].q
  );

  speakingStats();
}


// ==========================================
// 8. UPDATE SESSION STATISTICS
// ==========================================

function speakingStats() {
  $("turn-label").textContent = finished
    ? "Dialogue complete"
    : `Turn ${turn + 1} / ${scenarios[scenario].turns.length}`;

  $("turns-done").textContent = turnsDone;
  $("turns-independent").textContent = independent;
  $("turns-retry").textContent = retries;
}


// ==========================================
// 9. THREE LEVELS OF HINTS
// ==========================================

function speakingHint(level) {
  if (finished) return;

  const question =
    scenarios[scenario].turns[turn];

  $("speech-hint-box").textContent =
    `Hint ${level}: ${question.h[level - 1]}`;

  turnHints = Math.max(turnHints, level);

  data.hints += 1;

  logEvent("speaking_hint", {
    scenario,
    turn,
    level
  });

  persist();
}


// ==========================================
// 10. PROCESS STUDENT RESPONSE
// ==========================================

function processResponse(raw, mode = "typed") {
  if (finished) return;

  const value = String(raw).trim();

  if (!value) {
    $("speech-status").textContent =
      "Please enter or say an English response.";
    return;
  }

  data.speaking += 1;

  if (mode === "voice") {
    data.voiceAttempts += 1;
  } else {
    data.typedAttempts += 1;
  }

  bubble("student", value);

  const question =
    scenarios[scenario].turns[turn];

  const result =
    evaluate(question.kind, value);

  logEvent("speaking_attempt", {
    scenario,
    turn,
    mode,
    matched: result.ok,
    hints: turnHints
  });

  if (result.ok) {
    // Successful pattern match

    data.speakingSuccess += 1;
    turnsDone += 1;

    const completedIndependently =
      turnHints === 0 && !turnRetried;

    if (completedIndependently) {
      independent += 1;
      data.independentTurns += 1;
    } else {
      data.supportedTurns += 1;
    }

    const reply =
      question.next(result.value);

    bubble("bot", reply);

    turn += 1;
    turnHints = 0;
    turnRetried = false;

    $("speech-hint-box").textContent =
      "New question: try independently.";

    $("speech-status").className =
      "feedback good";

    $("speech-status").textContent =
      completedIndependently
        ? "✓ Matched the task pattern independently."
        : "✓ Matched the task pattern after support.";

    if (turn >= scenarios[scenario].turns.length) {
      finished = true;
      data.completedDialogues += 1;

      chime("complete");

      $("speech-status").textContent =
        `Dialogue completed: ${turnsDone} turns, ` +
        `${independent} without hints or retries. ` +
        "This is not a full language assessment.";
    } else {
      chime("speaking");
    }

    speakingStats();
    persist();
    speak(reply);

  } else {
    // Response not recognised by the rules

    retries += 1;
    data.speakingRetries += 1;
    turnRetried = true;

    const message =
      "I may not have understood. " +
      "Try another way to answer the question, " +
      "or request a hint. A valid answer may be " +
      "rejected by this limited pattern checker.";

    bubble("note", message);

    $("speech-status").className =
      "feedback warn";

    $("speech-status").textContent =
      "Try again, or use a hint. " +
      "Pattern matching can make mistakes.";

    speakingStats();
    persist();

    speak("Could you try again?");
  }
}


// ==========================================
// 11. RESTART BUTTON
// ==========================================

if ($("restart")) {
  $("restart").onclick = restart;
}


// ==========================================
// 12. LISTEN AGAIN BUTTON
// ==========================================

if ($("repeat")) {
  $("repeat").onclick = () => {
    if (!finished) {
      speak(
        scenarios[scenario].turns[turn].q
      );
    }
  };
}


// ==========================================
// 13. HINT BUTTONS
// ==========================================

document.querySelectorAll("[data-speech-hint]")
  .forEach(button => {
    button.onclick = () => {
      speakingHint(
        Number(button.dataset.speechHint)
      );
    };
  });


// ==========================================
// 14. SEND TYPED RESPONSE
// ==========================================

if ($("send-speech")) {
  $("send-speech").onclick = () => {
    const value =
      $("speech-input").value.trim();

    $("speech-input").value = "";

    processResponse(value, "typed");
  };
}

if ($("speech-input")) {
  $("speech-input").onkeydown = event => {
    if (event.key === "Enter") {
      event.preventDefault();
      $("send-speech").click();
    }
  };
}


// ==========================================
// 15. MICROPHONE SPEECH RECOGNITION
// ==========================================

if ($("mic")) {
  $("mic").onclick = () => {
    if (finished) return;

    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!Recognition) {
      $("speech-status").textContent =
        "Speech recognition is unavailable in this browser. " +
        "Please use the typing option.";
      return;
    }

    if (listening) {
      try {
        recognition.stop();
      } catch (error) {
        console.warn(error);
      }
      return;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const instance = new Recognition();

    recognition = instance;

    instance.lang = "en-US";
    instance.interimResults = false;
    instance.continuous = false;

    instance.onstart = () => {
      if (recognition !== instance) return;

      listening = true;
      $("mic").classList.add("live");

      $("speech-status").textContent =
        "Listening...";
    };

    instance.onresult = event => {
      if (recognition !== instance) return;

      const transcript =
        event.results[0][0].transcript;

      processResponse(
        transcript,
        "voice"
      );
    };

    instance.onerror = event => {
      if (recognition !== instance) return;

      $("speech-status").textContent =
        "Microphone issue: " +
        event.error +
        ". Check permissions or use typing.";
    };

    instance.onend = () => {
      if (recognition !== instance) return;

      listening = false;
      $("mic").classList.remove("live");
    };

    try {
      instance.start();
    } catch (error) {
      $("speech-status").textContent =
        error.message;
    }
  };
}


// ==========================================
// END OF SPEAKING PARTNER MODULE
// ==========================================
