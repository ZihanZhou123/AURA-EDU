import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ConnectionState,
  GrammarCorrection,
  HintStage,
  LearningStats,
  PedagogicalUpdatePayload,
  PracticeFocusOverride,
  PracticeLogEntry,
  TurnOutcome,
  UnitConfig,
} from '../types/aura';
import { base64ToFloat32, downsampleTo16k, int16ToBase64 } from '../utils/audioPcm';

function normalizeQuestion(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/[?.!,]+$/g, '')
    .replace(/\s+/g, ' ');
}

export interface LiveTutorState {
  connectionState: ConnectionState;
  currentQuestion: string;
  currentQuestionChinese: string;
  currentPhraseChoices: string[];
  currentSentenceStarter: string;
  isChineseOpen: boolean;
  hintStage: HintStage;
  selectedPhrase: string | null;
  grammarCorrection: GrammarCorrection | null;
  demoSentence: string | null;
  aiFeedback: string;
  studentTranscript: string;
  hasUsedHintForQuestion: boolean;
  micLevel: number;
  errorMessage: string | null;
  stats: LearningStats;
  logs: PracticeLogEntry[];
  canReplayAudio: boolean;
  isPracticeCompleted: boolean;
}

export function useLiveTutor(
  unitConfig: UnitConfig | null,
  practiceFocus?: PracticeFocusOverride | null
) {
  const initialQ = practiceFocus?.prompt ?? unitConfig?.initialQuestion ?? '';
  const initialQZh =
    practiceFocus?.promptChinese ?? unitConfig?.initialQuestionChinese ?? '';
  const initialPhrases =
    practiceFocus?.phraseChoices ?? unitConfig?.initialPhraseChoices ?? [];
  const initialStarter =
    practiceFocus?.sentenceStarter ?? unitConfig?.initialSentenceStarter ?? '';

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [currentQuestion, setCurrentQuestion] = useState<string>(initialQ);
  const [currentQuestionChinese, setCurrentQuestionChinese] = useState<string>(initialQZh);
  const [currentPhraseChoices, setCurrentPhraseChoices] =
    useState<string[]>(initialPhrases);
  const [currentSentenceStarter, setCurrentSentenceStarter] =
    useState<string>(initialStarter);
  const [isChineseOpen, setIsChineseOpen] = useState<boolean>(false);
  const [hintStage, setHintStage] = useState<HintStage>('none');
  const [selectedPhrase, setSelectedPhrase] = useState<string | null>(null);
  const [grammarCorrection, setGrammarCorrection] = useState<GrammarCorrection | null>(null);
  const [demoSentence, setDemoSentence] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string>('');
  const [studentTranscript, setStudentTranscript] = useState<string>('');
  const [hasUsedHintForQuestion, setHasUsedHintForQuestion] = useState<boolean>(false);
  const [hasGrammarCorrectionInQuestion, setHasGrammarCorrectionInQuestion] =
    useState<boolean>(false);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<LearningStats>({
    independentCorrect: 0,
    assistedCorrect: 0,
    correctedComplete: 0,
    needsRetry: 0,
  });
  const [logs, setLogs] = useState<PracticeLogEntry[]>([]);
  const [canReplayAudio, setCanReplayAudio] = useState<boolean>(false);
  const [isPracticeCompleted, setIsPracticeCompleted] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const unitConfigRef = useRef<UnitConfig | null>(unitConfig);
  const currentQuestionRef = useRef<string>(currentQuestion);
  const hasUsedHintRef = useRef<boolean>(hasUsedHintForQuestion);
  const hasGrammarCorrectionRef = useRef<boolean>(hasGrammarCorrectionInQuestion);
  const connectionStateRef = useRef<ConnectionState>(connectionState);

  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentTurnAudioChunksRef = useRef<string[]>([]);
  const lastCompletedAudioChunksRef = useRef<string[]>([]);
  const playedReplyIdsRef = useRef<Set<string>>(new Set());
  const processedUpdateReplyIdsRef = useRef<Set<string>>(new Set());
  const isDemoPlaybackRef = useRef<boolean>(false);

  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const preRollChunksRef = useRef<string[]>([]);
  const hasSentActivityStartRef = useRef<boolean>(false);
  const speechFramesCountRef = useRef<number>(0);
  const recordingStartTimeRef = useRef<number>(0);
  const lastLevelUpdateRef = useRef<number>(0);

  const pendingTurnPayloadRef = useRef<{
    replyId: string;
    payload: PedagogicalUpdatePayload;
    countOutcome: boolean;
  } | null>(null);
  const inputTranscriptRef = useRef<string>('');

  useEffect(() => {
    unitConfigRef.current = unitConfig;
  }, [unitConfig]);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    hasUsedHintRef.current = hasUsedHintForQuestion;
  }, [hasUsedHintForQuestion]);

  useEffect(() => {
    hasGrammarCorrectionRef.current = hasGrammarCorrectionInQuestion;
  }, [hasGrammarCorrectionInQuestion]);

  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

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

  const applyTurnRecord = useCallback(
    (
      payload: PedagogicalUpdatePayload,
      countOutcome: boolean,
      outputTranscript: string,
      inputTranscript: string
    ) => {
      const prevQuestion = currentQuestionRef.current;
      const nextQuestion = payload.nextQuestion?.trim() || prevQuestion;
      const questionChanged =
        normalizeQuestion(nextQuestion) !== normalizeQuestion(prevQuestion);

      let effectiveOutcome: TurnOutcome = payload.outcome;
      if (
        effectiveOutcome === 'independent_correct' ||
        effectiveOutcome === 'assisted_correct' ||
        effectiveOutcome === 'corrected_complete'
      ) {
        if (hasGrammarCorrectionRef.current) {
          effectiveOutcome = 'corrected_complete';
        } else if (hasUsedHintRef.current && effectiveOutcome === 'independent_correct') {
          effectiveOutcome = 'assisted_correct';
        }
      }

      if (questionChanged) {
        setCurrentQuestion(nextQuestion);
        setCurrentQuestionChinese(payload.nextQuestionChinese || '');
        setCurrentPhraseChoices(
          Array.isArray(payload.nextPhraseChoices) ? payload.nextPhraseChoices.slice(0, 3) : []
        );
        setCurrentSentenceStarter(payload.nextSentenceStarter || '');
        setHintStage('none');
        setSelectedPhrase(null);
        setIsChineseOpen(false);
        setGrammarCorrection(null);
        setDemoSentence(null);
        setHasUsedHintForQuestion(false);
        setHasGrammarCorrectionInQuestion(false);
      } else {
        if (payload.nextQuestionChinese) {
          setCurrentQuestionChinese(payload.nextQuestionChinese);
        }
        if (Array.isArray(payload.nextPhraseChoices) && payload.nextPhraseChoices.length > 0) {
          setCurrentPhraseChoices(payload.nextPhraseChoices.slice(0, 3));
        }
        if (payload.nextSentenceStarter) {
          setCurrentSentenceStarter(payload.nextSentenceStarter);
        }

        if (effectiveOutcome === 'grammar_correction') {
          setGrammarCorrection({
            explanationCn:
              payload.grammarExplanationCn || '请注意这里的语法小细节，改一改再重说。',
            correctedExample: payload.correctedExample || '',
          });
          setDemoSentence(payload.demoSentence?.trim() || payload.correctedExample?.trim() || null);
          setHasGrammarCorrectionInQuestion(true);
        } else if (effectiveOutcome === 'scaffolding_keyword') {
          setHasUsedHintForQuestion(true);
          setGrammarCorrection(null);
          setDemoSentence(payload.demoSentence?.trim() || null);
          if (payload.hintStage === 'phrases' || payload.hintStage === 'phrases_and_starter') {
            setHintStage(payload.hintStage);
          } else {
            setHintStage('phrases_and_starter');
          }
        } else if (
          effectiveOutcome === 'independent_correct' ||
          effectiveOutcome === 'assisted_correct' ||
          effectiveOutcome === 'corrected_complete'
        ) {
          setGrammarCorrection(null);
          setDemoSentence(null);
          setHintStage('none');
          setSelectedPhrase(null);
          setHasUsedHintForQuestion(false);
          setHasGrammarCorrectionInQuestion(false);
        }
      }

      if (payload.isPracticeCompleted) {
        setIsPracticeCompleted(true);
        setGrammarCorrection(null);
        setDemoSentence(null);
        setHintStage('none');
      }

      if (!countOutcome) {
        return;
      }

      let countedIn: PracticeLogEntry['countedIn'] = 'none';
      if (effectiveOutcome === 'independent_correct') {
        countedIn = 'independentCorrect';
        setStats((s) => ({ ...s, independentCorrect: s.independentCorrect + 1 }));
      } else if (effectiveOutcome === 'assisted_correct') {
        countedIn = 'assistedCorrect';
        setStats((s) => ({ ...s, assistedCorrect: s.assistedCorrect + 1 }));
      } else if (effectiveOutcome === 'corrected_complete') {
        countedIn = 'correctedComplete';
        setStats((s) => ({ ...s, correctedComplete: s.correctedComplete + 1 }));
      } else if (effectiveOutcome === 'needs_retry') {
        countedIn = 'needsRetry';
        setStats((s) => ({ ...s, needsRetry: s.needsRetry + 1 }));
      }

      const studentText =
        payload.studentTranscriptSummary || inputTranscript || '[未识别到有效英文]';
      const entry: PracticeLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        question: prevQuestion,
        studentSaid: studentText,
        aiReply: outputTranscript || payload.nextQuestion,
        outcome: effectiveOutcome,
        usedHint: hasUsedHintRef.current,
        countedIn,
      };
      setLogs((prev) => [entry, ...prev]);
    },
    []
  );

  const connectSession = useCallback(
    (options?: { skipInitialGreeting?: boolean }) =>
      new Promise<void>((resolve, reject) => {
        const cfg = unitConfigRef.current;
        if (!cfg) {
          reject(new Error('尚未载入单元'));
          return;
        }

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          resolve();
          return;
        }

        closeConnection();
        setConnectionState('connecting');
        setErrorMessage(null);

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws/live`);
        wsRef.current = ws;

        let settled = false;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'init',
              mode: 'practice',
              unitConfig: cfg,
              skipInitialGreeting: Boolean(options?.skipInitialGreeting),
              currentQuestion: currentQuestionRef.current || cfg.initialQuestion,
            })
          );
        };

        ws.onmessage = async (event) => {
          let msg: Record<string, unknown>;
          try {
            msg = JSON.parse(event.data as string);
          } catch {
            return;
          }

          if (msg.type === 'session_ready') {
            if (!settled) {
              settled = true;
              setConnectionState(options?.skipInitialGreeting ? 'ready' : 'speaking');
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
            if (rid && playedReplyIdsRef.current.has(rid)) {
              return;
            }
            if (!isDemoPlaybackRef.current) {
              setAiFeedback(msg.text);
              if (
                !unitConfigRef.current?.assessmentTasks.length &&
                /(?:finished|completed|done with)\s+(?:this|our|today'?s|the)?\s*(?:speaking\s+)?practice|(?:practice|session)\s+is\s+(?:finished|completed|complete|done|over)|这次练习完成了|本次练习已完成|练习已完成/i.test(
                  msg.text
                )
              ) {
                setIsPracticeCompleted(true);
                if (pendingTurnPayloadRef.current) {
                  const { replyId: pendingRid, payload, countOutcome } =
                    pendingTurnPayloadRef.current;
                  pendingTurnPayloadRef.current = null;
                  if (!pendingRid || !processedUpdateReplyIdsRef.current.has(pendingRid)) {
                    if (pendingRid) {
                      processedUpdateReplyIdsRef.current.add(pendingRid);
                    }
                    applyTurnRecord(
                      { ...payload, isPracticeCompleted: true },
                      countOutcome,
                      msg.text,
                      inputTranscriptRef.current
                    );
                  }
                }
              }
            }
            return;
          }

          if (msg.type === 'audio' && typeof msg.data === 'string') {
            const rid = typeof msg.replyId === 'string' ? msg.replyId : '';
            // Enforce single automatic playback per reply ID
            if (rid && playedReplyIdsRef.current.has(rid)) {
              return;
            }
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

          if (msg.type === 'pedagogical_update' && msg.payload) {
            const rid = typeof msg.replyId === 'string' ? msg.replyId : '';
            if (rid && processedUpdateReplyIdsRef.current.has(rid)) {
              return;
            }
            const payload = msg.payload as PedagogicalUpdatePayload;
            const countOutcome = Boolean(msg.countOutcome);
            if (payload.isPracticeCompleted) {
              if (rid) processedUpdateReplyIdsRef.current.add(rid);
              pendingTurnPayloadRef.current = null;
              setIsPracticeCompleted(true);
              applyTurnRecord(payload, countOutcome, '', inputTranscriptRef.current);
              return;
            }
            pendingTurnPayloadRef.current = {
              replyId: rid,
              payload,
              countOutcome,
            };
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
                setStudentTranscript(inText);
              }
              return;
            }

            if (isDemoPlaybackRef.current) {
              if (rid && currentTurnAudioChunksRef.current.length > 0) {
                playedReplyIdsRef.current.add(rid);
              }
              currentTurnAudioChunksRef.current = [];
              isDemoPlaybackRef.current = false;
              if (activeSourcesRef.current.size === 0) {
                setConnectionState('ready');
              }
              return;
            }

            if (currentTurnAudioChunksRef.current.length > 0) {
              lastCompletedAudioChunksRef.current = [...currentTurnAudioChunksRef.current];
              currentTurnAudioChunksRef.current = [];
              if (rid) {
                playedReplyIdsRef.current.add(rid);
              }
              setCanReplayAudio(true);
            }

            if (outText && !(rid && playedReplyIdsRef.current.has(rid) && !lastCompletedAudioChunksRef.current.length)) {
              setAiFeedback(outText);
            }
            if (inText) {
              setStudentTranscript(inText);
            }

            if (pendingTurnPayloadRef.current) {
              const { replyId: pendingRid, payload, countOutcome } =
                pendingTurnPayloadRef.current;
              pendingTurnPayloadRef.current = null;
              if (!pendingRid || !processedUpdateReplyIdsRef.current.has(pendingRid)) {
                if (pendingRid) {
                  processedUpdateReplyIdsRef.current.add(pendingRid);
                }
                applyTurnRecord(payload, countOutcome, outText, inText);
              }
            }

            if (activeSourcesRef.current.size === 0) {
              setConnectionState('ready');
            }
            return;
          }

          if (msg.type === 'error') {
            const errMsg =
              typeof msg.message === 'string' ? msg.message : '语音连接发生错误。';
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
          const errMsg = '无法连接实时语音服务，请检查网络后重试。';
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
    [applyTurnRecord, closeConnection, scheduleAudioChunk, stopAllPlayback]
  );

  // Reset state whenever unitConfig or practiceFocus changes
  useEffect(() => {
    closeConnection();
    setErrorMessage(null);
    setAiFeedback('');
    setStudentTranscript('');
    setIsChineseOpen(false);
    setHintStage('none');
    setSelectedPhrase(null);
    setGrammarCorrection(null);
    setDemoSentence(null);
    setHasUsedHintForQuestion(false);
    setHasGrammarCorrectionInQuestion(false);
    setCanReplayAudio(false);
    setIsPracticeCompleted(false);
    isDemoPlaybackRef.current = false;
    lastCompletedAudioChunksRef.current = [];
    currentTurnAudioChunksRef.current = [];
    playedReplyIdsRef.current.clear();
    processedUpdateReplyIdsRef.current.clear();
    pendingTurnPayloadRef.current = null;
    inputTranscriptRef.current = '';

    if (practiceFocus) {
      setCurrentQuestion(practiceFocus.prompt);
      setCurrentQuestionChinese(practiceFocus.promptChinese);
      setCurrentPhraseChoices(practiceFocus.phraseChoices);
      setCurrentSentenceStarter(practiceFocus.sentenceStarter);
    } else if (unitConfig) {
      setCurrentQuestion(unitConfig.initialQuestion);
      setCurrentQuestionChinese(unitConfig.initialQuestionChinese);
      setCurrentPhraseChoices(unitConfig.initialPhraseChoices);
      setCurrentSentenceStarter(unitConfig.initialSentenceStarter);
    } else {
      setCurrentQuestion('');
      setCurrentQuestionChinese('');
      setCurrentPhraseChoices([]);
      setCurrentSentenceStarter('');
    }
    setStats({
      independentCorrect: 0,
      assistedCorrect: 0,
      correctedComplete: 0,
      needsRetry: 0,
    });
    setLogs([]);
  }, [unitConfig, practiceFocus, closeConnection]);

  useEffect(() => {
    return () => {
      closeConnection();
    };
  }, [closeConnection]);

  const playQuestionAudio = useCallback(async () => {
    if (!unitConfigRef.current) return;
    setErrorMessage(null);
    await ensureOutputAudioCtx();
    isDemoPlaybackRef.current = false;

    if (lastCompletedAudioChunksRef.current.length > 0) {
      stopAllPlayback();
      setConnectionState('speaking');
      for (const chunk of lastCompletedAudioChunksRef.current) {
        await scheduleAudioChunk(chunk);
      }
      return;
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      await connectSession({ skipInitialGreeting: false });
      return;
    }

    stopAllPlayback();
    currentTurnAudioChunksRef.current = [];
    setConnectionState('speaking');
    wsRef.current.send(
      JSON.stringify({
        type: 'replay_question',
        currentQuestion: currentQuestionRef.current || unitConfigRef.current.initialQuestion,
      })
    );
  }, [connectSession, ensureOutputAudioCtx, scheduleAudioChunk, stopAllPlayback]);

  const playDemoSentence = useCallback(
    async (text: string) => {
      if (!unitConfigRef.current || !text.trim()) return;
      setErrorMessage(null);
      await ensureOutputAudioCtx();

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await connectSession({ skipInitialGreeting: true });
      }

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      stopAllPlayback();
      currentTurnAudioChunksRef.current = [];
      isDemoPlaybackRef.current = true;
      setConnectionState('speaking');
      wsRef.current.send(
        JSON.stringify({
          type: 'speak_demo',
          text: text.trim(),
        })
      );
    },
    [connectSession, ensureOutputAudioCtx, stopAllPlayback]
  );

  const startSpeaking = useCallback(async () => {
    if (!unitConfigRef.current) return;
    setErrorMessage(null);

    try {
      await ensureOutputAudioCtx();
      stopAllPlayback();
      isDemoPlaybackRef.current = false;

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await connectSession({ skipInitialGreeting: true });
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

      preRollChunksRef.current = [];
      hasSentActivityStartRef.current = false;
      speechFramesCountRef.current = 0;
      recordingStartTimeRef.current = Date.now();
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

        if (rms > 0.01) {
          speechFramesCountRef.current += 1;
        }

        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        if (!hasSentActivityStartRef.current) {
          preRollChunksRef.current.push(base64);
          if (preRollChunksRef.current.length > 8) {
            preRollChunksRef.current.shift();
          }

          if (speechFramesCountRef.current >= 1) {
            hasSentActivityStartRef.current = true;
            ws.send(
              JSON.stringify({
                type: 'activity_start',
                hintUsedInTurn: hasUsedHintRef.current,
              })
            );
            for (const buffered of preRollChunksRef.current) {
              ws.send(JSON.stringify({ type: 'audio', data: buffered }));
            }
            preRollChunksRef.current = [];
          }
        } else {
          ws.send(JSON.stringify({ type: 'audio', data: base64 }));
        }
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);
    } catch (err) {
      stopMicCapture();
      const message =
        err instanceof Error && err.name === 'NotAllowedError'
          ? '请先在浏览器中允许使用麦克风权限，然后再点击「开始说」。'
          : err instanceof Error
            ? err.message
            : '无法开启麦克风，请检查设备连接后重试。';
      setErrorMessage(message);
      setConnectionState('ready');
    }
  }, [connectSession, ensureOutputAudioCtx, stopAllPlayback, stopMicCapture]);

  const finishSpeaking = useCallback(() => {
    const durationMs = Date.now() - recordingStartTimeRef.current;
    const hadSpeech =
      hasSentActivityStartRef.current &&
      speechFramesCountRef.current >= 2 &&
      durationMs >= 300;

    stopMicCapture();
    currentTurnAudioChunksRef.current = [];
    isDemoPlaybackRef.current = false;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setConnectionState('ready');
      return;
    }

    setConnectionState('processing');
    if (hadSpeech) {
      ws.send(
        JSON.stringify({
          type: 'activity_end',
          hintUsedInTurn: hasUsedHintRef.current,
        })
      );
    } else {
      ws.send(
        JSON.stringify({
          type: 'blank_audio',
          currentQuestion: currentQuestionRef.current,
        })
      );
    }
  }, [stopMicCapture]);

  const cancelSpeaking = useCallback(async () => {
    const alreadyStreamed = hasSentActivityStartRef.current;
    stopMicCapture();
    preRollChunksRef.current = [];
    hasSentActivityStartRef.current = false;

    if (alreadyStreamed) {
      await connectSession({ skipInitialGreeting: true }).catch(() => {});
    } else {
      setConnectionState(
        wsRef.current?.readyState === WebSocket.OPEN ? 'ready' : 'disconnected'
      );
    }
  }, [connectSession, stopMicCapture]);

  const toggleChineseMeaning = useCallback(() => {
    setIsChineseOpen((prev) => !prev);
  }, []);

  const openHints = useCallback(() => {
    setHasUsedHintForQuestion(true);
    setHintStage((prev) => (prev === 'none' ? 'phrases' : prev));
  }, []);

  const revealStarter = useCallback(() => {
    setHasUsedHintForQuestion(true);
    setHintStage('phrases_and_starter');
  }, []);

  const selectPhraseHint = useCallback((phrase: string) => {
    setHasUsedHintForQuestion(true);
    setSelectedPhrase(phrase);
    setHintStage('phrases_and_starter');
  }, []);

  const resetPractice = useCallback(() => {
    closeConnection();
    setStats({
      independentCorrect: 0,
      assistedCorrect: 0,
      correctedComplete: 0,
      needsRetry: 0,
    });
    setLogs([]);
    setAiFeedback('');
    setStudentTranscript('');
    setIsChineseOpen(false);
    setHintStage('none');
    setSelectedPhrase(null);
    setGrammarCorrection(null);
    setDemoSentence(null);
    setHasUsedHintForQuestion(false);
    setHasGrammarCorrectionInQuestion(false);
    setCanReplayAudio(false);
    setIsPracticeCompleted(false);
    isDemoPlaybackRef.current = false;
    lastCompletedAudioChunksRef.current = [];
    playedReplyIdsRef.current.clear();
    processedUpdateReplyIdsRef.current.clear();
    inputTranscriptRef.current = '';
    if (practiceFocus) {
      setCurrentQuestion(practiceFocus.prompt);
      setCurrentQuestionChinese(practiceFocus.promptChinese);
      setCurrentPhraseChoices(practiceFocus.phraseChoices);
      setCurrentSentenceStarter(practiceFocus.sentenceStarter);
    } else if (unitConfigRef.current) {
      setCurrentQuestion(unitConfigRef.current.initialQuestion);
      setCurrentQuestionChinese(unitConfigRef.current.initialQuestionChinese);
      setCurrentPhraseChoices(unitConfigRef.current.initialPhraseChoices);
      setCurrentSentenceStarter(unitConfigRef.current.initialSentenceStarter);
    }
  }, [closeConnection, practiceFocus]);

  return {
    state: {
      connectionState,
      currentQuestion,
      currentQuestionChinese,
      currentPhraseChoices,
      currentSentenceStarter,
      isChineseOpen,
      hintStage,
      selectedPhrase,
      grammarCorrection,
      demoSentence,
      aiFeedback,
      studentTranscript,
      hasUsedHintForQuestion,
      micLevel,
      errorMessage,
      stats,
      logs,
      canReplayAudio,
      isPracticeCompleted,
    } satisfies LiveTutorState,
    actions: {
      playQuestionAudio,
      playDemoSentence,
      startSpeaking,
      finishSpeaking,
      cancelSpeaking,
      toggleChineseMeaning,
      openHints,
      revealStarter,
      selectPhraseHint,
      resetPractice,
      closeConnection,
    },
  };
}
