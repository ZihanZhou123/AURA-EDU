import { useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Headphones,
  Lock,
  MessageSquare,
  Mic,
  PenLine,
  Play,
  RotateCcw,
  Unlock,
} from 'lucide-react';
import type {
  InProgressAssessment,
  PracticeSessionRecord,
  SkillKey,
  UnitConfig,
  UnitProgressState,
} from '../types/aura';

interface SpeakingHomeProps {
  unitConfig: UnitConfig | null;
  unitProgress: UnitProgressState | null;
  incompleteAssessment: InProgressAssessment | null;
  latestPracticeSession?: PracticeSessionRecord | null;
  selectedSkill: SkillKey;
  onSelectSkill: (skill: SkillKey) => void;
  onStartPractice: () => void;
  onStartAssessment: (options: { resume: boolean; isRetest: boolean }) => void;
  onViewLatestReport: () => void;
  speakingOnly?: boolean;
  onOpenConfigDrawer?: () => void;
  onMarkOtherSkillCompleted?: (skill: 'listening' | 'reading' | 'writing') => void;
  onTakeUnitTest?: () => void;
}

export function SpeakingHome({
  unitConfig,
  unitProgress,
  incompleteAssessment,
  latestPracticeSession,
  selectedSkill,
  onSelectSkill,
  onStartPractice,
  onStartAssessment,
  onViewLatestReport,
  speakingOnly,
  onOpenConfigDrawer,
  onMarkOtherSkillCompleted,
  onTakeUnitTest,
}: SpeakingHomeProps) {
  const [imgError, setImgError] = useState(false);

  if (!unitConfig && speakingOnly) {
    return <p role="status" className="p-6">正在载入本单元…</p>;
  }

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
            请等待 AURA EDU 传入年级、册别、单元、已学词汇、句型与学习目标后再开始口语练习或测评。
          </p>
          <div className="mt-7">
            <button
              type="button"
              onClick={onOpenConfigDrawer}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              打开单元配置面板
            </button>
          </div>
        </section>
      </main>
    );
  }

  const threshold =
    typeof unitConfig.speakingPassThreshold === 'number'
      ? unitConfig.speakingPassThreshold
      : null;
  const speakingStatus = unitProgress?.speaking;
  const completedCount = incompleteAssessment
    ? Object.values(incompleteAssessment.records).filter(record => record.hasValidResponse).length
    : 0;

  const allFourPassed = Boolean(
    unitProgress?.listening.passed &&
    unitProgress?.speaking.passed &&
    unitProgress?.reading.passed &&
    unitProgress?.writing.passed
  );

  const skillItems: Array<{
    key: SkillKey;
    label: string;
    icon: typeof Mic;
    statusText: string;
    done: boolean;
  }> = [
    {
      key: 'listening',
      label: '听',
      icon: Headphones,
      statusText: unitProgress?.listening.completed ? '已完成' : '可随时开始',
      done: Boolean(unitProgress?.listening.completed),
    },
    {
      key: 'speaking',
      label: '说',
      icon: Mic,
      statusText: speakingStatus?.completed
        ? threshold === null
          ? `${speakingStatus.lastScore}/20 · 通过线待设置`
          : speakingStatus.passed
            ? `${speakingStatus.scorePct}% · 已达标`
            : `${speakingStatus.scorePct}% · 未达标`
        : incompleteAssessment
          ? `未完成 (${completedCount}/4)`
          : '待测评',
      done: Boolean(speakingStatus?.completed),
    },
    {
      key: 'reading',
      label: '读',
      icon: BookOpen,
      statusText: unitProgress?.reading.completed ? '已完成' : '可随时开始',
      done: Boolean(unitProgress?.reading.completed),
    },
    {
      key: 'writing',
      label: '写',
      icon: PenLine,
      statusText: unitProgress?.writing.completed ? '已完成' : '可随时开始',
      done: Boolean(unitProgress?.writing.completed),
    },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {!speakingOnly && (
        <section
          aria-label="当前单元学习进度"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {unitConfig.isPreviewTest && (
                <>
                  <span className="font-medium text-sky-700">功能测试</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span className="font-medium text-slate-900">
                {unitConfig.grade} · {unitConfig.volume} · {unitConfig.unit}
              </span>
              <span aria-hidden="true">·</span>
              <span>{unitProgress?.studentName ?? '当前学生'}</span>
              <span aria-hidden="true">·</span>
              <span>听 / 说 / 读 / 写 可自由选择顺序</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                {allFourPassed ? (
                  <Unlock className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                )}
                <span>
                  单元检测：{unitProgress?.unitTestPassed ? '已通过' : allFourPassed ? '已开放' : '需四项达标后开放'}
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <span>下一单元：{unitProgress?.nextUnitUnlocked ? '已解锁' : '未解锁'}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {skillItems.map(item => {
              const Icon = item.icon;
              const active = selectedSkill === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectSkill(item.key)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                    active
                      ? 'border-sky-600 bg-sky-50/70'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${active ? 'text-sky-700' : 'text-slate-600'}`}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-600">{item.statusText}</p>
                  </div>
                  {item.done && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {allFourPassed && !unitProgress?.unitTestPassed && onTakeUnitTest && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs">
              <span className="font-medium text-emerald-900">
                听、说、读、写四个板块已全部达标，单元检测已开放！
              </span>
              <button
                type="button"
                onClick={onTakeUnitTest}
                className="shrink-0 whitespace-nowrap rounded-lg bg-emerald-600 px-3.5 py-1.5 font-medium text-white hover:bg-emerald-700"
              >
                完成单元检测（解锁下一单元）
              </button>
            </div>
          )}
        </section>
      )}

      {selectedSkill !== 'speaking' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedSkill === 'listening'
                  ? '听一听板块'
                  : selectedSkill === 'reading'
                    ? '读一读板块'
                    : '写一写板块'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                你可以自由决定先学听、说、读、写中的哪一项。本应用提供「说一说」的 AI 语音对话与口语测评。
              </p>
            </div>
            <div className="flex items-center gap-3">
              {onMarkOtherSkillCompleted && (
                <button
                  type="button"
                  onClick={() => onMarkOtherSkillCompleted(selectedSkill)}
                  className="shrink-0 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  模拟完成并达标（用于验证解锁流程）
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelectSkill('speaking')}
                className="shrink-0 whitespace-nowrap rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-700"
              >
                切回「说一说」
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-5">
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
                <div className="flex h-full w-full items-center justify-center bg-slate-100">
                  <BookOpen className="h-8 w-8 text-sky-600" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-between p-5">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">说一说 · {unitConfig.topic}</h1>
                <p className="mt-1 text-sm text-slate-600">{unitConfig.scene.description}</p>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                已学词句：{unitConfig.vocabulary.slice(0, 8).join(' / ')}
              </div>
            </div>
          </section>

          <section className="flex flex-col justify-between gap-4 lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MessageSquare className="h-4 w-4 text-sky-600" aria-hidden="true" />
                跟 AI 练习
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                可以查看中文意思、词组和句首提示，也可以根据反馈重说。
              </p>
              {latestPracticeSession && (
                <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700">
                  上次练习已完成（{latestPracticeSession.completedAt}）
                  · 独立答对 {latestPracticeSession.stats.independentCorrect}
                  · 提示后完成 {latestPracticeSession.stats.assistedCorrect}
                  · 纠错后完成 {latestPracticeSession.stats.correctedComplete}
                </p>
              )}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={onStartPractice}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  <Play className="h-4 w-4 text-sky-600" aria-hidden="true" />
                  跟 AI 练习
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <ClipboardCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    口语测评
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    共 4 项本单元口语任务，满分 20 分。可以先练习，再回来测评。
                  </p>
                </div>
                {threshold === null ? (
                  <span className="text-xs font-medium text-amber-800">通过线待设置</span>
                ) : (
                  <span className="text-xs font-medium text-slate-600">单元通过线：{threshold}%</span>
                )}
              </div>

              {incompleteAssessment && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900">
                  上次测评未完成（已完成 {completedCount}／4 项，可从第{' '}
                  {incompleteAssessment.currentTaskIndex + 1} 项继续）
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {incompleteAssessment ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onStartAssessment({
                          resume: true,
                          isRetest: incompleteAssessment.isRetest,
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                    >
                      继续口语测评
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onStartAssessment({
                          resume: false,
                          isRetest: incompleteAssessment.isRetest,
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      重新开始测评
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onStartAssessment({
                        resume: false,
                        isRetest: Boolean(speakingStatus?.completed),
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                  >
                    {speakingStatus?.completed ? '再测一次' : '开始口语测评'}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}

                {speakingStatus && speakingStatus.attempts.length > 0 && (
                  <button
                    type="button"
                    onClick={onViewLatestReport}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <Award className="h-4 w-4 text-sky-600" aria-hidden="true" />
                    查看测评记录（共 {speakingStatus.attempts.length} 次）
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}