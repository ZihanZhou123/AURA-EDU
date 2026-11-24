
/* ==========================================
   AURA EDU V2.2
   STAGE 29.1.5
   SPEAKING DIAGNOSTIC EVIDENCE INTEGRITY
   Version 2.0

   - Preserve original diagnostic tasks
   - Verify Grammar / Spelling unlock
   - Record microphone audio
   - Detect basic audio activity
   - Require playback and confirmation
   - Protect learner identity
   - Preserve Version 1 records
   - No automatic speaking score
========================================== */

(function () {
  "use strict";

  const ACTIVE_KEY = "aura_active_learner_id_v2";
  const RECORDS_KEY = "aura_speaking_diagnostic_v1";

  const tasks = [
    {
      id: "SD1",
      title: "Task 1 — Self Introduction",
      prompt:
        "Introduce yourself in English. " +
        "Tell us your name and one thing about yourself. " +
        "请用英语介绍自己。"
    },
    {
      id: "SD2",
      title: "Task 2 — My School",
      prompt:
        "Tell us about your school or classroom. " +
        "Use your own English sentences. " +
        "请用英语介绍你的学校或教室。"
    },
    {
      id: "SD3",
      title: "Task 3 — My Interests",
      prompt:
        "Tell us what you like doing and why. " +
        "请用英语说说你的兴趣以及原因。"
    }
  ];

  const $ = id => document.getElementById(id);

  let sessionLearnerId = null;
  let sessionId = null;
  let taskIndex = 0;
  let sessionResults = [];
  let sessionComplete = false;

  let recorder = null;
  let stream = null;
  let chunks = [];
  let recordingBlob = null;
  let recordingURL = null;
  let recordingStart = 0;
  let recordingDuration = 0;
  let recordingAttempts = 0;
  let recordingReady = false;
  let isRecording = false;
  let recordingToken = 0;

  let audioContext = null;
  let analyser = null;
  let audioSource = null;
  let analysisTimer = null;
  let audioSamples = 0;
  let activeSamples = 0;
  let peakRMS = 0;
  let audioQuality = "NOT_CHECKED";

  let playbackStarted = false;
  let pageActive = true;

  function activeLearnerId() {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      if (!raw) return null;

      if (raw.startsWith('"')) {
        const parsed = JSON.parse(raw);
        return typeof parsed === "string"
          ? parsed
          : null;
      }

      return raw;
    } catch (error) {
      return null;
    }
  }

  function verifyAccess() {
    const learnerId = activeLearnerId();

    if (!learnerId) {
      return {
        eligible: false,
        learnerId: null,
        reason: "请先选择学生。"
      };
    }

    try {
      const grammar =
        window.AuraGrammarUnlock.evaluateGrammar();

      if (
        !grammar ||
        grammar.ok !== true ||
        String(grammar.learnerId) !== learnerId ||
        grammar.grammarComplete !== true ||
        grammar.spellingEligible !== true
      ) {
        return {
          eligible: false,
          learnerId,
          reason: "Grammar 条件未满足。"
        };
      }

      const spelling =
        window.AuraSpellingMastery.evaluate(learnerId);

      const eligible = Boolean(
        spelling &&
        spelling.ok === true &&
        String(spelling.learnerId) === learnerId &&
        spelling.decision === "PROVISIONAL_MASTERY" &&
        spelling.provisionalMastery === true
      );

      return {
        eligible,
        learnerId,
        reason: eligible
          ? "Speaking Diagnostic 已解锁。"
          : "Spelling 条件未满足。"
      };
    } catch (error) {
      console.error(
        "[Speaking Diagnostic] Access:",
        error
      );

      return {
        eligible: false,
        learnerId,
        reason: "学习证据验证失败。"
      };
    }
  }

  function sameLearner() {
    const report = verifyAccess();

    return (
      report.eligible &&
      report.learnerId === sessionLearnerId
    );
  }

  function show(id, visible) {
    $(id).classList.toggle("hidden", !visible);
  }

  function setStatus(message, type = "") {
    const element = $("recording-status");
    element.textContent = message;
    element.className = "status " + type;
  }

  // ----------------------------------------
  // Dynamic confirmation interface
  // ----------------------------------------

  function createConfirmationUI() {
    if ($("audio-confirmation")) return;

    const wrapper = document.createElement("div");
    wrapper.id = "audio-confirmation";
    wrapper.className = "status hidden";

    const title = document.createElement("strong");
    title.textContent =
      "🎧 Recording Confirmation / 录音确认";

    const description = document.createElement("p");
    description.textContent =
      "请先播放录音，确认可以听到自己的英语回答。" +
      "如有问题，请选择 Record Again。";

    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.gap = "10px";
    label.style.alignItems = "flex-start";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "confirm-recording";
    checkbox.disabled = true;
    checkbox.style.marginTop = "4px";

    const text = document.createElement("span");
    text.textContent =
      "I listened to my recording and confirm " +
      "that it contains my spoken response. " +
      "/ 我已播放录音，并确认包含我的口语回答。";

    label.append(checkbox, text);
    wrapper.append(title, description, label);

    $("recording-playback").insertAdjacentElement(
      "afterend",
      wrapper
    );

    checkbox.addEventListener("change", updateSaveButton);

    $("recording-playback").addEventListener(
      "play",
      function () {
        if (!recordingReady || !sameLearner()) return;

        playbackStarted = true;
        checkbox.disabled = false;
        updateSaveButton();
      }
    );
  }

  function updateSaveButton() {
    const checkbox = $("confirm-recording");

    $("save-next").disabled = !(
      sameLearner() &&
      recordingReady &&
      recordingBlob &&
      playbackStarted &&
      checkbox &&
      checkbox.checked &&
      !isRecording
    );
  }

  function resetConfirmation() {
    playbackStarted = false;

    const checkbox = $("confirm-recording");

    if (checkbox) {
      checkbox.checked = false;
      checkbox.disabled = true;
    }

    show("audio-confirmation", false);
    $("save-next").disabled = true;
  }

  // ----------------------------------------
  // Audio cleanup
  // ----------------------------------------

  function stopTracks() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }

  function stopAudioAnalysis() {
    if (analysisTimer !== null) {
      clearInterval(analysisTimer);
      analysisTimer = null;
    }

    if (audioSource) {
      try {
        audioSource.disconnect();
      } catch (error) {
        console.warn(error);
      }
      audioSource = null;
    }

    if (audioContext) {
      const context = audioContext;
      audioContext = null;

      context.close().catch(() => {});
    }

    analyser = null;
  }

  function releaseAudio() {
    if (recordingURL) {
      URL.revokeObjectURL(recordingURL);
      recordingURL = null;
    }

    recordingBlob = null;
    recordingReady = false;

    const player = $("recording-playback");
    player.pause();
    player.removeAttribute("src");
    player.load();

    show("recording-playback", false);
    resetConfirmation();
  }

  function cancelRecording() {
    recordingToken += 1;

    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch (error) {
        console.warn(
          "[Speaking Diagnostic] Stop:",
          error
        );
      }
    }

    isRecording = false;
    recorder = null;

    stopAudioAnalysis();
    stopTracks();
    releaseAudio();
  }

  // ----------------------------------------
  // Basic microphone signal analysis
  // ----------------------------------------

  function startAudioAnalysis(currentStream) {
    audioSamples = 0;
    activeSamples = 0;
    peakRMS = 0;
    audioQuality = "NOT_CHECKED";

    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) return;

    try {
      audioContext = new AudioContextClass();

      audioSource =
        audioContext.createMediaStreamSource(
          currentStream
        );

      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;

      audioSource.connect(analyser);

      const buffer = new Float32Array(
        analyser.fftSize
      );

      analysisTimer = setInterval(() => {
        if (!analyser || !isRecording) return;

        analyser.getFloatTimeDomainData(buffer);

        let sum = 0;

        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] * buffer[i];
        }

        const rms = Math.sqrt(
          sum / buffer.length
        );

        audioSamples += 1;
        peakRMS = Math.max(peakRMS, rms);

        // Heuristic threshold only.
        // It is NOT speech recognition.
        if (rms >= 0.012) {
          activeSamples += 1;
        }
      }, 200);

    } catch (error) {
      console.warn(
        "[Speaking Diagnostic] Audio analysis:",
        error
      );

      stopAudioAnalysis();
    }
  }

  function evaluateAudioQuality() {
    if (audioSamples === 0) {
      audioQuality = "NOT_CHECKED";
      return;
    }

    const ratio = activeSamples / audioSamples;

    if (ratio < 0.05) {
      audioQuality = "POSSIBLE_SILENCE";
    } else if (ratio < 0.15) {
      audioQuality = "LOW_AUDIO_ACTIVITY";
    } else {
      audioQuality = "AUDIO_ACTIVITY_DETECTED";
    }
  }

  function audioQualityMessage() {
    if (audioQuality === "POSSIBLE_SILENCE") {
      return (
        "⚠️ 录音可能接近静音。" +
        "请播放检查，必要时重新录音。"
      );
    }

    if (audioQuality === "LOW_AUDIO_ACTIVITY") {
      return (
        "⚠️ 检测到较少声音活动。" +
        "请确认录音清晰。"
      );
    }

    if (audioQuality === "AUDIO_ACTIVITY_DETECTED") {
      return (
        "✓ 检测到声音活动。" +
        "请播放录音确认实际内容。"
      );
    }

    return (
      "音量分析不可用。" +
      "请播放录音自行检查。"
    );
  }

  // ----------------------------------------
  // Session and task management
  // ----------------------------------------

  function refreshAccess() {
    if (!pageActive) return;

    const report = verifyAccess();

    $("learner-label").textContent =
      "Current Learner: " +
      (report.learnerId || "Not selected");

    $("access-status").textContent =
      (report.eligible ? "✓ " : "🔒 ") +
      report.reason;

    $("access-status").className =
      "status " +
      (report.eligible ? "success" : "error");

    if (!report.eligible) {
      cancelRecording();

      // Clear any previous learner's session state.
      sessionLearnerId = null;
      sessionComplete = false;
      sessionResults = [];

      show("locked-panel", true);
      show("diagnostic-panel", false);
      show("complete-panel", false);
      return;
    }

    show("locked-panel", false);

    if (sessionLearnerId !== report.learnerId) {
      cancelRecording();
      beginSession(report.learnerId);
      return;
    }

    if (sessionComplete) {
      show("diagnostic-panel", false);
      show("complete-panel", true);
    } else {
      show("diagnostic-panel", true);
      show("complete-panel", false);
    }
  }

  function beginSession(learnerId) {
    cancelRecording();

    sessionLearnerId = learnerId;
    sessionId =
      "SD-" + Date.now() + "-" +
      Math.random().toString(36).slice(2, 10);

    taskIndex = 0;
    sessionResults = [];
    sessionComplete = false;

    show("complete-panel", false);
    show("diagnostic-panel", true);

    renderTask();
  }

  function renderTask() {
    cancelRecording();

    recordingAttempts = 0;
    recordingDuration = 0;
    audioQuality = "NOT_CHECKED";

    const task = tasks[taskIndex];

    $("task-title").textContent = task.title;
    $("task-prompt").textContent = task.prompt;

    $("progress-fill").style.width =
      (taskIndex / tasks.length * 100) + "%";

    $("confirmed-text").value = "";

    $("start-recording").disabled = false;
    $("stop-recording").disabled = true;
    $("retry-recording").disabled = true;

    $("save-next").textContent =
      taskIndex === tasks.length - 1
        ? "Finish Diagnostic / 完成诊断"
        : "Save & Next / 保存并继续";

    resetConfirmation();
    setStatus("尚未录音 / Not recorded");
  }

  // ----------------------------------------
  // Recording
  // ----------------------------------------

  function chooseMimeType() {
    if (!window.MediaRecorder) return "";

    const candidates = [
      "audio/webm;codecs=opus",
      "audio/mp4",
      "audio/webm"
    ];

    return candidates.find(type =>
      MediaRecorder.isTypeSupported(type)
    ) || "";
  }

  async function startRecording() {
    if (!sameLearner()) {
      refreshAccess();
      return;
    }

    if (isRecording) return;

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      !window.MediaRecorder
    ) {
      setStatus(
        "浏览器不支持当前录音方式。",
        "error"
      );
      return;
    }

    cancelRecording();

    const token = recordingToken;
    const learnerAtStart = sessionLearnerId;
    const taskAtStart = taskIndex;

    $("start-recording").disabled = true;
    $("stop-recording").disabled = true;
    $("retry-recording").disabled = true;

    setStatus("正在请求麦克风权限...");

    try {
      const newStream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        });

      if (
        !pageActive ||
        token !== recordingToken ||
        !sameLearner() ||
        learnerAtStart !== sessionLearnerId ||
        taskAtStart !== taskIndex
      ) {
        newStream.getTracks().forEach(
          track => track.stop()
        );
        refreshAccess();
        return;
      }

      stream = newStream;
      chunks = [];

      const mimeType = chooseMimeType();

      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      const currentRecorder = recorder;

      currentRecorder.ondataavailable = event => {
        if (
          token === recordingToken &&
          event.data &&
          event.data.size > 0
        ) {
          chunks.push(event.data);
        }
      };

      currentRecorder.onstop = () => {
        if (
          token !== recordingToken ||
          !pageActive
        ) {
          stopAudioAnalysis();
          stopTracks();
          return;
        }

        stopAudioAnalysis();
        stopTracks();
        isRecording = false;

        if (!sameLearner()) {
          refreshAccess();
          return;
        }

        if (chunks.length === 0) {
          setStatus(
            "没有获得录音数据，请重新录制。",
            "error"
          );

          $("start-recording").disabled = false;
          $("retry-recording").disabled = false;
          return;
        }

        recordingBlob = new Blob(chunks, {
          type:
            currentRecorder.mimeType ||
            "application/octet-stream"
        });

        if (recordingBlob.size === 0) {
          setStatus("录音文件为空，请重试。", "error");
          $("start-recording").disabled = false;
          return;
        }

        recordingURL =
          URL.createObjectURL(recordingBlob);

        $("recording-playback").src =
          recordingURL;

        show("recording-playback", true);
        show("audio-confirmation", true);

        recordingReady = true;

        $("start-recording").disabled = false;
        $("stop-recording").disabled = true;
        $("retry-recording").disabled = false;

        updateSaveButton();

        setStatus(
          "录音完成：" +
          recordingDuration.toFixed(1) +
          " 秒。\n" +
          audioQualityMessage(),
          audioQuality === "POSSIBLE_SILENCE"
            ? "error"
            : "success"
        );
      };

      currentRecorder.onerror = () => {
        cancelRecording();

        $("start-recording").disabled = false;
        $("stop-recording").disabled = true;

        setStatus(
          "录音失败，请重新尝试。",
          "error"
        );
      };

      currentRecorder.start();

      recordingAttempts += 1;
      recordingStart = performance.now();
      isRecording = true;

      startAudioAnalysis(stream);

      $("stop-recording").disabled = false;

      setStatus(
        "🔴 正在录音，请开始说英语..."
      );

    } catch (error) {
      stopAudioAnalysis();
      stopTracks();

      $("start-recording").disabled = false;
      $("stop-recording").disabled = true;

      setStatus(
        "无法启动录音。请检查麦克风权限。",
        "error"
      );

      console.error(
        "[Speaking Diagnostic] Microphone:",
        error
      );
    }
  }

  function stopRecording() {
    if (!recorder || !isRecording) return;

    recordingDuration =
      (performance.now() - recordingStart) / 1000;

    if (recordingDuration < 0.5) {
      setStatus(
        "录音时间过短，请继续录音。",
        "error"
      );
      return;
    }

    $("stop-recording").disabled = true;
    setStatus("正在处理录音...");

    evaluateAudioQuality();

    try {
      recorder.stop();
    } catch (error) {
      cancelRecording();

      $("start-recording").disabled = false;

      setStatus(
        "停止录音失败，请重试。",
        "error"
      );
    }
  }

  function retryRecording() {
    if (!sameLearner()) {
      refreshAccess();
      return;
    }

    cancelRecording();

    $("start-recording").disabled = false;
    $("stop-recording").disabled = true;
    $("retry-recording").disabled = true;

    setStatus("可以重新录音。");
  }

  // ----------------------------------------
  // Evidence storage
  // ----------------------------------------

  function readRecords() {
    try {
      const parsed = JSON.parse(
        localStorage.getItem(RECORDS_KEY) || "[]"
      );

      return Array.isArray(parsed)
        ? parsed
        : null;
    } catch (error) {
      console.error(
        "[Speaking Diagnostic] Records:",
        error
      );
      return null;
    }
  }

  function saveTask() {
    if (!sameLearner()) {
      refreshAccess();
      return;
    }

    const confirmation = $("confirm-recording");

    if (
      !recordingReady ||
      !recordingBlob ||
      !playbackStarted ||
      !confirmation ||
      !confirmation.checked
    ) {
      setStatus(
        "请先播放录音并完成确认。",
        "error"
      );
      return;
    }

    const task = tasks[taskIndex];

    const record = {
      schemaVersion: 2,
      sessionId,
      learnerId: sessionLearnerId,
      taskId: task.id,
      taskTitle: task.title,
      phase: "DIAGNOSTIC",
      completedAt: new Date().toISOString(),

      recordingCompleted: true,
      recordingDurationSeconds:
        Number(recordingDuration.toFixed(2)),
      recordingAttempts,

      audioMimeType: recordingBlob.type,
      audioBytes: recordingBlob.size,
      audioPersisted: false,

      audioQualityStatus: audioQuality,
      audioActivitySampleCount: audioSamples,
      activeAudioSampleCount: activeSamples,
      peakRMS: Number(peakRMS.toFixed(5)),

      playbackStarted: true,
      studentAudioConfirmed: true,
      confirmationSource:
        "STUDENT_SELF_CONFIRMATION",

      studentConfirmedText:
        $("confirmed-text").value.trim(),
      transcriptionSource:
        "STUDENT_SELF_REPORT",

      pronunciationScore: null,
      fluencyScore: null,
      grammarScore: null,
      masteryDecision: null
    };

    const records = readRecords();

    if (!records) {
      setStatus(
        "已有记录无法读取，停止保存以保护历史数据。",
        "error"
      );
      return;
    }

    try {
      localStorage.setItem(
        RECORDS_KEY,
        JSON.stringify(records.concat(record))
      );
    } catch (error) {
      setStatus(
        "保存失败，请检查浏览器存储空间。",
        "error"
      );
      return;
    }

    sessionResults.push(record);

    if (taskIndex < tasks.length - 1) {
      taskIndex += 1;
      renderTask();
    } else {
      completeSession();
    }
  }

  function completeSession() {
    cancelRecording();
    sessionComplete = true;

    show("diagnostic-panel", false);
    show("complete-panel", true);

    $("progress-fill").style.width = "100%";

    const container = $("result-summary");
    container.replaceChildren();

    const heading = document.createElement("p");
    heading.textContent =
      "Learner: " + sessionLearnerId +
      " · Tasks completed: " +
      sessionResults.length + "/" + tasks.length;

    container.appendChild(heading);

    sessionResults.forEach(result => {
      const item = document.createElement("div");
      item.className = "result";

      const title = document.createElement("strong");
      title.textContent = result.taskTitle;

      const detail = document.createElement("div");
      detail.textContent =
        "Recording: " +
        result.recordingDurationSeconds +
        " seconds · Attempts: " +
        result.recordingAttempts +
        " · Quality: " +
        result.audioQualityStatus;

      item.append(title, detail);
      container.appendChild(item);
    });

    const note = document.createElement("p");
    note.className = "muted";
    note.textContent =
      "诊断记录已保存到浏览器。" +
      "音频没有持久化保存。" +
      "本阶段不生成自动口语能力评分。";

    container.appendChild(note);
  }

  function restartSession() {
    const report = verifyAccess();

    if (!report.eligible) {
      refreshAccess();
      return;
    }

    beginSession(report.learnerId);
  }

  // ----------------------------------------
  // Events
  // ----------------------------------------

  createConfirmationUI();

  $("start-recording").addEventListener(
    "click", startRecording
  );

  $("stop-recording").addEventListener(
    "click", stopRecording
  );

  $("retry-recording").addEventListener(
    "click", retryRecording
  );

  $("save-next").addEventListener(
    "click", saveTask
  );

  $("restart-diagnostic").addEventListener(
    "click", restartSession
  );

  window.addEventListener(
    "focus", refreshAccess
  );

  window.addEventListener(
    "pageshow",
    () => {
      pageActive = true;
      refreshAccess();
    }
  );

  window.addEventListener(
    "storage", refreshAccess
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) {
        refreshAccess();
      }
    }
  );

  window.addEventListener(
    "pagehide",
    () => {
      pageActive = false;
      cancelRecording();
    }
  );

  refreshAccess();
})();
