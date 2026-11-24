import { useCallback, useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { AssessmentStage } from './components/AssessmentStage';
import { ScoreReportView } from './components/ScoreReportView';
import { SpeakingHome } from './components/SpeakingHome';
import { StudentStage } from './components/StudentStage';
import { TeacherDrawer } from './components/TeacherDrawer';
import {
  createInitialUnitProgress,
  resolveInitialUnitConfig,
  validateUnitConfig,
} from './data/previewUnit';
import { useAssessmentSession } from './hooks/useAssessmentSession';
import { useLiveTutor } from './hooks/useLiveTutor';
import type {
  AssessmentAttempt,
  InProgressAssessment,
  PracticeFocusOverride,
  PracticeSessionRecord,
  SkillKey,
  UnitConfig,
  UnitProgressState,
} from './types/aura';
import { buildAssessmentAttempt } from './utils/scoring';

type ActiveView = 'home' | 'practice' | 'assessment' | 'report';

function progressStorageKey(studentId: string, unitId: string) {
  return `aura_edu_progress_${studentId}_${unitId}`;
}

function incompleteStorageKey(studentId: string, unitId: string) {
  return `aura_edu_incomplete_${studentId}_${unitId}`;
}

function practiceHistoryStorageKey(studentId: string, unitId: string) {
  return `aura_edu_practice_history_${studentId}_${unitId}`;
}

function loadPracticeHistory(
  studentId: string,
  unitConfig: UnitConfig | null
): PracticeSessionRecord[] {
  if (!unitConfig) return [];

  try {
    const raw = window.localStorage.getItem(
      practiceHistoryStorageKey(studentId, unitConfig.id)
    );
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadUnitProgress(
  studentId: string,
  studentName: string,
  unitConfig: UnitConfig | null
): UnitProgressState | null {
  if (!unitConfig) return null;

  try {
    const raw = window.localStorage.getItem(
      progressStorageKey(studentId, unitConfig.id)
    );
    const parsed = raw ? JSON.parse(raw) as UnitProgressState : null;

    if (parsed?.unitId === unitConfig.id && parsed.studentId === studentId) {
      return { ...parsed, studentName };
    }
  } catch {
    // Fall back to a fresh progress record when storage cannot be read.
  }

  return createInitialUnitProgress(unitConfig.id, studentId, studentName);
}

function loadIncompleteAssessment(
  studentId: string,
  unitConfig: UnitConfig | null
): InProgressAssessment | null {
  if (!unitConfig) return null;

  try {
    const raw = window.localStorage.getItem(
      incompleteStorageKey(studentId, unitConfig.id)
    );
    const parsed = raw ? JSON.parse(raw) as InProgressAssessment : null;

    if (
      parsed?.status === 'incomplete' &&
      parsed.unitId === unitConfig.id &&
      parsed.studentId === studentId &&
      Array.isArray(parsed.tasks) &&
      parsed.tasks.length > 0
    ) {
      return parsed;
    }
  } catch {
    // A missing or unreadable draft can be replaced by a new assessment.
  }

  return null;
}

export default function App() {
  const embedded = window.parent !== window;
  const [unitConfig, setUnitConfig] = useState<UnitConfig | null>(() =>
    embedded ? null : resolveInitialUnitConfig()
  );
  const [studentId, setStudentId] = useState('student-default');
  const [studentName, setStudentName] = useState('当前学生');
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [selectedSkill, setSelectedSkill] = useState<SkillKey>('speaking');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [practiceFocus, setPracticeFocus] = useState<PracticeFocusOverride | null>(null);
  const [unitProgress, setUnitProgress] = useState<UnitProgressState | null>(() =>
    loadUnitProgress('student-default', '当前学生', resolveInitialUnitConfig())
  );
  const [incompleteAssessment, setIncompleteAssessment] =
    useState<InProgressAssessment | null>(() =>
      loadIncompleteAssessment('student-default', resolveInitialUnitConfig())
    );
  const [activeAssessmentSession, setActiveAssessmentSession] =
    useState<InProgressAssessment | null>(null);
  const [activeAttemptForReport, setActiveAttemptForReport] =
    useState<AssessmentAttempt | null>(null);
  const [practiceHistory, setPracticeHistory] = useState<PracticeSessionRecord[]>(() =>
    loadPracticeHistory('student-default', resolveInitialUnitConfig())
  );

  const hasFinalizedAssessmentRef = useRef(false);
  const hasFinishedPracticeRef = useRef(false);

  useEffect(() => {
    setUnitProgress(loadUnitProgress(studentId, studentName, unitConfig));
    setIncompleteAssessment(loadIncompleteAssessment(studentId, unitConfig));
    setPracticeHistory(loadPracticeHistory(studentId, unitConfig));
    setActiveAssessmentSession(null);
    setActiveAttemptForReport(null);
    setActiveView('home');
    setSelectedSkill('speaking');
    setPracticeFocus(null);
  }, [unitConfig?.id, studentId, studentName]);

  useEffect(() => {
    if (!unitProgress || !unitConfig) return;

    try {
      window.localStorage.setItem(
        progressStorageKey(unitProgress.studentId, unitProgress.unitId),
        JSON.stringify(unitProgress)
      );
    } catch {
      // Keep the current report visible if browser storage is unavailable.
    }
  }, [unitProgress, unitConfig]);

  const handleSaveIncompleteProgress = useCallback((snapshot: InProgressAssessment) => {
    setIncompleteAssessment(snapshot);

    try {
      window.localStorage.setItem(
        incompleteStorageKey(snapshot.studentId, snapshot.unitId),
        JSON.stringify(snapshot)
      );
    } catch {
      // Keep the draft in memory for the current page.
    }
  }, []);

  const { state: tutorState, actions: tutorActions } = useLiveTutor(
    unitConfig,
    practiceFocus
  );

  const { state: assessmentState, actions: assessmentActions } = useAssessmentSession({
    unitConfig,
    initialSession: activeAssessmentSession,
    isActive: activeView === 'assessment',
    onSaveProgress: handleSaveIncompleteProgress,
  });

  useEffect(() => {
    if (activeView !== 'practice') {
      tutorActions.closeConnection();
    }
  }, [activeView, tutorActions.closeConnection]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        window.parent === window ||
        event.source !== window.parent ||
        event.origin !== window.location.origin
      ) return;

      const data = event.data as {
        type?: string;
        payload?: unknown;
        studentId?: string;
        studentName?: string;
      } | null;

      if (!data || typeof data !== 'object') return;

      if (data.type === 'AURA_EDU_UNIT_CONFIG') {
        setUnitConfig(validateUnitConfig(data.payload));
      } else if (data.type === 'AURA_EDU_CLEAR_UNIT') {
        setUnitConfig(null);
      } else if (data.type === 'AURA_EDU_STUDENT' && typeof data.studentId === 'string') {
        setStudentId(data.studentId);
        setStudentName(
          typeof data.studentName === 'string' && data.studentName.trim()
            ? data.studentName.trim()
            : data.studentId
        );
      }
    };

    window.addEventListener('message', handleMessage);
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'AURA_VOICE_READY' }, window.location.origin);
    }
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (window.parent === window || !unitProgress?.speaking.completed) return;
    window.parent.postMessage(
      { type: 'AURA_EDU_SPEAKING_PROGRESS', payload: unitProgress },
      window.location.origin
    );
  }, [unitProgress]);

  const handleStartPractice = useCallback(
    (focus: PracticeFocusOverride | null = null) => {
      assessmentActions.closeConnection();
      hasFinishedPracticeRef.current = false;
      tutorActions.resetPractice();
      setPracticeFocus(focus);
      setActiveView('practice');
    },
    [assessmentActions, tutorActions]
  );

  const handleFinishPractice = useCallback(() => {
    if (!unitConfig || hasFinishedPracticeRef.current) return;
    hasFinishedPracticeRef.current = true;
    tutorActions.closeConnection();

    const record: PracticeSessionRecord = {
      id: `practice-${Date.now()}`,
      unitId: unitConfig.id,
      studentId,
      completedAt: new Date().toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      stats: { ...tutorState.stats },
      logs: [...tutorState.logs],
    };

    const previous = loadPracticeHistory(studentId, unitConfig);
    const next = [record, ...previous.filter(item => item.id !== record.id)].slice(0, 20);

    try {
      window.localStorage.setItem(
        practiceHistoryStorageKey(studentId, unitConfig.id),
        JSON.stringify(next)
      );
    } catch {
      window.alert('练习记录暂时无法保存。请确认浏览器允许存储，再试一次。');
      hasFinishedPracticeRef.current = false;
      return;
    }

    setPracticeHistory(next);
    setPracticeFocus(null);
    setActiveView('home');

    if (window.parent !== window) {
      window.parent.postMessage(
        { type: 'AURA_VOICE_PRACTICE_ENDED', unitId: unitConfig.id, studentId },
        window.location.origin
      );
    }
  }, [studentId, tutorActions, tutorState.logs, tutorState.stats, unitConfig]);

  const handleStartAssessment = useCallback(
    (options: { resume: boolean; isRetest: boolean }) => {
      if (!unitConfig) return;
      tutorActions.closeConnection();
      hasFinalizedAssessmentRef.current = false;

      if (options.resume && incompleteAssessment) {
        setActiveAssessmentSession(incompleteAssessment);
        assessmentActions.syncFromSession(incompleteAssessment);
        setActiveView('assessment');
        return;
      }

      const tasks =
        options.isRetest && unitConfig.retestAssessmentTasks.length === 4
          ? unitConfig.retestAssessmentTasks
          : unitConfig.assessmentTasks;

      const freshSession: InProgressAssessment = {
        unitId: unitConfig.id,
        studentId,
        isRetest: options.isRetest,
        status: 'incomplete',
        currentTaskIndex: 0,
        tasks,
        records: {},
        updatedAt: new Date().toISOString(),
      };

      handleSaveIncompleteProgress(freshSession);
      setActiveAssessmentSession(freshSession);
      assessmentActions.syncFromSession(freshSession);
      setActiveView('assessment');
    },
    [
      assessmentActions,
      handleSaveIncompleteProgress,
      incompleteAssessment,
      studentId,
      tutorActions,
      unitConfig,
    ]
  );

  const handlePauseAndExit = useCallback(() => {
    assessmentActions.pauseAndExit();
    setActiveView('home');
  }, [assessmentActions]);

  const handleCompleteAssessment = useCallback(() => {
    if (!unitConfig || hasFinalizedAssessmentRef.current) return;
    hasFinalizedAssessmentRef.current = true;
    assessmentActions.closeConnection();

    const attempt = buildAssessmentAttempt({
      unitConfig,
      studentId,
      isRetest: Boolean(activeAssessmentSession?.isRetest),
      tasks: assessmentState.tasks,
      records: assessmentState.records,
    });

    setIncompleteAssessment(null);
    setActiveAssessmentSession(null);
    try {
      window.localStorage.removeItem(incompleteStorageKey(studentId, unitConfig.id));
    } catch {
      // The active assessment has already been closed.
    }

    setUnitProgress(previous => {
      const base = previous ?? createInitialUnitProgress(unitConfig.id, studentId, studentName);
      const existingAttempts = base.speaking.attempts ?? [];
      const attempts = existingAttempts.some(item => item.id === attempt.id)
        ? existingAttempts
        : [attempt, ...existingAttempts];

      return {
        ...base,
        speaking: {
          completed: true,
          scorePct: attempt.independentAccuracyPct,
          passed: attempt.passed,
          lastScore: attempt.totalIndependentScore,
          maxScore: 20,
          attempts,
        },
      };
    });

    setActiveAttemptForReport(attempt);
    setActiveView('report');
  }, [
    activeAssessmentSession?.isRetest,
    assessmentActions,
    assessmentState.records,
    assessmentState.tasks,
    studentId,
    studentName,
    unitConfig,
  ]);

  const handleViewLatestReport = useCallback(() => {
    const latest = unitProgress?.speaking.attempts[0];
    if (!latest) return;
    setActiveAttemptForReport(latest);
    setActiveView('report');
  }, [unitProgress]);

  const handleSetSpeakingThreshold = useCallback((threshold: number | null) => {
    setUnitConfig(previous =>
      previous ? { ...previous, speakingPassThreshold: threshold } : previous
    );
    setUnitProgress(previous => {
      if (!previous || !previous.speaking.completed || previous.speaking.scorePct === null) {
        return previous;
      }
      return {
        ...previous,
        speaking: {
          ...previous.speaking,
          passed: threshold === null ? null : previous.speaking.scorePct >= threshold,
        },
      };
    });
    setActiveAttemptForReport(previous => {
      if (!previous) return previous;
      return {
        ...previous,
        passThresholdUsed: threshold,
        passed: threshold === null ? null : previous.independentAccuracyPct >= threshold,
      };
    });
  }, []);

  const handleMarkOtherSkillCompleted = useCallback(
    (skill: 'listening' | 'reading' | 'writing') => {
      setUnitProgress(previous =>
        previous
          ? { ...previous, [skill]: { completed: true, scorePct: 100, passed: true } }
          : previous
      );
    },
    []
  );

  const handleTakeUnitTest = useCallback(() => {
    setUnitProgress(previous => {
      if (!previous) return previous;
      const allFourPassed =
        previous.listening.passed &&
        previous.speaking.passed &&
        previous.reading.passed &&
        previous.writing.passed;
      if (!allFourPassed) return previous;
      return { ...previous, unitTestPassed: true, nextUnitUnlocked: true };
    });
  }, []);

  const handleResetUnitProgress = useCallback(() => {
    if (!unitConfig) return;
    assessmentActions.closeConnection();
    setUnitProgress(createInitialUnitProgress(unitConfig.id, studentId, studentName));
    setIncompleteAssessment(null);
    setActiveAssessmentSession(null);
    setActiveAttemptForReport(null);

    try {
      window.localStorage.removeItem(progressStorageKey(studentId, unitConfig.id));
      window.localStorage.removeItem(incompleteStorageKey(studentId, unitConfig.id));
    } catch {
      // The visible progress has already been reset.
    }

    setActiveView('home');
  }, [assessmentActions, studentId, studentName, unitConfig]);

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          <span className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight text-slate-900">
            AURA EDU · 单元口语伙伴
          </span>
          <div className="hidden items-center gap-2 whitespace-nowrap text-xs text-slate-500 sm:flex">
            {unitConfig ? (
              <>
                {unitConfig.isPreviewTest && (
                  <>
                    <span className="font-medium text-sky-700">功能测试</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span>{unitConfig.grade}</span>
                <span aria-hidden="true">·</span>
                <span>{unitConfig.volume}</span>
                <span aria-hidden="true">·</span>
                <span className="max-w-[200px] truncate">{unitConfig.unit}</span>
              </>
            ) : (
              <span>尚未载入单元</span>
            )}
          </div>

          {!embedded && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              单元配置与记录
            </button>
          )}
        </div>
      </header>

      {(!unitConfig || activeView === 'home') && (
        <SpeakingHome
          unitConfig={unitConfig}
          unitProgress={unitProgress}
          incompleteAssessment={incompleteAssessment}
          latestPracticeSession={practiceHistory[0] ?? null}
          speakingOnly={embedded}
          selectedSkill={embedded ? 'speaking' : selectedSkill}
          onSelectSkill={setSelectedSkill}
          onStartPractice={() => handleStartPractice(null)}
          onStartAssessment={handleStartAssessment}
          onViewLatestReport={handleViewLatestReport}
          onOpenConfigDrawer={embedded ? undefined : () => setDrawerOpen(true)}
          onMarkOtherSkillCompleted={handleMarkOtherSkillCompleted}
          onTakeUnitTest={handleTakeUnitTest}
        />
      )}

      {unitConfig && activeView === 'practice' && (
        <StudentStage
          unitConfig={unitConfig}
          tutorState={tutorState}
          onPlayQuestion={tutorActions.playQuestionAudio}
          onPlayDemoSentence={tutorActions.playDemoSentence}
          onStartSpeaking={tutorActions.startSpeaking}
          onFinishSpeaking={tutorActions.finishSpeaking}
          onCancelSpeaking={tutorActions.cancelSpeaking}
          onToggleChinese={tutorActions.toggleChineseMeaning}
          onOpenHints={tutorActions.openHints}
          onRevealStarter={tutorActions.revealStarter}
          onSelectPhrase={tutorActions.selectPhraseHint}
          onOpenConfigDrawer={() => setDrawerOpen(true)}
          onBackHome={() => {
            tutorActions.closeConnection();
            setPracticeFocus(null);
            setActiveView('home');
          }}
          onFinishPractice={handleFinishPractice}
          practiceFocus={practiceFocus}
          onClearFocus={() => setPracticeFocus(null)}
        />
      )}

      {unitConfig && activeView === 'assessment' && (
        <AssessmentStage
          unitConfig={unitConfig}
          sessionState={assessmentState}
          onPlayPrompt={assessmentActions.playTaskPromptAudio}
          onToggleChinese={assessmentActions.toggleChineseMeaning}
          onOpenHints={assessmentActions.openHints}
          onRevealStarter={assessmentActions.revealStarter}
          onSelectPhrase={assessmentActions.selectPhrase}
          onStartSpeaking={assessmentActions.startSpeaking}
          onFinishSpeaking={assessmentActions.finishSpeaking}
          onCancelSpeaking={assessmentActions.cancelSpeaking}
          onGoToTask={assessmentActions.goToTask}
          onPauseAndExit={handlePauseAndExit}
          onCompleteAssessment={handleCompleteAssessment}
        />
      )}

      {unitConfig && activeView === 'report' && activeAttemptForReport && (
        <ScoreReportView
          unitConfig={unitConfig}
          attempt={activeAttemptForReport}
          allAttempts={unitProgress?.speaking.attempts ?? [activeAttemptForReport]}
          onPracticeWeakPoint={handleStartPractice}
          onRetest={() => handleStartAssessment({ resume: false, isRetest: true })}
          onBackHome={() => setActiveView('home')}
        />
      )}

      <TeacherDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        unitConfig={unitConfig}
        onApplyUnitConfig={setUnitConfig}
        stats={tutorState.stats}
        logs={tutorState.logs}
        onResetPractice={tutorActions.resetPractice}
        studentId={studentId}
        studentName={studentName}
        onSwitchStudent={(id, name) => {
          setStudentId(id);
          setStudentName(name);
        }}
        unitProgress={unitProgress}
        incompleteAssessment={incompleteAssessment}
        onSetSpeakingThreshold={handleSetSpeakingThreshold}
        onResetUnitProgress={handleResetUnitProgress}
      />
    </div>
  );
}