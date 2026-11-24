import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Target,
} from 'lucide-react';
import type {
  AssessmentAttempt,
  PracticeFocusOverride,
  UnitConfig,
} from '../types/aura';

interface ScoreReportViewProps {
  unitConfig: UnitConfig;
  attempt: AssessmentAttempt;
  allAttempts: AssessmentAttempt[];
  onPracticeWeakPoint: (focus: PracticeFocusOverride) => void;
  onRetest?: () => void;
  onBackHome: () => void;
}

export function ScoreReportView({
  unitConfig,
  attempt,
  allAttempts,
  onPracticeWeakPoint,
  onRetest,
  onBackHome,
}: ScoreReportViewProps) {
  const [showDetails, setShowDetails] = useState(true);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>{unitConfig.grade}</span>
              <span aria-hidden="true">·</span>
              <span>{unitConfig.volume}</span>
              <span aria-hidden="true">·</span>
              <span>{unitConfig.unit}</span>
              {attempt.isRetest && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-sky-700">口语复测</span>
                </>
              )}
            </div>
            <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900">
              <Award className="h-6 w-6 text-emerald-600" aria-hidden="true" />
              本单元口语测评已完成
            </h1>
          </div>

          {attempt.passThresholdUsed === null ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900">
              通过线待设置
            </div>
          ) : (
            <div
              className={`rounded-xl border px-3.5 py-2 text-xs font-semibold ${
                attempt.passed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              {attempt.passed ? '已达标' : '未达标'}（通过线 {attempt.passThresholdUsed}%）
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-500">独立作答得分</div>
            <div className="font-mono-tabular mt-1.5 text-3xl font-bold text-slate-900">
              {attempt.totalIndependentScore}{' '}
              <span className="text-base font-medium text-slate-500">/ {attempt.maxScore}</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-500">独立正确率</div>
            <div className="font-mono-tabular mt-1.5 text-3xl font-bold text-sky-700">
              {attempt.independentAccuracyPct}%
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-500">提示后完成</div>
            <div className="font-mono-tabular mt-1.5 text-3xl font-bold text-slate-900">
              {attempt.assistedCount}{' '}
              <span className="text-base font-medium text-slate-500">项</span>
            </div>
          </div>
        </div>

        {attempt.noIndependentEvidenceCount > 0 && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-xs text-amber-900">
            本次有 {attempt.noIndependentEvidenceCount} 题未取得独立作答证据。可在每题反馈里查看原因。
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
            <h2 className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              你已经会
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-900">
              {attempt.strengthSummary}
            </p>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-sky-200 bg-sky-50/60 p-5">
            <div>
              <h2 className="flex items-center gap-2 text-xs font-semibold text-sky-900">
                <Target className="h-4 w-4 text-sky-700" aria-hidden="true" />
                下一步练一练
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-900">
                {attempt.nextStepSummary}
              </p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => onPracticeWeakPoint(attempt.nextStepFocus)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
              >
                针对练习这个目标
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回说一说首页
          </button>
          {onRetest && (
            <button
              type="button"
              onClick={onRetest}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              再测一次
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2>
          <button
            type="button"
            aria-expanded={showDetails}
            onClick={() => setShowDetails(visible => !visible)}
            className="flex w-full items-center justify-between text-left text-base font-semibold text-slate-900"
          >
            查看每题反馈
            {showDetails ? (
              <ChevronUp className="h-5 w-5 text-slate-500" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-500" aria-hidden="true" />
            )}
          </button>
        </h2>

        {showDetails && (
          <div className="mt-5 space-y-4">
            {attempt.taskFeedbacks.map((item, index) => (
              <article
                key={item.taskId}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">第 {index + 1} 题</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.objectiveTitle}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {item.hasIndependentEvidence
                          ? item.assistedCompleted ? '先独立作答，提示后补全' : '已独立作答'
                          : item.assistedCompleted ? '提示后完成' : '未取得独立作答证据'}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-semibold text-slate-900">{item.prompt}</h3>
                  </div>
                  {item.hasIndependentEvidence && (
                    <div className="text-right">
                      <div className="font-mono-tabular text-lg font-bold text-slate-900">
                        {item.independentScore} / 5 分
                      </div>
                      <div className="font-mono-tabular text-xs text-slate-500">
                        切题 {item.relevanceScore}/2 · 目标 {item.objectiveScore}/2 · 清楚 {item.clarityScore}/1
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                  <p>
                    <strong>你的回答：</strong>{item.studentAnswer}
                    {item.followUpAnswer ? ` → 补充：${item.followUpAnswer}` : ''}
                  </p>
                  <p><strong>评分说明：</strong>{item.feedbackReason}</p>
                  <p>
                    <strong>表达示范：</strong>
                    <span className="font-medium text-sky-800">{item.modelAnswer}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {allAttempts.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            本单元口语测评历史记录（共 {allAttempts.length} 次）
          </h2>
          <div className="mt-3 space-y-2">
            {allAttempts.map((item, index) => (
              <details
                key={item.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  第 {allAttempts.length - index} 次 · {item.totalIndependentScore} / {item.maxScore} 分 · {item.completedAt}
                </summary>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
                  {item.taskFeedbacks.map(task => (
                    <li key={task.taskId}>
                      <p className="font-medium">{task.prompt}</p>
                      <p>
                        {task.hasIndependentEvidence
                          ? `独立得分 ${task.independentScore} / 5`
                          : '未取得独立作答证据'}
                      </p>
                      <p>{task.feedbackReason}</p>
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}