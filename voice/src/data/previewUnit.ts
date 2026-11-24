import type { AssessmentTask, UnitConfig, UnitProgressState } from '../types/aura';

export const PREVIEW_ASSESSMENT_TASKS: AssessmentTask[] = [
  {
    id: 'task-hobby-1',
    objectiveId: 'obj-hobby',
    objectiveTitle: '表达喜欢的体育活动',
    abilitySummary: '用完整句子表达自己喜欢的体育活动',
    nextStepTip: '练习用“I like playing …”或“I like to play …”说出喜欢的运动',
    prompt: 'What do you like to do?',
    promptChinese: '你喜欢做什么？',
    requirementText: '要求：请用完整句子回答你喜欢的体育活动（如 I like playing …）。',
    requiresFullSentence: true,
    acceptsShortAnswer: false,
    phraseChoices: ['playing football', 'watching football', 'playing basketball'],
    sentenceStarter: 'I like ______.',
    sampleAnswer: 'I like playing football.',
  },
  {
    id: 'task-location-2',
    objectiveId: 'obj-location',
    objectiveTitle: '用完整句说明踢球地点',
    abilitySummary: '用完整句子说明体育活动的地点',
    nextStepTip: '练习用完整句回答地点，如“I play football at school.”',
    prompt: 'Where do you play football?',
    promptChinese: '你在哪里踢足球？',
    requirementText: '要求：请用完整句子回答地点（如 I play football at school.）。',
    requiresFullSentence: true,
    acceptsShortAnswer: false,
    phraseChoices: ['at school', 'in the park', 'on the playground'],
    sentenceStarter: 'I play football ______.',
    sampleAnswer: 'I play football at school.',
  },
  {
    id: 'task-partner-3',
    objectiveId: 'obj-partner',
    objectiveTitle: '回答运动同伴',
    abilitySummary: '听懂交际提问并回答运动同伴',
    nextStepTip: '练习回答“Who do you play football with?”，如“I play football with my friends.”',
    prompt: 'Who do you play football with?',
    promptChinese: '你和谁一起踢足球？',
    requirementText: '要求：回答和谁一起踢足球，可以用完整句子，也可以简短回答。',
    requiresFullSentence: false,
    acceptsShortAnswer: true,
    phraseChoices: ['with my friends', 'with my classmates', 'my friends'],
    sentenceStarter: 'I play football with ______.',
    sampleAnswer: 'I play football with my friends.',
  },
  {
    id: 'task-picture-4',
    objectiveId: 'obj-picture',
    objectiveTitle: '看图描述活动',
    abilitySummary: '观察场景图片并用英语描述正在进行的体育活动',
    nextStepTip: '练习看图用完整句子描述活动，如“They are playing football at school.”',
    prompt: 'Look at the picture. What are they doing?',
    promptChinese: '看图片，他们在做什么？',
    requirementText: '要求：观察左侧图片，用完整句子描述草地上的同学们正在做什么。',
    requiresFullSentence: true,
    acceptsShortAnswer: false,
    phraseChoices: ['playing football', 'at school', 'on the playground'],
    sentenceStarter: 'They are ______.',
    sampleAnswer: 'They are playing football at school.',
  },
];

export const PREVIEW_RETEST_TASKS: AssessmentTask[] = [
  {
    id: 'retest-hobby-1',
    objectiveId: 'obj-hobby',
    objectiveTitle: '表达喜欢的体育活动（复测）',
    abilitySummary: '用完整句子表达自己喜欢观看或参与的体育活动',
    nextStepTip: '练习用“I like watching …”或“I like playing …”表达喜好',
    prompt: 'What sport do you like watching?',
    promptChinese: '你喜欢看什么体育项目？',
    requirementText: '要求：请用完整句子回答你喜欢看的体育项目（如 I like watching …）。',
    requiresFullSentence: true,
    acceptsShortAnswer: false,
    phraseChoices: ['watching football', 'watching basketball', 'playing football'],
    sentenceStarter: 'I like ______.',
    sampleAnswer: 'I like watching football.',
  },
  {
    id: 'retest-location-2',
    objectiveId: 'obj-location',
    objectiveTitle: '用完整句说明看球地点（复测）',
    abilitySummary: '用完整句子说明看比赛或运动的地点',
    nextStepTip: '练习用完整句回答地点，如“I watch football at home.”',
    prompt: 'Where do you watch football?',
    promptChinese: '你在哪里看足球比赛？',
    requirementText: '要求：请用完整句子回答地点（如 I watch football at home.）。',
    requiresFullSentence: true,
    acceptsShortAnswer: false,
    phraseChoices: ['at home', 'on TV', 'at school'],
    sentenceStarter: 'I watch football ______.',
    sampleAnswer: 'I watch football at home.',
  },
  {
    id: 'retest-partner-3',
    objectiveId: 'obj-partner',
    objectiveTitle: '回答运动时间（复测）',
    abilitySummary: '听懂交际提问并回答运动时间',
    nextStepTip: '练习回答“When do you play football?”，如“after school”或完整句',
    prompt: 'When do you play football?',
    promptChinese: '你什么时候踢足球？',
    requirementText: '要求：回答踢足球的时间，可以用完整句子，也可以简短回答。',
    requiresFullSentence: false,
    acceptsShortAnswer: true,
    phraseChoices: ['after school', 'on weekends', 'after school with friends'],
    sentenceStarter: 'I play football ______.',
    sampleAnswer: 'I play football after school.',
  },
  {
    id: 'retest-picture-4',
    objectiveId: 'obj-picture',
    objectiveTitle: '看图描述人物动作（复测）',
    abilitySummary: '观察图片中人物动作并用完整句描述',
    nextStepTip: '练习描述图片中的同学，如“She is watching football.”',
    prompt: 'Look at the girl on the bench. What is she doing?',
    promptChinese: '看长椅上的女孩，她在做什么？',
    requirementText: '要求：观察左侧图片长椅上的女孩，用完整句子描述她在做什么。',
    requiresFullSentence: true,
    acceptsShortAnswer: false,
    phraseChoices: ['watching football', 'watching the game', 'on the bench'],
    sentenceStarter: 'She is ______.',
    sampleAnswer: 'She is watching football.',
  },
];

export const PREVIEW_SPORTS_UNIT: UnitConfig = {
  id: 'preview-test-sports',
  isPreviewTest: true,
  label: '功能测试',
  grade: '四年级',
  volume: '下册',
  unit: 'Unit 3 · Sports & Hobbies',
  topic: '体育话题',
  vocabulary: [
    'football',
    'basketball',
    'play',
    'playing',
    'watch',
    'watching',
    'like',
    'they',
    'she',
    'are',
    'is',
    'at school',
    'in the park',
    'on the playground',
    'at home',
    'on TV',
    'with my friends',
    'after school',
    'on weekends',
  ],
  patterns: [
    'What do you like to do?',
    'What do you like doing?',
    'I like playing ...',
    'I like to play ...',
    'I like watching ...',
    'I like to watch ...',
    'Where do you play football?',
    'I play football ...',
    'Where do you watch football?',
    'I watch football ...',
    'Who do you play football with?',
    'When do you play football?',
    'They are playing ...',
    'She is watching ...',
  ],
  objectives: [
    '能用完整句型 I like playing/to play ... 或 I like watching/to watch ... 表达喜欢的体育活动',
    '能用完整句型 I play football at school / in the park 等表达地点或同伴',
    '能看图用完整句子描述同学们正在进行的体育活动',
  ],
  scene: {
    title: '体育活动场景 · 在学校操场上',
    description: '同学们正在操场草地上踢足球，还有同学坐在长椅上看球加油。',
    imageUrl: '/src/assets/images/scene_sports_football_1795331712770.jpg',
  },
  initialQuestion: 'What do you like to do?',
  initialQuestionChinese: '你喜欢做什么？',
  initialPhraseChoices: [
    'playing football',
    'watching football',
    'playing basketball',
  ],
  initialSentenceStarter: 'I like ______.',
  speakingPassThreshold: null,
  assessmentTasks: PREVIEW_ASSESSMENT_TASKS,
  retestAssessmentTasks: PREVIEW_RETEST_TASKS,
};

export function createInitialUnitProgress(
  unitId: string,
  studentId = 'student-default',
  studentName = '当前学生'
): UnitProgressState {
  return {
    unitId,
    studentId,
    studentName,
    listening: { completed: false, scorePct: null, passed: null },
    speaking: {
      completed: false,
      scorePct: null,
      passed: null,
      lastScore: null,
      maxScore: 20,
      attempts: [],
    },
    reading: { completed: false, scorePct: null, passed: null },
    writing: { completed: false, scorePct: null, passed: null },
    unitTestPassed: false,
    nextUnitUnlocked: false,
  };
}

export function validateUnitConfig(input: unknown): UnitConfig | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;

  if (
    typeof raw.grade !== 'string' ||
    !raw.grade.trim() ||
    typeof raw.volume !== 'string' ||
    !raw.volume.trim() ||
    typeof raw.unit !== 'string' ||
    !raw.unit.trim() ||
    !Array.isArray(raw.vocabulary) ||
    raw.vocabulary.length === 0 ||
    !Array.isArray(raw.patterns) ||
    raw.patterns.length === 0 ||
    !Array.isArray(raw.objectives) ||
    raw.objectives.length === 0
  ) {
    return null;
  }

  const sceneObj =
    raw.scene && typeof raw.scene === 'object'
      ? (raw.scene as Record<string, unknown>)
      : {};

  const initialQuestion =
    typeof raw.initialQuestion === 'string' && raw.initialQuestion.trim()
      ? raw.initialQuestion.trim()
      : String(raw.patterns[0]);

  const fallbackChoices = Array.isArray(raw.initialPhraseChoices)
    ? raw.initialPhraseChoices
    : Array.isArray(raw.defaultWordChoices)
      ? raw.defaultWordChoices
      : raw.vocabulary.slice(0, 3);

  const initialSentenceStarter =
    typeof raw.initialSentenceStarter === 'string' && raw.initialSentenceStarter.trim()
      ? raw.initialSentenceStarter.trim()
      : typeof raw.defaultSentenceStarter === 'string' && raw.defaultSentenceStarter.trim()
        ? raw.defaultSentenceStarter.trim()
        : 'I like ______.';

  const threshold =
    typeof raw.speakingPassThreshold === 'number' &&
    Number.isFinite(raw.speakingPassThreshold) &&
    raw.speakingPassThreshold >= 0 &&
    raw.speakingPassThreshold <= 100
      ? raw.speakingPassThreshold
      : null;

  const parseTaskList = (arr: unknown, fallback: AssessmentTask[]): AssessmentTask[] => {
    if (!Array.isArray(arr) || arr.length === 0) return fallback;
    return arr.slice(0, 4).map((item, idx) => {
      const t = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const fb = fallback[idx] ?? fallback[0];
      return {
        id: typeof t.id === 'string' && t.id.trim() ? t.id.trim() : `${fb.id}-${idx}`,
        objectiveId:
          typeof t.objectiveId === 'string' && t.objectiveId.trim()
            ? t.objectiveId.trim()
            : fb.objectiveId,
        objectiveTitle:
          typeof t.objectiveTitle === 'string' && t.objectiveTitle.trim()
            ? t.objectiveTitle.trim()
            : fb.objectiveTitle,
        abilitySummary:
          typeof t.abilitySummary === 'string' && t.abilitySummary.trim()
            ? t.abilitySummary.trim()
            : fb.abilitySummary,
        nextStepTip:
          typeof t.nextStepTip === 'string' && t.nextStepTip.trim()
            ? t.nextStepTip.trim()
            : fb.nextStepTip,
        prompt:
          typeof t.prompt === 'string' && t.prompt.trim() ? t.prompt.trim() : fb.prompt,
        promptChinese:
          typeof t.promptChinese === 'string' && t.promptChinese.trim()
            ? t.promptChinese.trim()
            : fb.promptChinese,
        requirementText:
          typeof t.requirementText === 'string' && t.requirementText.trim()
            ? t.requirementText.trim()
            : fb.requirementText,
        requiresFullSentence:
          typeof t.requiresFullSentence === 'boolean'
            ? t.requiresFullSentence
            : fb.requiresFullSentence,
        acceptsShortAnswer:
          typeof t.acceptsShortAnswer === 'boolean'
            ? t.acceptsShortAnswer
            : fb.acceptsShortAnswer,
        phraseChoices:
          Array.isArray(t.phraseChoices) && t.phraseChoices.length > 0
            ? t.phraseChoices.map((p) => String(p).trim()).filter(Boolean).slice(0, 3)
            : fb.phraseChoices,
        sentenceStarter:
          typeof t.sentenceStarter === 'string' && t.sentenceStarter.trim()
            ? t.sentenceStarter.trim()
            : fb.sentenceStarter,
        sampleAnswer:
          typeof t.sampleAnswer === 'string' && t.sampleAnswer.trim()
            ? t.sampleAnswer.trim()
            : fb.sampleAnswer,
      };
    });
  };

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `unit-${Date.now()}`,
    isPreviewTest: Boolean(raw.isPreviewTest),
    label: typeof raw.label === 'string' ? raw.label : undefined,
    grade: raw.grade.trim(),
    volume: raw.volume.trim(),
    unit: raw.unit.trim(),
    topic: typeof raw.topic === 'string' && raw.topic.trim() ? raw.topic.trim() : raw.unit.trim(),
    vocabulary: raw.vocabulary.map((v) => String(v).trim()).filter(Boolean),
    patterns: raw.patterns.map((p) => String(p).trim()).filter(Boolean),
    objectives: raw.objectives.map((o) => String(o).trim()).filter(Boolean),
    scene: {
      title:
        typeof sceneObj.title === 'string' && sceneObj.title.trim()
          ? sceneObj.title.trim()
          : `${raw.unit.trim()} 场景`,
      description:
        typeof sceneObj.description === 'string' && sceneObj.description.trim()
          ? sceneObj.description.trim()
          : '请观察场景图片，结合本单元学过的词句回答问题。',
      imageUrl:
        typeof sceneObj.imageUrl === 'string' && sceneObj.imageUrl.trim()
          ? sceneObj.imageUrl.trim()
          : '/src/assets/images/scene_sports_football_1795331712770.jpg',
    },
    initialQuestion,
    initialQuestionChinese:
      typeof raw.initialQuestionChinese === 'string' && raw.initialQuestionChinese.trim()
        ? raw.initialQuestionChinese.trim()
        : '请用英语回答当前问题。',
    initialPhraseChoices: fallbackChoices
      .map((w) => String(w).trim())
      .filter(Boolean)
      .slice(0, 3),
    initialSentenceStarter,
    speakingPassThreshold: threshold,
    assessmentTasks: parseTaskList(raw.assessmentTasks, PREVIEW_ASSESSMENT_TASKS),
    retestAssessmentTasks: Array.isArray(raw.retestAssessmentTasks) && raw.retestAssessmentTasks.length === 0
      ? []
      : parseTaskList(raw.retestAssessmentTasks, PREVIEW_RETEST_TASKS),
  };
}

export function resolveInitialUnitConfig(): UnitConfig | null {
  if (typeof window === 'undefined') return PREVIEW_SPORTS_UNIT;

  const params = new URLSearchParams(window.location.search);
  if (params.get('empty') === '1' || params.get('unloaded') === '1') {
    return null;
  }

  const configParam = params.get('config');
  if (configParam) {
    try {
      const parsed = JSON.parse(configParam);
      return validateUnitConfig(parsed);
    } catch {
      try {
        const decoded = JSON.parse(atob(configParam));
        return validateUnitConfig(decoded);
      } catch {
        return null;
      }
    }
  }

  const globalCfg = (window as unknown as { __AURA_EDU_UNIT_CONFIG__?: unknown })
    .__AURA_EDU_UNIT_CONFIG__;
  if (globalCfg !== undefined) {
    return validateUnitConfig(globalCfg);
  }

  return PREVIEW_SPORTS_UNIT;
}
