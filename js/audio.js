
// ==========================================
// AURA EDU V2.2
// AUDIO AND SPEECH MODULE
// ==========================================


// ==========================================
// 1. AUDIO CONTEXT
// ==========================================

let audioCtx = null;


// ==========================================
// 2. FEEDBACK SOUNDS
// ==========================================

function chime(type = "correct") {

  if (!data.sound) {
    return;
  }

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  try {

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    audioCtx.resume();

    const soundPatterns = {

      correct: [660, 880],

      speaking: [523, 659, 784],

      revision: [440, 660],

      complete: [523, 659, 784, 1046]

    };

    const notes =
      soundPatterns[type] ||
      soundPatterns.correct;

    notes.forEach((frequency, index) => {

      const oscillator =
        audioCtx.createOscillator();

      const gain =
        audioCtx.createGain();

      const startTime =
        audioCtx.currentTime + index * 0.13;

      oscillator.type = "sine";

      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(
        0.0001,
        startTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.07,
        startTime + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + 0.17
      );

      oscillator.connect(gain);

      gain.connect(
        audioCtx.destination
      );

      oscillator.start(startTime);

      oscillator.stop(
        startTime + 0.19
      );

    });

  } catch (error) {

    console.warn(
      "Audio playback unavailable:",
      error
    );

  }
}


// ==========================================
// 3. TEXT TO SPEECH
// ==========================================

function speak(text) {

  if (!data.voice) {
    return;
  }

  if (!("speechSynthesis" in window)) {
    console.warn(
      "Speech synthesis is not supported."
    );
    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.lang = "en-US";

  utterance.rate =
    data.speechRate || 0.88;

  window.speechSynthesis.speak(
    utterance
  );
}


// ==========================================
// 4. SOUND SETTINGS
// ==========================================

$("sound-toggle").onchange = () => {

  data.sound =
    $("sound-toggle").checked;

  persist();
};


// ==========================================
// 5. VOICE SETTINGS
// ==========================================

$("voice-toggle").onchange = () => {

  data.voice =
    $("voice-toggle").checked;

  if (
    !data.voice &&
    "speechSynthesis" in window
  ) {

    window.speechSynthesis.cancel();

  }

  persist();
};


// ==========================================
// 6. SPEECH RATE
// ==========================================

$("voice-rate").onchange = () => {

  data.speechRate = Number(
    $("voice-rate").value
  );

  persist();
};
