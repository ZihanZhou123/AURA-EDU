import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Languages,
  Lightbulb,
  Loader2,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  Target,
  Volume2,
} from 'lucide-react';
import type { LiveTutorState } from '../hooks/useLiveTutor';
import type { PracticeFocusOverride, UnitConfig } from '../types/aura';

interface StudentStageProps {
  unitConfig: UnitConfig | null;
  tutorState: LiveTutorState;
  onPlayQuestion: () => void;
  onPlayDemoSentence: (text: string) => void;
  onStartSpeaking: () => void;
  onFinishSpeaking: () => void;
  onCancelSpeaking: () => void;
  onToggleChinese: () => void;
  onOpenHints: () => void;
  onRevealStarter: () => void;
  onSelectPhrase: (phrase: string) => void;
  onOpenConfigDrawer: () => void;
  onBackHome?: () => void;
  onFinishPractice?: () => void;
  practiceFocus?: PracticeFocusOverride | null;
  onClearFocus?: () => void;
}

export function StudentStage({
  unitConfig,
  tutorState,
  onPlayQuestion,
  onPlayDemoSentence,
  onStartSpeaking,
  onFinishSpeaking,
  onCancelSpeaking,
  onToggleChinese,
  onOpenHints,
  onRevealStarter,
  onSelectPhrase,
  onOpenConfigDrawer,
  onBackHome,
  onFinishPractice,
  practiceFocus,
  onClearFocus,
}: StudentStageProps) {
  const [imgError, setImgError] = useState(false);
  const [isFinishingPractice, setIsFinishingPractice] = useState(false);

  useEffect(() => {
    if (!tutorState.isPracticeCompleted) {
      setIsFinishingPractice(false);
    }
  }, [tutorState.isPracticeCompleted]);

  if (!unitConfig) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-3xl items-center justify-center px-6 py-12">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            尚未载入单元
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            请等待 AURA EDU 传入年级、册别、单元、已学词汇、句型与学习目标后再开始口语练习。
          </p>
          <div className="mt-7">
            <button
              type="button"
              onClick={onOpenConfigDrawer}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              打开单元配置面板
            </button>
          </div>
        </section>
      </main>
    );
  }

  const {
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
    micLevel,
    errorMessage,
    canReplayAudio,
    isPracticeCompleted,
  } = tutorState;

  const isRecording = connectionState === 'recording';
  const isBusy =
    connectionState === 'connecting' ||
    connectionState === 'processing' ||
    connectionState === 'speaking';

  const normalizedQuestion = currentQuestion.trim();
  const normalizedFeedback = aiFeedback.trim();
  const showSeparateFeedback =
    Boolean(normalizedFeedback) &&
    normalizedFeedback.toLowerCase() !== normalizedQuestion.toLowerCase();

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-5xl flex-col justify-center gap-4 px-4 py-6 sm:px-6 lg:px-8">
      {(onBackHome || practiceFocus) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          {onBackHome ? (
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>返回说一说首页</span>
            </button>
          ) : (
            <span />
          )}

          {practiceFocus && (
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-sky-800">
                <Target className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                <span>
                  针对练习：{practiceFocus.objectiveTitle || practiceFocus.prompt}
                </span>
              </span>
              {onClearFocus && (
                <button
                  type="button"
                  onClick={onClearFocus}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                >
                  切回单元自由对话
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid w-full grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        {/* Left Column: 场景 */}
        <section
          aria-label="练习场景"
          className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-6"
        >
          <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
            {!imgError && unitConfig.scene.imageUrl ? (
              <img
                src={unitConfig.scene.imageUrl}
                alt={unitConfig.scene.title}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100 p-6 text-center">
                <BookOpen className="mb-2 h-8 w-8 text-sky-600" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-700">
                  {unitConfig.scene.title}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col justify-between gap-2 p-5 sm:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                {unitConfig.isPreviewTest && (
                  <>
                    <span className="text-sky-700">功能测试</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span>{unitConfig.grade}</span>
                <span aria-hidden="true">·</span>
                <span>{unitConfig.volume}</span>
                <span aria-hidden="true">·</span>
                <span>{unitConfig.topic}</span>
              </div>
              <h2 className="mt-1.5 text-base font-semibold text-slate-900">
                {unitConfig.scene.title}
              </h2>
              {unitConfig.scene.description && (
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {unitConfig.scene.description}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Right Column: 当前问题 + 语法纠错(如有) + 可选提示 + 麦克风按钮 */}
        <section
          aria-label="当前问题与口语交互"
          className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-6"
        >
          <div className="space-y-4">
            {/* 当前问题 */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  当前问题
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onToggleChinese}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 whitespace-nowrap shrink-0"
                  >
                    <Languages className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    <span>{isChineseOpen ? '收起中文' : '这句什么意思'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onPlayQuestion}
                    disabled={
                      isRecording ||
                      connectionState === 'connecting' ||
                      connectionState === 'processing'
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 whitespace-nowrap shrink-0"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                    <span>
                      {connectionState === 'speaking'
                        ? '正在朗读…'
                        : canReplayAudio
                          ? '再听一遍'
                          : '听问题'}
                    </span>
                  </button>
                </div>
              </div>

              {showSeparateFeedback && (
                <p className="mt-3 rounded-xl bg-slate-50 px-4 py-2.5 text-sm leading-relaxed text-slate-700">
                  {normalizedFeedback}
                </p>
              )}

              <p
                className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-[1.75rem]"
                style={{ textWrap: 'balance' }}
              >
                {normalizedQuestion || unitConfig.initialQuestion}
              </p>

              {isChineseOpen && currentQuestionChinese && (
                <p className="mt-1.5 text-sm font-medium text-sky-800">
                  中文意思：{currentQuestionChinese}
                </p>
              )}

              {studentTranscript && (
                <p className="mt-2.5 text-xs text-slate-500">
                  你刚才说：
                  <span className="font-medium text-slate-700">{studentTranscript}</span>
                </p>
              )}
            </div>

            {/* 练习已完成状态提示 */}
            {isPracticeCompleted && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-semibold text-emerald-900"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <span>练习已完成</span>
              </div>
            )}

            {/* 语法纠错卡（当前题有语法需要修改重说时显示，新问题或练习完成时清除） */}
            {!isPracticeCompleted && grammarCorrection && (
              <div
                role="status"
                aria-label="语法纠正提示"
                className="space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/75 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                    <Sparkles className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
                    <span>改一改再重说</span>
                  </div>
                  {grammarCorrection.correctedExample && (
                    <button
                      type="button"
                      onClick={() => onPlayDemoSentence(grammarCorrection.correctedExample)}
                      disabled={isRecording || isBusy}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100/60 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <Volume2 className="h-3 w-3" aria-hidden="true" />
                      <span>听示范</span>
                    </button>
                  )}
                </div>

                <p className="text-sm font-medium text-slate-900">
                  {grammarCorrection.explanationCn}
                </p>

                {grammarCorrection.correctedExample && (
                  <p className="rounded-lg border border-amber-200/80 bg-white px-3 py-2 text-sm font-semibold text-slate-900">
                    {grammarCorrection.correctedExample}
                  </p>
                )}

                <p className="text-xs text-amber-900">
                  请点击下方「开始说」，自己把正确的句子再说一遍。
                </p>
              </div>
            )}

            {!isPracticeCompleted && <div className="h-px bg-slate-100" />}

            {/* 可选提示卡：先词组，选词组或还需要帮助后再展示带空格句首 */}
            {!isPracticeCompleted && (
              <div
                aria-label="可选提示"
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
              >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                  <span>可选提示</span>
                </div>

                {hintStage === 'none' && (
                  <button
                    type="button"
                    onClick={onOpenHints}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 whitespace-nowrap shrink-0"
                  >
                    给我一点提示
                  </button>
                )}

                {hintStage === 'phrases' && (
                  <button
                    type="button"
                    onClick={onRevealStarter}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 whitespace-nowrap shrink-0"
                  >
                    还需要帮助？看句首
                  </button>
                )}
              </div>

              {hintStage === 'none' && (
                <p className="mt-2 text-xs text-slate-500">
                  可以直接开口回答；需要思路时，点击「给我一点提示」查看本道题的词组选项。
                </p>
              )}

              {(hintStage === 'phrases' || hintStage === 'phrases_and_starter') && (
                <div className="mt-3 space-y-3">
                  {demoSentence && !grammarCorrection && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                      <span className="font-medium text-slate-500">示范句：</span>
                      <span className="font-semibold text-slate-900">{demoSentence}</span>
                    </div>
                  )}

                  <div>
                    <div className="text-[11px] font-medium text-slate-500">
                      先选一个你想用的英文词组
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {currentPhraseChoices.length > 0 ? (
                        currentPhraseChoices.map((phrase) => {
                          const isSelected = selectedPhrase === phrase;
                          return (
                            <button
                              key={phrase}
                              type="button"
                              onClick={() => onSelectPhrase(phrase)}
                              className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 whitespace-nowrap shrink-0 ${
                                isSelected
                                  ? 'border-sky-600 bg-sky-50 text-sky-900'
                                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {phrase}
                            </button>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-500">
                          请结合已学词汇自由组织表达。
                        </span>
                      )}
                    </div>
                  </div>

                  {hintStage === 'phrases_and_starter' && (
                    <div className="border-t border-slate-200/80 pt-3">
                      <div className="text-[11px] font-medium text-slate-500">
                        英文句首（请用麦克风说出整句）
                      </div>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {currentSentenceStarter || 'I ______.'}
                      </p>
                      {selectedPhrase && (
                        <p className="mt-1.5 text-xs text-slate-600">
                          已选词组：
                          <span className="font-medium text-slate-800">{selectedPhrase}</span>
                          ，请点击下方「开始说」自己说出整句话。
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              </div>
            )}
          </div>

          {/* 麦克风控制区 / 练习完成结束按钮 */}
          <div className="space-y-3 pt-1">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isPracticeCompleted ? (
              <button
                type="button"
                disabled={isFinishingPractice}
                onClick={() => {
                  if (isFinishingPractice) return;
                  setIsFinishingPractice(true);
                  if (onFinishPractice) {
                    onFinishPractice();
                  } else if (onBackHome) {
                    onBackHome();
                  }
                }}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                <span>结束练习</span>
              </button>
            ) : !isRecording ? (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={onStartSpeaking}
                  disabled={isBusy}
                  className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-sky-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                      <span>
                        {connectionState === 'connecting'
                          ? '正在连接语音伙伴…'
                          : connectionState === 'processing'
                            ? '正在认真听你的回答…'
                            : '语音伙伴正在说话…'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5" aria-hidden="true" />
                      <span>开始说</span>
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-slate-500">
                  点击「开始说」后可停顿思考，确认回答完整后再点「说完了」
                </p>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-900">
                    <Mic className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    <span>正在收音，停顿思考也不会中断</span>
                  </div>

                  <div className="flex h-5 items-end gap-1" aria-hidden="true">
                    {[0.35, 0.65, 1, 0.8, 0.5].map((weight, idx) => {
                      const heightPct = Math.max(
                        20,
                        Math.min(100, Math.round(micLevel * weight * 100) + 18)
                      );
                      return (
                        <span
                          key={idx}
                          className="w-1 rounded-full bg-emerald-600 transition-transform duration-75"
                          style={{
                            height: '100%',
                            transform: `scaleY(${heightPct / 100})`,
                            transformOrigin: 'bottom',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onFinishSpeaking}
                    className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                    <span>说完了</span>
                  </button>

                  <button
                    type="button"
                    onClick={onCancelSpeaking}
                    className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    <span>重录</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
