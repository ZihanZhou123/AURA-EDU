import type {
  AssessmentAttempt,
  AssessmentTask,
  TaskAssessmentRecord,
  UnitConfig,
} from '../types/aura';

export function createEmptyTaskRecord(task: AssessmentTask): TaskAssessmentRecord {
  return {
    taskId: task.id,
    objectiveId: task.objectiveId,
    prompt: task.prompt,
    hasValidResponse: false,
    hasIndependentEvidence: false,
    usedContentHintBeforeFirstGradable: false,
    independentRelevance: 0,
    independentObjective: 0,
    independentClarity: 0,
    independentScore: 0,
    independentTranscript: '',
    assistedCompleted: false,
    followUpCount: 0,
    feedbackReasonCn: '',
    modelAnswerEn: task.sampleAnswer,
  };
}

export function buildAssessmentAttempt(params: {
  unitConfig: UnitConfig;
  studentId: string;
  isRetest: boolean;
  tasks: AssessmentTask[];
  records: Record<string, TaskAssessmentRecord>;
}): AssessmentAttempt {
  const { unitConfig, studentId, isRetest, tasks, records } = params;

  let totalIndependentScore = 0;
  let assistedCount = 0;
  let noIndependentEvidenceCount = 0;

  const taskFeedbacks = tasks.map((task) => {
    const rec = records[task.id] ?? createEmptyTaskRecord(task);
    const indepScore = rec.hasIndependentEvidence ? rec.independentScore : 0;
    totalIndependentScore += indepScore;
    if (rec.assistedCompleted) assistedCount += 1;
    if (!rec.hasIndependentEvidence) noIndependentEvidenceCount += 1;

    return {
      taskId: task.id,
      objectiveTitle: task.objectiveTitle,
      prompt: task.prompt,
      requirementText: task.requirementText,
      independentScore: indepScore,
      relevanceScore: rec.hasIndependentEvidence ? rec.independentRelevance : 0,
      objectiveScore: rec.hasIndependentEvidence ? rec.independentObjective : 0,
      clarityScore: rec.hasIndependentEvidence ? rec.independentClarity : 0,
      hasIndependentEvidence: rec.hasIndependentEvidence,
      assistedCompleted: rec.assistedCompleted,
      studentAnswer: rec.independentTranscript || '（未取得语音转写）',
      followUpAnswer: rec.followUpTranscript,
      feedbackReason:
        rec.feedbackReasonCn ||
        (rec.hasIndependentEvidence
          ? '已完成本项独立作答。'
          : rec.usedContentHintBeforeFirstGradable
            ? '作答前查看了提示。'
            : '系统未取得可评分的语音。'),
      modelAnswer: rec.modelAnswerEn || task.sampleAnswer,
    };
  });

  const independentAccuracyPct = Math.round((totalIndependentScore / 20) * 100);
  const threshold =
    typeof unitConfig.speakingPassThreshold === 'number'
      ? unitConfig.speakingPassThreshold
      : null;
  const passed = threshold !== null ? independentAccuracyPct >= threshold : null;

  // Pick strongest independent task for 「你已经会」
  const rankedStrong = [...tasks].sort((a, b) => {
    const ra = records[a.id];
    const rb = records[b.id];
    const sa = ra?.hasIndependentEvidence ? ra.independentScore : -1;
    const sb = rb?.hasIndependentEvidence ? rb.independentScore : -1;
    return sb - sa;
  });
  const bestTask = rankedStrong[0] ?? tasks[0];
  const bestRec = records[bestTask.id];
  const strengthSummary =
    bestRec && bestRec.hasIndependentEvidence && bestRec.independentScore >= 4
      ? bestTask.abilitySummary
      : '能听懂简单英语提问并尝试开口作答';

  // Pick weakest task for 「下一步练一练」
  const rankedWeak = [...tasks].sort((a, b) => {
    const ra = records[a.id];
    const rb = records[b.id];
    const sa = ra?.hasIndependentEvidence ? ra.independentScore : 0;
    const sb = rb?.hasIndependentEvidence ? rb.independentScore : 0;
    return sa - sb;
  });
  const focusTask = rankedWeak[0] ?? tasks[0];
  const focusRec = records[focusTask.id];
  const nextStepSummary =
    focusRec && focusRec.hasIndependentEvidence && focusRec.independentScore === 5
      ? `继续巩固：${focusTask.nextStepTip}`
      : focusTask.nextStepTip;

  return {
    id: `attempt-${Date.now()}`,
    unitId: unitConfig.id,
    studentId,
    isRetest,
    completedAt: new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    totalIndependentScore,
    maxScore: 20,
    independentAccuracyPct,
    assistedCount,
    noIndependentEvidenceCount,
    passThresholdUsed: threshold,
    passed,
    strengthSummary,
    nextStepSummary,
    nextStepFocus: {
      prompt: focusTask.prompt,
      promptChinese: focusTask.promptChinese,
      phraseChoices: focusTask.phraseChoices,
      sentenceStarter: focusTask.sentenceStarter,
      objectiveTitle: focusTask.objectiveTitle,
    },
    taskFeedbacks,
  };
}