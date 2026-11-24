import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { PREVIEW_SPORTS_UNIT, validateUnitConfig } from '../data/previewUnit';
import type {
  InProgressAssessment,
  LearningStats,
  PracticeLogEntry,
  TurnOutcome,
  UnitConfig,
  UnitProgressState,
} from '../types/aura';

interface TeacherDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  unitConfig: UnitConfig | null;
  onApplyUnitConfig: (cfg: UnitConfig | null) => void;
  stats: LearningStats;
  logs: PracticeLogEntry[];
  onResetPractice: () => void;
  studentId: string;
  studentName: string;
  onSwitchStudent: (studentId: string, studentName: string) => void;
  unitProgress: UnitProgressState | null;
  incompleteAssessment: InProgressAssessment | null;
  onSetSpeakingThreshold: (threshold: number | null) => void;
  onResetUnitProgress: () => void;
}

function outcomeLabel(outcome: TurnOutcome): string {
  switch (outcome) {
    case 'independent_correct':
      return '独立答对';
    case 'assisted_correct':
      return '提示后完成';
    case 'corrected_complete':
      return '纠错后完成';
    case 'grammar_correction':
      return '语法纠正中（等待重说）';
    case 'needs_retry':
      return '需要重试';
    case 'scaffolding_keyword':
      return '词句引导中';
    case 'unheard':
      return '未听清（不计错/不判通过）';
  }
}

export function TeacherDrawer({
  isOpen,
  onClose,
  unitConfig,
  onApplyUnitConfig,
  stats,
  logs,
  onResetPractice,
  studentId,
  studentName,
  onSwitchStudent,
  unitProgress,
  incompleteAssessment,
  onSetSpeakingThreshold,
  onResetUnitProgress,
}: TeacherDrawerProps) {
  const [jsonInput, setJsonInput] = useState<string>(
    JSON.stringify(unitConfig ?? PREVIEW_SPORTS_UNIT, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && unitConfig) {
      setJsonInput(JSON.stringify(unitConfig, null, 2));
    }
  }, [isOpen, unitConfig]);

  if (!isOpen) return null;

  const threshold =
    unitConfig && typeof unitConfig.speakingPassThreshold === 'number'
      ? unitConfig.speakingPassThreshold
      : null;

  const handleLoadJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const valid = validateUnitConfig(parsed);
      if (!valid) {
        setJsonError(
          '配置缺少必填字段：需包含 grade、volume、unit、vocabulary（非空数组）、patterns（非空数组）、objectives（非空数组）。'
        );
        return;
      }
      setJsonError(null);
      onApplyUnitConfig(valid);
    } catch {
      setJsonError('JSON 格式有误，请检查括号与引号。');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="单元配置与学习记录"
    >
      <div className="flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            单元配置与学习记录
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭面板"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
          {/* 1. Unit Speaking Assessment Threshold & Four-Skill Progress */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-sky-600" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-900">
                  单元测评通过线与四板块进度
                </h3>
              </div>
              <button
                type="button"
                onClick={onResetUnitProgress}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>重置当前学生进度</span>
              </button>
            </div>

            {/* Student Isolation Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <UserCheck className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span>当前学生：</span>
                <span className="font-semibold text-slate-900">{studentName}</span>
                <span className="font-mono-tabular text-slate-500">({studentId})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSwitchStudent('student-default', '当前学生')}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    studentId === 'student-default'
                      ? 'bg-sky-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  当前学生
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchStudent('student-b', '测试学生 B')}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    studentId === 'student-b'
                      ? 'bg-sky-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  测试学生 B
                </button>
              </div>
            </div>

            {/* Pass Threshold Configuration */}
            {unitConfig && (
              <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-700">口语通过线配置：</span>
                  <span className="font-semibold text-slate-900">
                    {threshold === null ? '通过线待设置' : `${threshold}%`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSetSpeakingThreshold(null)}
                    className={`rounded-lg border px-3 py-1.5 font-medium transition-colors ${
                      threshold === null
                        ? 'border-amber-400 bg-amber-50 text-amber-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    未设置（显示“通过线待设置”）
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetSpeakingThreshold(80)}
                    className={`rounded-lg border px-3 py-1.5 font-medium transition-colors ${
                      threshold === 80
                        ? 'border-sky-600 bg-sky-50 text-sky-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    设为 80%
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetSpeakingThreshold(60)}
                    className={`rounded-lg border px-3 py-1.5 font-medium transition-colors ${
                      threshold === 60
                        ? 'border-sky-600 bg-sky-50 text-sky-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    设为 60%
                  </button>
                </div>
              </div>
            )}

            {/* 4-Skill Progress Readout */}
            {unitProgress && (
              <div className="grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-slate-500">听</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {unitProgress.listening.completed ? '已完成' : '未完成'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-slate-500">说</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {unitProgress.speaking.completed
                      ? `${unitProgress.speaking.lastScore}/20 (${unitProgress.speaking.scorePct}%)`
                      : incompleteAssessment
                        ? '未完成（中途保存）'
                        : '未完成'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-slate-500">读</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {unitProgress.reading.completed ? '已完成' : '未完成'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-slate-500">写</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {unitProgress.writing.completed ? '已完成' : '未完成'}
                  </div>
                </div>
              </div>
            )}
          </section>

          <div className="h-px bg-slate-200" />

          {/* 2. Practice Learning Outcomes */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                跟 AI 练习 · 本轮分类统计
              </h3>
              <button
                type="button"
                onClick={onResetPractice}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>重置练习记录</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>独立答对</span>
                </div>
                <div className="font-mono-tabular mt-1.5 text-2xl font-semibold text-slate-900">
                  {stats.independentCorrect}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-sky-700">
                  <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>提示后完成</span>
                </div>
                <div className="font-mono-tabular mt-1.5 text-2xl font-semibold text-slate-900">
                  {stats.assistedCorrect}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>纠错后完成</span>
                </div>
                <div className="font-mono-tabular mt-1.5 text-2xl font-semibold text-slate-900">
                  {stats.correctedComplete}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>需要重试</span>
                </div>
                <div className="font-mono-tabular mt-1.5 text-2xl font-semibold text-slate-900">
                  {stats.needsRetry}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              空白录音或系统未听清的重试仅在下方记录为“未听清”，不计入语法错误或需要重试，也不判通过。
            </p>

            {logs.length > 0 ? (
              <div className="space-y-2.5">
                {logs.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 text-slate-500">
                      <span className="font-medium text-slate-800">
                        {outcomeLabel(item.outcome)}
                      </span>
                      <span className="font-mono-tabular">{item.timestamp}</span>
                    </div>
                    <div className="mt-1.5 space-y-1 text-slate-600">
                      <p>提问：{item.question}</p>
                      <p>学生：{item.studentSaid}</p>
                      <p>回应：{item.aiReply}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 py-5 text-center text-xs text-slate-500">
                暂无对话记录，完成一轮回答后将在此显示
              </p>
            )}
          </section>

          <div className="h-px bg-slate-200" />

          {/* 3. Unit Configuration */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              AURA EDU 单元传入配置
            </h3>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setJsonError(null);
                  setJsonInput(JSON.stringify(PREVIEW_SPORTS_UNIT, null, 2));
                  onApplyUnitConfig(PREVIEW_SPORTS_UNIT);
                }}
                className="rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-700"
              >
                载入「功能测试 · 体育话题」
              </button>

              <button
                type="button"
                onClick={() => {
                  setJsonError(null);
                  onApplyUnitConfig(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>清空单元（测试未载入状态）</span>
              </button>
            </div>

            {unitConfig ? (
              <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                <div>
                  <span className="font-medium text-slate-900">基本信息：</span>
                  {unitConfig.isPreviewTest ? '功能测试 · ' : ''}
                  {unitConfig.grade} · {unitConfig.volume} · {unitConfig.unit}
                </div>
                <div>
                  <span className="font-medium text-slate-900">已学词汇：</span>
                  {unitConfig.vocabulary.join(', ')}
                </div>
                <div>
                  <span className="font-medium text-slate-900">句型：</span>
                  {unitConfig.patterns.join(' / ')}
                </div>
                <div>
                  <span className="font-medium text-slate-900">学习目标：</span>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {unitConfig.objectives.map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                当前状态：尚未载入单元（学生端明确显示“尚未载入单元”，不会自行生成教材内容）。
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="aura-json-input"
                className="block text-xs font-medium text-slate-700"
              >
                模拟 AURA EDU JSON 传入（或通过 window.postMessage 传入）
              </label>
              <textarea
                id="aura-json-input"
                rows={8}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="font-mono-tabular w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 focus:border-sky-600 focus:bg-white focus:outline-none"
              />
              {jsonError && (
                <p className="text-xs text-rose-700">{jsonError}</p>
              )}
              <button
                type="button"
                onClick={handleLoadJson}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50"
              >
                应用此 JSON 配置
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
