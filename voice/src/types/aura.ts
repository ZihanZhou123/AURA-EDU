export type HintStage = 'none' | 'phrases' | 'phrases_and_starter';

export type TurnOutcome =
  | 'unheard'
  | 'scaffolding_keyword'
  | 'grammar_correction'
  | 'independent_correct'
  | 'assisted_correct'
  | 'corrected_complete'
  | 'needs_retry';

export interface SceneConfig {
  title: string;
  description: string;
  imageUrl: string;
}

export interface AssessmentTask {
  id: string;
  objectiveId: string;
  objectiveTitle: string;
  abilitySummary: string;
  nextStepTip: string;
  prompt: string;
  promptChinese: string;
  requirementText: string;
  requiresFullSentence: boolean;
  acceptsShortAnswer: boolean;
  phraseChoices: string[];
  sentenceStarter: string;
  sampleAnswer: string;
}

export interface UnitConfig {
  id: string;
  isPreviewTest?: boolean;
  label?: string;
  grade: string;
  volume: string;
  unit: string;
  topic: string;
  vocabulary: string[];
  patterns: string[];
  objectives: string[];
  scene: SceneConfig;
  initialQuestion: string;
  initialQuestionChinese: string;
  initialPhraseChoices: string[];
  initialSentenceStarter: string;
  /** Optional unit speaking pass threshold percentage (e.g. 80). When undefined/null, UI shows "通过线待设置". */
  speakingPassThreshold?: number | null;
  assessmentTasks: AssessmentTask[];
  retestAssessmentTasks: AssessmentTask[];
}

export interface PracticeFocusOverride {
  prompt: string;
  promptChinese: string;
  phraseChoices: string[];
  sentenceStarter: string;
  objectiveTitle?: string;
}

export interface GrammarCorrection {
  explanationCn: string;
  correctedExample: string;
}

export interface LearningStats {
  independentCorrect: number;
  assistedCorrect: number;
  correctedComplete: number;
  needsRetry: number;
}

export interface PracticeLogEntry {
  id: string;
  timestamp: string;
  question: string;
  studentSaid: string;
  aiReply: string;
  outcome: TurnOutcome;
  usedHint?: boolean;
  countedIn?:
    | 'independentCorrect'
    | 'assistedCorrect'
    | 'correctedComplete'
    | 'needsRetry'
    | 'none';
}

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'ready'
  | 'recording'
  | 'processing'
  | 'speaking'
  | 'error';

export interface PedagogicalUpdatePayload {
  studentTranscriptSummary?: string;
  outcome: TurnOutcome;
  hintStage?: 'none' | 'phrases' | 'phrases_and_starter';
  demoSentence?: string;
  grammarExplanationCn?: string;
  correctedExample?: string;
  nextQuestion: string;
  nextQuestionChinese: string;
  nextPhraseChoices: string[];
  nextSentenceStarter: string;
  isPracticeCompleted?: boolean;
}

export interface PracticeSessionRecord {
  id: string;
  unitId: string;
  studentId: string;
  completedAt: string;
  stats: LearningStats;
  logs: PracticeLogEntry[];
}

export interface AssessmentTurnPayload {
  studentTranscriptSummary: string;
  isUnheard: boolean;
  relevanceScore: number;
  objectiveScore: number;
  clarityScore: number;
  shouldAskFollowUp: boolean;
  followUpPromptEn?: string;
  feedbackReasonCn: string;
  modelAnswerEn: string;
}

export interface TaskAssessmentRecord {
  taskId: string;
  objectiveId: string;
  prompt: string;
  hasValidResponse: boolean;
  hasIndependentEvidence: boolean;
  usedContentHintBeforeFirstGradable: boolean;
  independentRelevance: number;
  independentObjective: number;
  independentClarity: number;
  independentScore: number;
  independentTranscript: string;
  assistedCompleted: boolean;
  followUpCount: number;
  followUpPromptEn?: string;
  followUpTranscript?: string;
  feedbackReasonCn: string;
  modelAnswerEn: string;
}

export interface InProgressAssessment {
  unitId: string;
  studentId: string;
  isRetest: boolean;
  status: 'incomplete';
  currentTaskIndex: number;
  tasks: AssessmentTask[];
  records: Record<string, TaskAssessmentRecord>;
  updatedAt: string;
}

export interface AssessmentAttempt {
  id: string;
  unitId: string;
  studentId: string;
  isRetest: boolean;
  completedAt: string;
  totalIndependentScore: number;
  maxScore: 20;
  independentAccuracyPct: number;
  assistedCount: number;
  noIndependentEvidenceCount: number;
  passThresholdUsed: number | null;
  passed: boolean | null;
  strengthSummary: string;
  nextStepSummary: string;
  nextStepFocus: PracticeFocusOverride;
  taskFeedbacks: Array<{
    taskId: string;
    objectiveTitle: string;
    prompt: string;
    requirementText: string;
    independentScore: number;
    relevanceScore: number;
    objectiveScore: number;
    clarityScore: number;
    hasIndependentEvidence: boolean;
    assistedCompleted: boolean;
    studentAnswer: string;
    followUpAnswer?: string;
    feedbackReason: string;
    modelAnswer: string;
  }>;
}

export type SkillKey = 'listening' | 'speaking' | 'reading' | 'writing';

export interface SkillStatus {
  completed: boolean;
  scorePct: number | null;
  passed: boolean | null;
}

export interface UnitProgressState {
  unitId: string;
  studentId: string;
  studentName: string;
  listening: SkillStatus;
  speaking: SkillStatus & {
    lastScore: number | null;
    maxScore: number;
    attempts: AssessmentAttempt[];
  };
  reading: SkillStatus;
  writing: SkillStatus;
  unitTestPassed: boolean;
  nextUnitUnlocked: boolean;
}
