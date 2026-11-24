import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AssessmentTask,
  AssessmentTurnPayload,
  ConnectionState,
  HintStage,
  InProgressAssessment,
  TaskAssessmentRecord,
  UnitConfig,
} from '../types/aura';
import { base64ToFloat32, downsampleTo16k, int16ToBase64 } from '../utils/audioPcm';
import { createEmptyTaskRecord } from '../utils/scoring';

export interface AssessmentSessionState {
  connectionState: ConnectionState;
  tasks: AssessmentTask[];
  currentTaskIndex: number;
  records: Record<string, TaskAssessmentRecord>;
  isChineseOpen: boolean;
  hintStage: HintStage;
  selectedPhrase: string | null;
  micLevel: number;
  aiFeedback: string;
  studentTranscript: string;
  errorMessage: string | null;
  canReplayAudio: boolean;
  isAssessmentCompleted: boolean;
}

export function useAssessmentSession(params: {
  unitConfig: UnitConfig | null;
  initialSession: InProgressAssessment | null;
  isActive: boolean;
  onSaveProgress: (snapshot: InProgressAssessment) => void;
}) {
  const { unitConfig, initialSession, isActive, onSaveProgress } = params;

  const [tasks, setTasks] = useState<AssessmentTask[]>(
    initialSession?.tasks ?? unitConfig?.assessmentTasks ?? []
  );
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(
    initialSession?.currentTaskIndex ?? 0
  );
  const [records, setRecords] = useState<Record<string, TaskAssessmentRecord>>(
    initialSession?.records ?? {}
  );
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isChineseOpen, setIsChineseOpen] = useState<boolean>(false);
  const [hintStage, setHintStage] = useState<HintStage>('none');
  const [selectedPhrase, setSelectedPhrase] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [aiFeedback, setAiFeedback] = useState<string>('');
  const [studentTranscript, setStudentTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canReplayAudio, setCanReplayAudio] = useState<boolean>(false);

  const submissionTimerRef = useRef<number | undefined>(undefined);
  const wsRef = useRef<WebSocket | null>(null);
  const unitConfigRef = useRef<UnitConfig | null>(unitConfig);
  const tasksRef = useRef<AssessmentTask[]>(tasks);
  const taskIndexRef = useRef<number>(currentTaskIndex);
  const recordsRef = useRef<Record<string, TaskAssessmentRecord>>(records);
  const connectionStateRef = useRef<ConnectionState>(connectionState);
  const isRetestRef = useRef<boolean>(Boolean(initialSession?.isRetest));
  const studentIdRef = useRef<string>(initialSession?.studentId ?? 'student-default');

  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentTurnAudioChunksRef = useRef<string[]>([]);
  const lastCompletedAudioChunksRef = useRef<string[]>([]);
  const inputTranscriptRef = useRef<string>('');

  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const hasSentActivityStartRef = useRef<boolean>(false);
  const lastLevelUpdateRef = useRef<number>(0);

  useEffect(() => {
    unitConfigRef.current = unitConfig;
  }, [unitConfig]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    taskIndexRef.current = currentTaskIndex;
  }, [currentTaskIndex]);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  const syncFromSession = useCallback((session: InProgressAssessment | null) => {
    if (!session) return;
    setTasks(session.tasks);
    setCurrentTaskIndex(session.currentTaskIndex);
    setRecords(session.records);
    isRetestRef.current = session.isRetest;
    studentIdRef.current = session.studentId;
    setIsChineseOpen(false);
    setHintStage('none');
    setSelectedPhrase(null);
    setAiFeedback('');
    setStudentTranscript('');
    setErrorMessage(null);
    setCanReplayAudio(false);
    lastCompletedAudioChunksRef.current = [];
    inputTranscriptRef.current = '';
  }, []);

  useEffect(() => {
    if (initialSession) {
      syncFromSession(initialSession);
    }
  }, [initialSession, syncFromSession]);

  const persistSnapshot = useCallback(
    (nextIndex: number, nextRecords: Record<string, TaskAssessmentRecord>) => {
      const cfg = unitConfigRef.current;
      if (!cfg) return;
      onSaveProgress({
        unitId: cfg.id,
        studentId: studentIdRef.current,
        isRetest: isRetestRef.current,
        status: 'incomplete',
        currentTaskIndex: nextIndex,
        tasks: tasksRef.current,
        records: nextRecords,
        updatedAt: new Date().toISOString(),
      });
    },
    [onSaveProgress]
  );

  const stopAllPlayback = useCallback(() => {
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // ignore
      }
    }
    activeSourcesRef.current.clear();
    if (outputAudioCtxRef.current) {
      nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime;
    } else {
      nextPlayTimeRef.current = 0;
    }
  }, []);

  const ensureOutputAudioCtx = useCallback(async () => {
    if (!outputAudioCtxRef.current) {
      outputAudioCtxRef.current = new AudioContext({ sampleRate: 24000 });
    }
    if (outputAudioCtxRef.current.state === 'suspended') {
      await outputAudioCtxRef.current.resume();
    }
    return outputAudioCtxRef.current;
  }, []);

  const scheduleAudioChunk = useCallback(
    async (base64Pcm: string) => {
      const ctx = await ensureOutputAudioCtx();
      const float32 = base64ToFloat32(base64Pcm);
      if (float32.length === 0) return;

      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(new Float32Array(float32), 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const startAt = Math.max(ctx.currentTime + 0.02, nextPlayTimeRef.current);
      nextPlayTimeRef.current = startAt + buffer.duration;
      activeSourcesRef.current.add(source);

      source.onended = () => {
        activeSourcesRef.current.delete(source);
        if (
          activeSourcesRef.current.size === 0 &&
          connectionStateRef.current === 'speaking'
        ) {
          setConnectionState('ready');
        }
      };

      source.start(startAt);
    },
    [ensureOutputAudioCtx]
  );

  const stopMicCapture = useCallback(() => {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    setMicLevel(0);
  }, []);

  const closeConnection = useCallback(() => {
    window.clearTimeout(submissionTimerRef.current);
    submissionTimerRef.current = undefined;
    stopMicCapture();
    stopAllPlayback();
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'close' }));
        }
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setConnectionState('disconnected');
  }, [stopAllPlayback, stopMicCapture]);

  useEffect(() => {
    if (!isActive) {
      closeConnection();
    }
  }, [isActive, closeConnection]);

  useEffect(() => {
    return () => {
      closeConnection();
    };
  }, [closeConnection]);

  const applyAssessmentTurn = useCallback(
    (payload: AssessmentTurnPayload, inputTranscript: string) => {
      if (submissionTimerRef.current === undefined) return;
      window.clearTimeout(submissionTimerRef.current);
      submissionTimerRef.current = undefined;

      const task = tasksRef.current[taskIndexRef.current];
      if (!task) return;

      const prevRecords = recordsRef.current;
      const existing = prevRecords[task.id] ?? createEmptyTaskRecord(task);
      const studentSaid = inputTranscript.trim() || (payload.isUnheard ? '' : payload.studentTranscriptSummary) || '';
      const total =
        payload.relevanceScore + payload.objectiveScore + payload.clarityScore;

      if (existing.hasValidResponse) return;
      const independent = !payload.isUnheard && !existing.usedContentHintBeforeFirstGradable;
      const nextRec: TaskAssessmentRecord = {
        ...existing,
        hasValidResponse: true,
        hasIndependentEvidence: independent,
        independentRelevance: independent ? payload.relevanceScore : 0,
        independentObjective: independent ? payload.objectiveScore : 0,
        independentClarity: independent ? payload.clarityScore : 0,
        independentScore: independent ? total : 0,
        independentTranscript: studentSaid,
        assistedCompleted: !payload.isUnheard && !independent && total >= 3,
        followUpCount: 0,
        followUpPromptEn: undefined,
        feedbackReasonCn: payload.isUnheard ? (payload.feedbackReasonCn || '未取得可评分的语音。') : payload.feedbackReasonCn,
        modelAnswerEn: payload.modelAnswerEn || task.sampleAnswer,
      };

      const updated = { ...prevRecords, [task.id]: nextRec };
      recordsRef.current = updated;
      setRecords(updated);
      persistSnapshot(taskIndexRef.current, updated);
    },
    [persistSnapshot]
  );

  const connectForTask = useCallback(
    (options: { task: AssessmentTask; isFollowUp: boolean; skipInitialGreeting: boolean }) =>
      new Promise<void>((resolve, reject) => {
        const cfg = unitConfigRef.current;
        if (!cfg) {
          reject(new Error('尚未载入单元'));
          return;
        }

        closeConnection();
        setConnectionState('connecting');
        setErrorMessage(null);

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws/live`);
        wsRef.current = ws;
        const playedReplyIds = new Set<string>();
        const appliedUpdateReplyIds = new Set<string>();
        currentTurnAudioChunksRef.current = [];

        let settled = false;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'init',
              mode: 'assessment',
              unitConfig: cfg,
              task: options.task,
              isFollowUp: options.isFollowUp,
              skipInitialGreeting: options.skipInitialGreeting,
            })
          );
        };

        ws.onmessage = async (event) => {
          if (wsRef.current !== ws) return;
          let msg: Record<string, unknown>;
          try {
            msg = JSON.parse(event.data as string);
          } catch {
            return;
          }

          if (msg.type === 'session_ready') {
            if (!settled) {
              settled = true;
              setConnectionState(options.skipInitialGreeting ? 'ready' : 'speaking');
              resolve();
            }
            return;
          }

          if (msg.type === 'input_transcript' && typeof msg.text === 'string') {
            inputTranscriptRef.current = msg.text;
            setStudentTranscript(msg.text);
            return;
          }

          if (msg.type === 'output_transcript' && typeof msg.text === 'string') {
            const rid = typeof msg.replyId === 'string' ? msg.replyId : '';
            if (rid && playedReplyIds.has(rid)) return;
            setAiFeedback(msg.text);
            return;
          }

          if (msg.type === 'audio' && typeof msg.data === 'string') {
            const rid = typeof msg.replyId === 'string' ? msg.replyId : '';
            if (rid && playedReplyIds.has(rid)) return;
            if (connectionStateRef.current !== 'recording') {
              setConnectionState('speaking');
            }
            currentTurnAudioChunksRef.current.push(msg.data);
            await scheduleAudioChunk(msg.data);
            return;
          }

          if (msg.type === 'interrupted') {
            stopAllPlayback();
            return;
          }

          if (msg.type === 'assessment_update' && msg.payload) {
            if (msg.countAttempt !== false) {
              const rid = typeof msg.replyId === 'string' ? msg.replyId : '';
              const payload = msg.payload as AssessmentTurnPayload;
              if (!payload.isUnheard) {
                if (!rid || !appliedUpdateReplyIds.has(rid)) {
                  if (rid) appliedUpdateReplyIds.add(rid);
                  // Apply immediately so the final task transitions to completed right away
                  // without waiting for AI closing speech to finish.
                  applyAssessmentTurn(payload, inputTranscriptRef.current);
                }
              } else {
                applyAssessmentTurn(payload, inputTranscriptRef.current);
                setConnectionState('ready');
              }
            }
            return;
          }

          if (msg.type === 'turn_complete') {
            const rid = typeof msg.replyId === 'string' ? msg.replyId : '';
            const outText =
              typeof msg.outputTranscript === 'string' ? msg.outputTranscript : '';
            const inText =
              typeof msg.inputTranscript === 'string' ? msg.inputTranscript : '';
            const hadToolCall = Boolean(msg.hadToolCall);

            if (hadToolCall && !outText && currentTurnAudioChunksRef.current.length === 0) {
              if (inText) {
                inputTranscriptRef.current = inText;
                setStudentTranscript(inText);
              }
              return;
            }

            if (currentTurnAudioChunksRef.current.length > 0) {
              lastCompletedAudioChunksRef.current = [...currentTurnAudioChunksRef.current];
              currentTurnAudioChunksRef.current = [];
              if (rid) playedReplyIds.add(rid);
              setCanReplayAudio(true);
            }

            if (outText) setAiFeedback(outText);
            if (inText) {
              inputTranscriptRef.current = inText;
              setStudentTranscript(inText);
            }

            if (submissionTimerRef.current === undefined && activeSourcesRef.current.size === 0) {
              setConnectionState('ready');
            }
            return;
          }

          if (msg.type === 'error') {
            const errMsg =
              typeof msg.message === 'string' ? msg.message : '语音测评连接发生错误。';
            setErrorMessage(errMsg);
            setConnectionState('error');
            if (!settled) {
              settled = true;
              reject(new Error(errMsg));
            }
            return;
          }

          if (msg.type === 'session_closed') {
            if (connectionStateRef.current !== 'error') {
              setConnectionState('disconnected');
            }
          }
        };

        ws.onerror = () => {
          const errMsg = '无法连接实时语音测评服务，请检查网络后重试。';
          setErrorMessage(errMsg);
          setConnectionState('error');
          if (!settled) {
            settled = true;
            reject(new Error(errMsg));
          }
        };

        ws.onclose = () => {
          if (!settled) {
            settled = true;
            reject(new Error('语音连接已关闭'));
          }
        };
      }),
    [applyAssessmentTurn, closeConnection, scheduleAudioChunk, stopAllPlayback]
  );

  // Replaying English prompt counts as independent work (never marks usedContentHint)
  const playTaskPromptAudio = useCallback(async () => {
    const task = tasksRef.current[taskIndexRef.current];
    if (!task) return;
    setErrorMessage(null);
    await ensureOutputAudioCtx();

    if (lastCompletedAudioChunksRef.current.length > 0) {
      stopAllPlayback();
      setConnectionState('speaking');
      for (const chunk of lastCompletedAudioChunksRef.current) {
        await scheduleAudioChunk(chunk);
      }
      return;
    }

    const existing = recordsRef.current[task.id];
    const isFollowUp = Boolean(existing?.hasValidResponse);

    await connectForTask({
      task,
      isFollowUp,
      skipInitialGreeting: false,
    });
  }, [connectForTask, ensureOutputAudioCtx, scheduleAudioChunk, stopAllPlayback]);

  const markContentHintUsedIfBeforeFirstGradable = useCallback(() => {
    const task = tasksRef.current[taskIndexRef.current];
    if (!task) return;
    const prev = recordsRef.current;
    const existing = prev[task.id] ?? createEmptyTaskRecord(task);
    if (!existing.hasValidResponse && !existing.usedContentHintBeforeFirstGradable) {
      const updated = {
        ...prev,
        [task.id]: {
          ...existing,
          usedContentHintBeforeFirstGradable: true,
        },
      };
      setRecords(updated);
      persistSnapshot(taskIndexRef.current, updated);
    }
  }, [persistSnapshot]);

  const toggleChineseMeaning = useCallback(() => {
    setIsChineseOpen((prev) => {
      const next = !prev;
      if (next) {
        markContentHintUsedIfBeforeFirstGradable();
      }
      return next;
    });
  }, [markContentHintUsedIfBeforeFirstGradable]);

  const openHints = useCallback(() => {
    markContentHintUsedIfBeforeFirstGradable();
    setHintStage((prev) => (prev === 'none' ? 'phrases' : prev));
  }, [markContentHintUsedIfBeforeFirstGradable]);

  const revealStarter = useCallback(() => {
    markContentHintUsedIfBeforeFirstGradable();
    setHintStage('phrases_and_starter');
  }, [markContentHintUsedIfBeforeFirstGradable]);

  const selectPhrase = useCallback(
    (phrase: string) => {
      markContentHintUsedIfBeforeFirstGradable();
      setSelectedPhrase(phrase);
      setHintStage('phrases_and_starter');
    },
    [markContentHintUsedIfBeforeFirstGradable]
  );

  const startSpeaking = useCallback(async () => {
    const task = tasksRef.current[taskIndexRef.current];
    if (!task || recordsRef.current[task.id]?.hasValidResponse || submissionTimerRef.current !== undefined) return;
    setErrorMessage(null);

    try {
      await ensureOutputAudioCtx();
      stopAllPlayback();

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await connectForTask({
          task,
          isFollowUp: false,
          skipInitialGreeting: true,
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;
      if (inputCtx.state === 'suspended') {
        await inputCtx.resume();
      }

      const source = inputCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const processor = inputCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      hasSentActivityStartRef.current = false;
      inputTranscriptRef.current = '';
      setStudentTranscript('');
      setConnectionState('recording');

      processor.onaudioprocess = (event) => {
        const channel = event.inputBuffer.getChannelData(0);
        let sumSq = 0;
        for (let i = 0; i < channel.length; i++) {
          sumSq += channel[i] * channel[i];
        }
        const rms = Math.sqrt(sumSq / channel.length);

        const now = performance.now();
        if (now - lastLevelUpdateRef.current > 60) {
          lastLevelUpdateRef.current = now;
          setMicLevel(Math.min(1, rms * 8));
        }

        const pcm16 = downsampleTo16k(channel, inputCtx.sampleRate);
        const base64 = int16ToBase64(pcm16);

        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || pcm16.length === 0) return;

        if (!hasSentActivityStartRef.current) {
          ws.send(JSON.stringify({ type: 'activity_start' }));
          hasSentActivityStartRef.current = true;
        }
        ws.send(JSON.stringify({ type: 'audio', data: base64 }));
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);
    } catch (err) {
      stopMicCapture();
      const message =
        err instanceof Error && err.name === 'NotAllowedError'
          ? '请先允许使用麦克风权限，然后再点击「开始说」。'
          : err instanceof Error
            ? err.message
            : '无法开启麦克风，请重试。';
      setErrorMessage(message);
      setConnectionState('ready');
    }
  }, [connectForTask, ensureOutputAudioCtx, stopAllPlayback, stopMicCapture]);

  const finishSpeaking = useCallback(() => {
    const hasAudio = hasSentActivityStartRef.current;

    stopMicCapture();
    currentTurnAudioChunksRef.current = [];

    const ws = wsRef.current;
    const finishWithoutScore = (reason: string) => {
      applyAssessmentTurn({
        isUnheard: true, studentTranscriptSummary: '', relevanceScore: 0,
        objectiveScore: 0, clarityScore: 0, shouldAskFollowUp: false,
        feedbackReasonCn: reason, modelAnswerEn: '',
      }, inputTranscriptRef.current);
      closeConnection();
    };

    submissionTimerRef.current = window.setTimeout(() => {
      finishWithoutScore('系统未返回评分，本题缺少可评分证据。');
    }, 15000);

    if (!hasAudio || !ws || ws.readyState !== WebSocket.OPEN) {
      finishWithoutScore('未收到可评分的语音，本题缺少可评分证据。');
      return;
    }

    setConnectionState('processing');
    ws.send(JSON.stringify({ type: 'activity_end' }));
  }, [applyAssessmentTurn, closeConnection, stopMicCapture]);

  const cancelSpeaking = useCallback(async () => {
    const alreadyStreamed = hasSentActivityStartRef.current;
    stopMicCapture();
    hasSentActivityStartRef.current = false;

    if (alreadyStreamed) {
      const task = tasksRef.current[taskIndexRef.current];
      if (task) {
        await connectForTask({
          task,
          isFollowUp: Boolean(recordsRef.current[task.id]?.hasValidResponse),
          skipInitialGreeting: true,
        }).catch(() => {});
      }
    } else {
      setConnectionState(
        wsRef.current?.readyState === WebSocket.OPEN ? 'ready' : 'disconnected'
      );
    }
  }, [connectForTask, stopMicCapture]);

  const goToTask = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= tasksRef.current.length) return;
      closeConnection();
      setCurrentTaskIndex(nextIndex);
      setIsChineseOpen(false);
      setHintStage('none');
      setSelectedPhrase(null);
      setAiFeedback('');
      setStudentTranscript('');
      setErrorMessage(null);
      setCanReplayAudio(false);
      lastCompletedAudioChunksRef.current = [];
      persistSnapshot(nextIndex, recordsRef.current);
    },
    [closeConnection, persistSnapshot]
  );

  const pauseAndExit = useCallback(() => {
    closeConnection();
    persistSnapshot(taskIndexRef.current, recordsRef.current);
  }, [closeConnection, persistSnapshot]);

  const isAssessmentCompleted =
    tasks.length > 0 && tasks.every((t) => Boolean(records[t.id]?.hasValidResponse));

  return {
    state: {
      connectionState,
      tasks,
      currentTaskIndex,
      records,
      isChineseOpen,
      hintStage,
      selectedPhrase,
      micLevel,
      aiFeedback,
      studentTranscript,
      errorMessage,
      canReplayAudio,
      isAssessmentCompleted,
    } satisfies AssessmentSessionState,
    actions: {
      playTaskPromptAudio,
      toggleChineseMeaning,
      openHints,
      revealStarter,
      selectPhrase,
      startSpeaking,
      finishSpeaking,
      cancelSpeaking,
      goToTask,
      pauseAndExit,
      syncFromSession,
      closeConnection,
    },
  };
}
