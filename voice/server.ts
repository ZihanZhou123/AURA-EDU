import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import {
  buildAssessmentSystemInstruction,
  buildSystemInstruction,
  recordAssessmentTurnDeclaration,
  recordPedagogicalTurnDeclaration,
  validateServerAssessmentTask,
  validateServerUnitConfig,
  type ServerAssessmentTask,
  type ServerUnitConfig,
} from './server/pedagogy.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const LIVE_MODEL = 'gemini-3.8-live';

function createGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

type ClientWsMessage =
  | {
      type: 'init';
      mode?: 'practice' | 'assessment';
      unitConfig: unknown;
      task?: unknown;
      isFollowUp?: boolean;
      skipInitialGreeting?: boolean;
      currentQuestion?: string;
    }
  | { type: 'activity_start'; hintUsedInTurn?: boolean }
  | { type: 'audio'; data: string }
  | { type: 'activity_end'; hintUsedInTurn?: boolean }
  | { type: 'blank_audio'; currentQuestion?: string }
  | { type: 'replay_question'; currentQuestion: string }
  | { type: 'speak_demo'; text: string }
  | { type: 'close' };

function safeSend(ws: WebSocket, payload: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function normalizeQuestionText(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/[?.!,]+$/g, '')
    .replace(/\s+/g, ' ');
}

function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  const n = typeof val === 'number' ? Math.round(val) : Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  const portfolioRoot = path.resolve(__dirname, '..');
  app.get('/', (_req, res) => res.redirect('/index.html'));
  app.get(/^\/[a-zA-Z0-9_-]+\.html$/, (req, res, next) => {
    res.sendFile(req.path.slice(1), { root: portfolioRoot }, (error) => {
      if (error) next(error);
    });
  });
  for (const directory of ['assets', 'audio', 'css', 'js']) {
    app.use('/' + directory, express.static(path.join(portfolioRoot, directory)));
  }
  app.use('/unit', express.static(path.resolve(__dirname, '../unit')));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, model: LIVE_MODEL, hasKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/live' });

  wss.on('connection', (clientWs) => {
    let liveSession: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
    let activeUnit: ServerUnitConfig | null = null;
    let activeMode: 'practice' | 'assessment' = 'practice';
    let practiceIndex = 0;
    let practiceReplyId = '';
    let activeTask: ServerAssessmentTask | null = null;
    let isClosing = false;
    let clientHintUsedForTurn = false;
    let hasGrammarCorrectionInQuestion = false;
    let currentQuestionState = {
      question: '',
      questionChinese: '',
      phraseChoices: [] as string[],
      sentenceStarter: '',
    };
    let suppressNextOutcome = false;
    let currentOutputTranscript = '';
    let currentInputTranscript = '';
    let toolCalledThisTurn = false;
    let pendingAssessment = false;
    let retriedAssessment = false;
    let replySeq = 0;
    let currentReplyId = '';
    let replyAudioStarted = false;
    let replyAudioFinalized = false;
    let audioChunksInCurrentGeneration = 0;

    const beginNewReply = () => {
      replySeq += 1;
      currentReplyId = `reply-${replySeq}`;
      replyAudioStarted = false;
      replyAudioFinalized = false;
      audioChunksInCurrentGeneration = 0;
      currentOutputTranscript = '';
      toolCalledThisTurn = false;
      return currentReplyId;
    };

    const cleanupSession = () => {
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // Ignore close errors
        }
        liveSession = null;
      }
    };

    clientWs.on('close', () => {
      isClosing = true;
      cleanupSession();
    });

    clientWs.on('message', async (rawData) => {
      let msg: ClientWsMessage;
      try {
        msg = JSON.parse(rawData.toString()) as ClientWsMessage;
      } catch {
        safeSend(clientWs, { type: 'error', message: '无效的消息格式。' });
        return;
      }

      if (msg.type === 'init') {
        const validated = validateServerUnitConfig(msg.unitConfig);
        if (!validated) {
          safeSend(clientWs, {
            type: 'error',
            message: '尚未载入有效单元配置，无法启动语音会话。',
          });
          return;
        }

        const requestedMode = msg.mode === 'assessment' ? 'assessment' : 'practice';
        let validatedTask: ServerAssessmentTask | null = null;
        if (requestedMode === 'assessment') {
          validatedTask = validateServerAssessmentTask(msg.task);
          if (!validatedTask) {
            safeSend(clientWs, {
              type: 'error',
              message: '测评题目配置无效，请重试。',
            });
            return;
          }
        }

        cleanupSession();
        activeUnit = validated;
        activeMode = requestedMode;
        activeTask = validatedTask;
        pendingAssessment = false;
        retriedAssessment = false;
        const restoredIndex = validated.assessmentTasks?.findIndex(task =>
          normalizeQuestionText(task.prompt) === normalizeQuestionText(msg.currentQuestion || '')
        ) ?? -1;
        practiceIndex = Math.max(0, restoredIndex);
        if (requestedMode === 'practice' && msg.currentQuestion && restoredIndex < 0 &&
          normalizeQuestionText(msg.currentQuestion) !== normalizeQuestionText(validated.initialQuestion)) {
          validated.assessmentTasks = [];
        }
        practiceReplyId = '';
        clientHintUsedForTurn = false;
        hasGrammarCorrectionInQuestion = false;

        currentQuestionState =
          requestedMode === 'assessment' && validatedTask
            ? {
                question: validatedTask.prompt,
                questionChinese: validatedTask.promptChinese,
                phraseChoices: [...validatedTask.phraseChoices],
                sentenceStarter: validatedTask.sentenceStarter,
              }
            : {
                question:
                  typeof msg.currentQuestion === 'string' && msg.currentQuestion.trim()
                    ? msg.currentQuestion.trim()
                    : validated.initialQuestion,
                questionChinese: validated.initialQuestionChinese,
                phraseChoices: [...validated.initialPhraseChoices],
                sentenceStarter: validated.initialSentenceStarter,
              };

        suppressNextOutcome = false;
        currentOutputTranscript = '';
        currentInputTranscript = '';
        toolCalledThisTurn = false;
        currentReplyId = '';
        replyAudioStarted = false;
        replyAudioFinalized = false;
        audioChunksInCurrentGeneration = 0;

        try {
          const ai = createGenAIClient();
          const systemInstruction =
            requestedMode === 'assessment' && validatedTask
              ? buildAssessmentSystemInstruction(
                  validated,
                  validatedTask,
                  Boolean(msg.isFollowUp)
                )
              : buildSystemInstruction(validated);

          const declaration =
            requestedMode === 'assessment'
              ? recordAssessmentTurnDeclaration
              : recordPedagogicalTurnDeclaration;

          liveSession = await ai.live.connect({
            model: LIVE_MODEL,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                },
              },
              realtimeInputConfig: {
                automaticActivityDetection: {
                  disabled: true,
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              tools: [{ functionDeclarations: [declaration] }],
              systemInstruction,
            },
            callbacks: {
              onopen: () => {
                // Wait until ai.live.connect resolves and liveSession is assigned
              },
              onmessage: (message: LiveServerMessage) => {
                if (isClosing) return;

                const content = message.serverContent;

                if (content?.inputTranscription?.text) {
                  currentInputTranscript += content.inputTranscription.text;
                  safeSend(clientWs, {
                    type: 'input_transcript',
                    text: currentInputTranscript.trim(),
                  });
                }

                const isDuplicateReplyAudio =
                  Boolean(currentReplyId) && replyAudioFinalized;

                if (content?.outputTranscription?.text && !isDuplicateReplyAudio) {
                  if (!currentReplyId) beginNewReply();
                  currentOutputTranscript += content.outputTranscription.text;
                  safeSend(clientWs, {
                    type: 'output_transcript',
                    replyId: currentReplyId,
                    text: currentOutputTranscript.trim(),
                  });
                }

                for (const part of content?.modelTurn?.parts ?? []) {
                  if (part.inlineData?.data) {
                    if (!currentReplyId) beginNewReply();
                    if (replyAudioFinalized) {
                      continue;
                    }
                    replyAudioStarted = true;
                    audioChunksInCurrentGeneration += 1;
                    safeSend(clientWs, {
                      type: 'audio',
                      replyId: currentReplyId,
                      data: part.inlineData.data,
                    });
                  }
                }

                if (content?.interrupted) {
                  safeSend(clientWs, { type: 'interrupted', replyId: currentReplyId });
                }

                if (message.toolCall?.functionCalls?.length) {
                  const responses = [];
                  for (const call of message.toolCall.functionCalls) {
                    if (
                      activeMode === 'practice' &&
                      call.name === 'record_pedagogical_turn'
                    ) {
                      toolCalledThisTurn = true;
                      const args = (call.args ?? {}) as Record<string, unknown>;
                      const rawOutcome = String(args.outcome ?? 'unheard');
                      let outcome = rawOutcome;

                      const keepSameQuestion =
                        rawOutcome === 'unheard' ||
                        rawOutcome === 'grammar_correction' ||
                        rawOutcome === 'scaffolding_keyword' ||
                        rawOutcome === 'needs_retry';

                      let nextQuestion =
                        keepSameQuestion && currentQuestionState.question
                          ? currentQuestionState.question
                          : typeof args.nextQuestion === 'string' && args.nextQuestion.trim()
                            ? args.nextQuestion.trim()
                            : currentQuestionState.question ||
                              (activeUnit?.initialQuestion ?? '');

                      let questionChanged =
                        !keepSameQuestion &&
                        normalizeQuestionText(nextQuestion) !==
                          normalizeQuestionText(currentQuestionState.question);

                      if (suppressNextOutcome) {
                        outcome = 'unheard';
                      } else if (
                        outcome === 'independent_correct' ||
                        outcome === 'assisted_correct' ||
                        outcome === 'corrected_complete'
                      ) {
                        if (hasGrammarCorrectionInQuestion) {
                          outcome = 'corrected_complete';
                        } else if (
                          clientHintUsedForTurn &&
                          outcome === 'independent_correct'
                        ) {
                          outcome = 'assisted_correct';
                        }
                      }

                      if (!suppressNextOutcome && outcome === 'grammar_correction') {
                        hasGrammarCorrectionInQuestion = true;
                      }

                      let nextQuestionChinese =
                        typeof args.nextQuestionChinese === 'string' &&
                        args.nextQuestionChinese.trim()
                          ? args.nextQuestionChinese.trim()
                          : questionChanged
                            ? ''
                            : currentQuestionState.questionChinese;

                      let nextPhraseChoices =
                        Array.isArray(args.nextPhraseChoices) &&
                        args.nextPhraseChoices.length > 0
                          ? args.nextPhraseChoices
                              .map((w) => String(w).trim())
                              .filter(Boolean)
                              .slice(0, 3)
                          : questionChanged
                            ? []
                            : currentQuestionState.phraseChoices;

                      let nextSentenceStarter =
                        typeof args.nextSentenceStarter === 'string' &&
                        args.nextSentenceStarter.trim()
                          ? args.nextSentenceStarter.trim()
                          : questionChanged
                            ? ''
                            : currentQuestionState.sentenceStarter;

                      const rawHintStage =
                        typeof args.hintStage === 'string' ? args.hintStage : 'none';
                      let hintStage = questionChanged ? 'none' : rawHintStage;

                      let isPracticeCompleted =
                        Boolean(args.isPracticeCompleted) &&
                        !suppressNextOutcome &&
                        (outcome === 'independent_correct' ||
                          outcome === 'assisted_correct' ||
                          outcome === 'corrected_complete');

                      const targets = activeUnit?.assessmentTasks ?? [];
                      if (targets.length) {
                        if (!currentReplyId) beginNewReply();
                        const accepted = !suppressNextOutcome && !keepSameQuestion &&
                          ['independent_correct', 'assisted_correct', 'corrected_complete'].includes(outcome);
                        if (accepted && practiceReplyId !== currentReplyId) {
                          practiceReplyId = currentReplyId;
                          practiceIndex = Math.min(practiceIndex + 1, targets.length);
                        }
                        const nextTarget = targets[practiceIndex];
                        isPracticeCompleted = accepted && !nextTarget;
                        if (nextTarget) {
                          nextQuestion = nextTarget.prompt;
                          nextQuestionChinese = nextTarget.promptChinese;
                          nextPhraseChoices = nextTarget.phraseChoices;
                          nextSentenceStarter = nextTarget.sentenceStarter;
                        }
                        questionChanged = nextQuestion !== currentQuestionState.question;
                        if (questionChanged) hintStage = 'none';
                      }

                      const payload = {
                        studentTranscriptSummary:
                          typeof args.studentTranscriptSummary === 'string'
                            ? args.studentTranscriptSummary
                            : currentInputTranscript.trim(),
                        outcome,
                        hintStage,
                        demoSentence:
                          typeof args.demoSentence === 'string' && args.demoSentence.trim()
                            ? args.demoSentence.trim()
                            : undefined,
                        grammarExplanationCn:
                          outcome === 'grammar_correction' &&
                          typeof args.grammarExplanationCn === 'string'
                            ? args.grammarExplanationCn.trim()
                            : undefined,
                        correctedExample:
                          outcome === 'grammar_correction' &&
                          typeof args.correctedExample === 'string'
                            ? args.correctedExample.trim()
                            : undefined,
                        nextQuestion,
                        nextQuestionChinese,
                        nextPhraseChoices,
                        nextSentenceStarter,
                        isPracticeCompleted,
                      };

                      currentQuestionState = {
                        question: nextQuestion,
                        questionChinese: nextQuestionChinese,
                        phraseChoices: nextPhraseChoices,
                        sentenceStarter: nextSentenceStarter,
                      };

                      if (
                        questionChanged ||
                        outcome === 'independent_correct' ||
                        outcome === 'assisted_correct' ||
                        outcome === 'corrected_complete'
                      ) {
                        hasGrammarCorrectionInQuestion = false;
                        clientHintUsedForTurn = false;
                      }

                      if (!currentReplyId) beginNewReply();
                      safeSend(clientWs, {
                        type: 'pedagogical_update',
                        replyId: currentReplyId,
                        payload,
                        countOutcome: !suppressNextOutcome,
                      });

                      const alreadyDeliveredAudio =
                        replyAudioStarted || replyAudioFinalized;
                      responses.push({
                        id: call.id,
                        name: call.name,
                        response: {
                          ok: true,
                          recordedOutcome: outcome,
                          nextQuestion,
                          isPracticeCompleted,
                          alreadySpokenToStudent: alreadyDeliveredAudio,
                          instruction: alreadyDeliveredAudio
                            ? 'Your audio reply for this turn was already delivered. Do NOT speak again.'
                            : isPracticeCompleted
                              ? 'Now give one brief closing message.'
                              : 'Respond once. If advancing, ask exactly nextQuestion. Otherwise give one hint for the current question.',
                        },
                      });
                    } else if (
                      activeMode === 'assessment' &&
                      call.name === 'record_assessment_turn'
                    ) {
                      const countAttempt = pendingAssessment && !suppressNextOutcome;
                      if (countAttempt) pendingAssessment = false;
                      toolCalledThisTurn = true;
                      const args = (call.args ?? {}) as Record<string, unknown>;
                      const validScores = [args.relevanceScore, args.objectiveScore, args.clarityScore]
                        .every((score, index) => typeof score === 'number' &&
                          Number.isInteger(score) && score >= 0 && score <= (index === 2 ? 1 : 2));
                      const isUnheard = args.isUnheard === true || !validScores || suppressNextOutcome;
                      const relevanceScore = isUnheard
                        ? 0
                        : clampInt(args.relevanceScore, 0, 2, 0);
                      const objectiveScore = isUnheard
                        ? 0
                        : clampInt(args.objectiveScore, 0, 2, 0);
                      const clarityScore = isUnheard
                        ? 0
                        : clampInt(args.clarityScore, 0, 1, 0);

                      const payload = {
                        studentTranscriptSummary:
                          typeof args.studentTranscriptSummary === 'string' &&
                          args.studentTranscriptSummary.trim()
                            ? args.studentTranscriptSummary.trim()
                            : currentInputTranscript.trim() || '[unheard]',
                        isUnheard,
                        relevanceScore,
                        objectiveScore,
                        clarityScore,
                        shouldAskFollowUp: false,
                        followUpPromptEn:
                          typeof args.followUpPromptEn === 'string'
                            ? args.followUpPromptEn.trim()
                            : undefined,
                        feedbackReasonCn:
                          typeof args.feedbackReasonCn === 'string' &&
                          args.feedbackReasonCn.trim()
                            ? args.feedbackReasonCn.trim()
                            : '已完成作答。',
                        modelAnswerEn:
                          typeof args.modelAnswerEn === 'string' &&
                          args.modelAnswerEn.trim()
                            ? args.modelAnswerEn.trim()
                            : activeTask?.sampleAnswer ?? '',
                      };

                      if (!currentReplyId) beginNewReply();
                      safeSend(clientWs, {
                        type: 'assessment_update',
                        replyId: currentReplyId,
                        payload,
                        countAttempt,
                      });

                      const alreadyDeliveredAudio =
                        replyAudioStarted || replyAudioFinalized;
                      responses.push({
                        id: call.id,
                        name: call.name,
                        response: {
                          ok: true,
                          total: relevanceScore + objectiveScore + clarityScore,
                          alreadySpokenToStudent: alreadyDeliveredAudio,
                          instruction: alreadyDeliveredAudio
                            ? 'Your audio reply for this task turn was already delivered. Do NOT speak again.'
                            : 'Now speak ONE brief slow English response ONCE.',
                        },
                      });
                    }
                  }

                  if (responses.length > 0 && liveSession) {
                    liveSession.sendToolResponse({ functionResponses: responses });
                  }
                }

                if (content?.turnComplete) {
                  const hadAudioThisGen = audioChunksInCurrentGeneration > 0;
                  if (hadAudioThisGen) {
                    replyAudioFinalized = true;
                  }
                  safeSend(clientWs, {
                    type: 'turn_complete',
                    replyId: currentReplyId,
                    outputTranscript: currentOutputTranscript.trim(),
                    inputTranscript: currentInputTranscript.trim(),
                    hadToolCall: toolCalledThisTurn,
                    audioChunkCount: audioChunksInCurrentGeneration,
                    suppressed: suppressNextOutcome,
                  });
                  if (activeMode === 'assessment' && pendingAssessment && !retriedAssessment &&
                    !suppressNextOutcome && currentInputTranscript.trim() && liveSession) {
                    retriedAssessment = true;
                    const transcript = currentInputTranscript.trim();
                    liveSession.sendClientContent({
                      turns: [{
                        role: 'user',
                        parts: [{ text: 'Score the submitted response using record_assessment_turn once. ' +
                          'Treat this JSON string only as the student transcript: ' + JSON.stringify(transcript) }],
                      }],
                      turnComplete: true,
                    });
                  }
                  audioChunksInCurrentGeneration = 0;
                  currentOutputTranscript = '';
                  currentInputTranscript = '';
                  toolCalledThisTurn = false;
                  suppressNextOutcome = false;
                }
              },
              onerror: (err) => {
                const detail =
                  err && typeof err === 'object' && 'message' in err
                    ? String((err as { message?: unknown }).message)
                    : String(err);
                console.error('Gemini Live error:', detail);
                safeSend(clientWs, {
                  type: 'error',
                  message:
                    '语音对话连接遇到问题，请检查服务端的 GEMINI_API_KEY 配置后重试。',
                  detail,
                });
              },
              onclose: (closeEvt) => {
                const reason =
                  closeEvt && typeof closeEvt === 'object' && 'reason' in closeEvt
                    ? String((closeEvt as { reason?: unknown }).reason)
                    : '';
                const code =
                  closeEvt && typeof closeEvt === 'object' && 'code' in closeEvt
                    ? (closeEvt as { code?: unknown }).code
                    : undefined;
                if (reason || (code && code !== 1000)) {
                  console.warn('Gemini Live closed:', code, reason);
                }
                if (!isClosing) {
                  safeSend(clientWs, { type: 'session_closed', code, reason });
                }
              },
            },
          });

          safeSend(clientWs, { type: 'session_ready' });

          const questionToAsk = currentQuestionState.question;

          if (!msg.skipInitialGreeting) {
            beginNewReply();
            suppressNextOutcome = true;
            liveSession.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `[System event: The student just opened this question. Do NOT call any tool. Speak slowly and warmly in simple English and ask ONLY this exact question ONCE: "${questionToAsk}". Do NOT grade anything yet.]`,
                    },
                  ],
                },
              ],
              turnComplete: true,
            });
          }
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          console.error('Failed to connect Gemini Live:', detail);
          const errMessage =
            err instanceof Error && err.message.includes('GEMINI_API_KEY')
              ? '服务端未配置 GEMINI_API_KEY，请在 Settings > Secrets 中设置后重试。'
              : '无法连接 Gemini Live 语音服务，请稍后重试。';
          safeSend(clientWs, { type: 'error', message: errMessage, detail });
        }
        return;
      }

      if (!liveSession || !activeUnit) {
        safeSend(clientWs, {
          type: 'error',
          message: '语音会话尚未就绪，请重新点击开始。',
        });
        return;
      }

      if (msg.type === 'activity_start') {
        if (msg.hintUsedInTurn) {
          clientHintUsedForTurn = true;
        }
        suppressNextOutcome = false;
        currentInputTranscript = '';
        beginNewReply();
        liveSession.sendRealtimeInput({ activityStart: {} });
        return;
      }

      if (msg.type === 'audio' && typeof msg.data === 'string') {
        liveSession.sendRealtimeInput({
          audio: {
            data: msg.data,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
        return;
      }

      if (msg.type === 'activity_end') {
        if (msg.hintUsedInTurn) {
          clientHintUsedForTurn = true;
        }
        if (activeMode === 'assessment') {
          pendingAssessment = true;
          retriedAssessment = false;
        }
        liveSession.sendRealtimeInput({ activityEnd: {} });
        return;
      }

      if (msg.type === 'blank_audio') {
        beginNewReply();
        suppressNextOutcome = true;
        currentInputTranscript = '';
        const q =
          typeof msg.currentQuestion === 'string' && msg.currentQuestion.trim()
            ? msg.currentQuestion.trim()
            : currentQuestionState.question || activeUnit.initialQuestion;

        liveSession.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [
                {
                  text: `[System event: The student tapped Start Speaking and Done Speaking, but the recording was silent or blank. Do NOT deduct points, do NOT mark as a grammar error, and do NOT advance. Do NOT call any tool. Speak slowly in simple English ONLY ONCE: "Sorry, I didn't hear anything. Please try again." Keep the exact same question "${q}".]`,
                },
              ],
            },
          ],
          turnComplete: true,
        });
        return;
      }

      if (msg.type === 'replay_question') {
        beginNewReply();
        suppressNextOutcome = true;
        const q =
          typeof msg.currentQuestion === 'string' && msg.currentQuestion.trim()
            ? msg.currentQuestion.trim()
            : currentQuestionState.question || activeUnit.initialQuestion;

        liveSession.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [
                {
                  text: `[System event: The student clicked Replay Question. Do NOT call any tool. Repeat ONLY this exact question slowly and clearly in English ONCE: "${q}".]`,
                },
              ],
            },
          ],
          turnComplete: true,
        });
        return;
      }

      if (msg.type === 'speak_demo' && typeof msg.text === 'string' && msg.text.trim()) {
        beginNewReply();
        suppressNextOutcome = true;
        const demoText = msg.text.trim().slice(0, 200);

        liveSession.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [
                {
                  text: `[System event: The student clicked Listen to Example. Do NOT call any tool, do NOT grade, and do NOT change the question. Simply read ONLY this model sentence slowly and clearly in English ONCE: "${demoText}".]`,
                },
              ],
            },
          ],
          turnComplete: true,
        });
        return;
      }

      if (msg.type === 'close') {
        cleanupSession();
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`AURA EDU server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});