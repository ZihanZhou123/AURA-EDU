import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Languages,
  Lightbulb,
  Loader2,
  Mic,
  Pause,
  RotateCcw,
  Square,
  Volume2,
} from 'lucide-react';
import type { AssessmentSessionState } from '../hooks/useAssessmentSession';
import type { UnitConfig } from '../types/aura';

interface AssessmentStageProps {
  unitConfig: UnitConfig;
  sessionState: AssessmentSessionState;
  onPlayPrompt: () => void;
  onToggleChinese: () => void;
  onOpenHints: () => void;
  onRevealStarter: () => void;
  onSelectPhrase: (phrase: string) => void;
  onStartSpeaking: () => void;
  onFinishSpeaking: () => void;
  onCancelSpeaking: () => void;
  onGoToTask: (index: number) => void;
  onPauseAndExit: () => void;
  onCompleteAssessment: () => void;
}

export function AssessmentStage({
  unitConfig,
  sessionState,
  onPlayPrompt,
  onToggleChinese,
  onOpenHints,
  onRevealStarter,
  onSelectPhrase,
  onStartSpeaking,
  onFinishSpeaking,
  onCancelSpeaking,
  onGoToTask,
  onPauseAndExit,
  onCompleteAssessment,
}: AssessmentStageProps) {
  const [imgError, setImgError] = useState(false);

  const {
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
  } = sessionState;

  const [isFinalizing, setIsFinalizing] = useState(false);

  const task = tasks[currentTaskIndex];
  if (!task) return null;

  const record = records[task.id];
  const currentAnswered = Boolean(record?.hasValidResponse);

  const isRecording = connectionState === 'recording';
  const isBusy =
    connectionState === 'connecting' ||
    connectionState === 'processing' ||
    connectionState === 'speaking';

  const hasNextTask = currentTaskIndex < tasks.length - 1;

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      {/* Assessment Progress Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="font-mono-tabular text-sm font-semibold text-slate-900">
            第 {currentTaskIndex + 1}／{tasks.length} 项
          </span>
          <div className="flex items-center gap-1.5" aria-label="任务完成进度">
            {tasks.map((t, idx) => {
              const done = Boolean(records[t.id]?.hasValidResponse);
              const isCurrent = idx === currentTaskIndex;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onGoToTask(idx)}
                  disabled={isRecording || isBusy}
                  aria-label={`跳到第 ${idx + 1} 项`}
                  className={`h-2.5 w-8 rounded-full transition-colors ${
                    done
                      ? 'bg-emerald-600'
                      : isCurrent
                        ? 'bg-sky-600'
                        : 'bg-slate-200 hover:bg-slate-300'
                  }`}
                />
              );
            })}
          </div>
          <span className="hidden text-xs text-slate-500 sm:inline">
            {task.objectiveTitle}
          </span>
        </div>

        <button
          type="button"
          onClick={onPauseAndExit}
          disabled={isRecording}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Pause className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          <span>暂停并退出</span>
        </button>
      </div>

      {/* Main 2-column Assessment Stage */}
      <div className="grid w-full grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        {/* Left: Scene + Explicit Task Requirement */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-6">
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
              <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 p-6">
                <BookOpen className="mb-2 h-8 w-8 text-sky-600" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-700">
                  {unitConfig.scene.title}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col justify-between gap-3 p-5 sm:p-6">
            <div>
              <div className="text-xs font-medium text-slate-500">
                {unitConfig.grade} · {unitConfig.volume} · 单元口语测评
              </div>
              <h2 className="mt-1 text-base font-semibold text-slate-900">
                {task.objectiveTitle}
              </h2>
              <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800">
                {task.requirementText}
              </p>
            </div>
          </div>
        </section>

        {/* Right: Prompt + Optional Hint + Mic + Next/Score Action */}
        <section className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-6">
          <div className="space-y-4">
            {/* Prompt Header */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  测评题目（重听英文题目仍算独立作答）
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onToggleChinese}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <Languages className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    <span>{isChineseOpen ? '收起中文' : '这句什么意思'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onPlayPrompt}
                    disabled={
                      isRecording ||
                      connectionState === 'connecting' ||
                      connectionState === 'processing'
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                    <span>
                      {connectionState === 'speaking'
                        ? '正在朗读…'
                        : canReplayAudio
                          ? '再听一遍'
                          : '听题目'}
                    </span>
                  </button>
                </div>
              </div>

              <p
                className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-[1.75rem]"
                style={{ textWrap: 'balance' }}
              >
                {task.prompt}
              </p>

              {isChineseOpen && (
                <p className="mt-1.5 text-sm font-medium text-sky-800">
                  中文意思：{task.promptChinese}
                </p>
              )}

              {aiFeedback && (
                <p className="mt-3 rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
                  {aiFeedback}
                </p>
              )}

              {studentTranscript && (
                <p className="mt-2 text-xs text-slate-500">
                  识别内容：
                  <span className="font-medium text-slate-700">{studentTranscript}</span>
                </p>
              )}
            </div>

            {isAssessmentCompleted ? (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-semibold text-emerald-900"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <span>口语测评已完成</span>
              </div>
            ) : (
              currentAnswered && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                    <span>
                      已提交本题，可以继续。
                    </span>
                  </div>
                </div>
              )
            )}

            <div className="h-px bg-slate-100" />

            {/* Optional Hint Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                  <span>可选提示（查看后本题标记为「未取得独立作答证据」）</span>
                </div>

                {hintStage === 'none' && (
                  <button
                    type="button"
                    onClick={onOpenHints}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 whitespace-nowrap shrink-0"
                  >
                    给我一点提示
                  </button>
                )}

                {hintStage === 'phrases' && (
                  <button
                    type="button"
                    onClick={onRevealStarter}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 whitespace-nowrap shrink-0"
                  >
                    再看句首
                  </button>
                )}
              </div>

              {hintStage === 'none' && (
                <p className="mt-2 text-xs text-slate-500">
                  直接用麦克风独立作答可获得完整独立得分；需要帮助时再打开提示。
                </p>
              )}

              {(hintStage === 'phrases' || hintStage === 'phrases_and_starter') && (
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-[11px] font-medium text-slate-500">
                      可选词组
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {task.phraseChoices.map((phrase) => (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => onSelectPhrase(phrase)}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                            selectedPhrase === phrase
                              ? 'border-sky-600 bg-sky-50 text-sky-900'
                              : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hintStage === 'phrases_and_starter' && (
                    <div className="border-t border-slate-200/80 pt-3">
                      <div className="text-[11px] font-medium text-slate-500">
                        英文句首
                      </div>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {task.sentenceStarter}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mic + Navigation (hidden when all tasks completed, replaced by single primary end button) */}
          <div className="space-y-3 pt-1">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isAssessmentCompleted ? (
              <button
                type="button"
                disabled={isFinalizing}
                onClick={() => {
                  if (isFinalizing) return;
                  setIsFinalizing(true);
                  onCompleteAssessment();
                }}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                <Award className="h-5 w-5" aria-hidden="true" />
                <span>结束测试并查看成绩</span>
              </button>
            ) : (
              <>
                {!currentAnswered && (!isRecording ? (
                  <button
                    type="button"
                    onClick={onStartSpeaking}
                    disabled={isBusy}
                    className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-sky-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        <span>
                          {connectionState === 'connecting'
                            ? '正在连接语音测评…'
                            : connectionState === 'processing'
                              ? '正在评分记录…'
                              : '正在播报…'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-5 w-5" aria-hidden="true" />
                        <span>
                          开始说
                        </span>
                      </>
                    )}
                  </button>
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
                        className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-emerald-700"
                      >
                        <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                        <span>说完了</span>
                      </button>
                      <button
                        type="button"
                        onClick={onCancelSpeaking}
                        className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        <span>重录</span>
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {currentTaskIndex > 0 ? (
                    <button
                      type="button"
                      onClick={() => onGoToTask(currentTaskIndex - 1)}
                      disabled={isRecording || isBusy}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40"
                    >
                      返回上一项
                    </button>
                  ) : (
                    <span />
                  )}

                  {currentAnswered && hasNextTask && (
                    <button
                      type="button"
                      onClick={() => onGoToTask(currentTaskIndex + 1)}
                      disabled={isRecording}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap shrink-0"
                    >
                      <span>下一项（第 {currentTaskIndex + 2} 项）</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
