import { type FunctionDeclaration, Type } from '@google/genai';

export interface ServerAssessmentTask {
  id: string;
  objectiveId: string;
  objectiveTitle: string;
  prompt: string;
  promptChinese: string;
  requirementText: string;
  requiresFullSentence: boolean;
  acceptsShortAnswer: boolean;
  phraseChoices: string[];
  sentenceStarter: string;
  sampleAnswer: string;
}

export interface ServerUnitConfig {
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
  scene: {
    title: string;
    description: string;
    imageUrl: string;
  };
  assessmentTasks?: ServerAssessmentTask[];
  initialQuestion: string;
  initialQuestionChinese: string;
  initialPhraseChoices: string[];
  initialSentenceStarter: string;
}

export function validateServerUnitConfig(input: unknown): ServerUnitConfig | null {
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

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : 'unit-session',
    isPreviewTest: Boolean(raw.isPreviewTest),
    label: typeof raw.label === 'string' ? raw.label : undefined,
    grade: raw.grade.trim().slice(0, 80),
    volume: raw.volume.trim().slice(0, 80),
    unit: raw.unit.trim().slice(0, 120),
    topic:
      typeof raw.topic === 'string' && raw.topic.trim()
        ? raw.topic.trim().slice(0, 120)
        : raw.unit.trim().slice(0, 120),
    vocabulary: raw.vocabulary.map((v) => String(v).trim()).filter(Boolean).slice(0, 60),
    patterns: raw.patterns.map((p) => String(p).trim()).filter(Boolean).slice(0, 30),
    objectives: raw.objectives.map((o) => String(o).trim()).filter(Boolean).slice(0, 15),
    scene: {
      title:
        typeof sceneObj.title === 'string' && sceneObj.title.trim()
          ? sceneObj.title.trim().slice(0, 120)
          : raw.unit.trim().slice(0, 120),
      description:
        typeof sceneObj.description === 'string' && sceneObj.description.trim()
          ? sceneObj.description.trim().slice(0, 300)
          : '',
      imageUrl:
        typeof sceneObj.imageUrl === 'string' ? sceneObj.imageUrl.trim().slice(0, 300) : '',
    },
    assessmentTasks: Array.isArray(raw.assessmentTasks)
      ? raw.assessmentTasks.map(validateServerAssessmentTask).filter((task): task is ServerAssessmentTask => task !== null).slice(0, 4)
      : [],
    initialQuestion:
      typeof raw.initialQuestion === 'string' && raw.initialQuestion.trim()
        ? raw.initialQuestion.trim().slice(0, 200)
        : String(raw.patterns[0]).trim().slice(0, 200),
    initialQuestionChinese:
      typeof raw.initialQuestionChinese === 'string' && raw.initialQuestionChinese.trim()
        ? raw.initialQuestionChinese.trim().slice(0, 200)
        : '请用英语回答当前问题。',
    initialPhraseChoices: fallbackChoices
      .map((w) => String(w).trim())
      .filter(Boolean)
      .slice(0, 3),
    initialSentenceStarter: initialSentenceStarter.slice(0, 120),
  };
}

export function validateServerAssessmentTask(input: unknown): ServerAssessmentTask | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  if (typeof raw.prompt !== 'string' || !raw.prompt.trim()) return null;

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 80) : 'task',
    objectiveId:
      typeof raw.objectiveId === 'string' && raw.objectiveId.trim()
        ? raw.objectiveId.trim().slice(0, 80)
        : 'obj',
    objectiveTitle:
      typeof raw.objectiveTitle === 'string' && raw.objectiveTitle.trim()
        ? raw.objectiveTitle.trim().slice(0, 120)
        : '口语表达',
    prompt: raw.prompt.trim().slice(0, 220),
    promptChinese:
      typeof raw.promptChinese === 'string' ? raw.promptChinese.trim().slice(0, 220) : '',
    requirementText:
      typeof raw.requirementText === 'string'
        ? raw.requirementText.trim().slice(0, 220)
        : '',
    requiresFullSentence: Boolean(raw.requiresFullSentence),
    acceptsShortAnswer: Boolean(raw.acceptsShortAnswer),
    phraseChoices: Array.isArray(raw.phraseChoices)
      ? raw.phraseChoices.map((p) => String(p).trim()).filter(Boolean).slice(0, 4)
      : [],
    sentenceStarter:
      typeof raw.sentenceStarter === 'string' ? raw.sentenceStarter.trim().slice(0, 120) : '',
    sampleAnswer:
      typeof raw.sampleAnswer === 'string' ? raw.sampleAnswer.trim().slice(0, 200) : '',
  };
}

export const recordPedagogicalTurnDeclaration: FunctionDeclaration = {
  name: 'record_pedagogical_turn',
  description:
    'Evaluate the student spoken turn, provide per-question hint metadata (English question, Chinese meaning, 2-3 matching English phrases, and sentence starter with blank), and optionally supply a single kid-friendly grammar correction.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      studentTranscriptSummary: {
        type: Type.STRING,
        description:
          'Exact or clean transcript of what the student said in English, or "[unheard]" if blank/inaudible/unclear.',
      },
      outcome: {
        type: Type.STRING,
        enum: [
          'unheard',
          'scaffolding_keyword',
          'grammar_correction',
          'independent_correct',
          'assisted_correct',
          'corrected_complete',
          'needs_retry',
        ],
        description:
          'unheard: silent/unclear audio (not a grammar error, not passed); scaffolding_keyword: student gave only a keyword or short fragment (like "Football." or "At school.") and needs to complete the full sentence; grammar_correction: student expressed an idea with a grammar error (verb form, subject-verb agreement, missing word, word order) and must stay on the same question to retry; independent_correct: grammatically valid complete answer without prior hints or correction on this question; assisted_correct: grammatically valid complete answer after using hints or keyword scaffolding; corrected_complete: grammatically valid complete answer after a previous grammar_correction on this question; needs_retry: off-target answer requiring another try.',
      },
      hintStage: {
        type: Type.STRING,
        enum: ['none', 'phrases', 'phrases_and_starter'],
        description:
          'none: collapsed (MUST be "none" whenever moving to a brand-new question); phrases: show matching phrases; phrases_and_starter: show phrases and sentence starter (e.g. when student only gave a keyword/location and needs to finish the full sentence).',
      },
      demoSentence: {
        type: Type.STRING,
        description:
          'Optional full English demonstration sentence when outcome is "scaffolding_keyword" or "grammar_correction" (e.g. "I play football with my friends."). Shown as quiet text in hints without replaying audio.',
      },
      grammarExplanationCn: {
        type: Type.STRING,
        description:
          'Required when outcome is "grammar_correction". One short, kid-friendly Chinese sentence explaining the single most important fix (e.g. "这里把 play 改成 playing" or "主语是 I，这里用 play").',
      },
      correctedExample: {
        type: Type.STRING,
        description:
          'Required when outcome is "grammar_correction". The corrected full English sentence preserving the student original meaning (e.g. "I like playing football." or "I play football at school.").',
      },
      nextQuestion: {
        type: Type.STRING,
        description:
          'The single short English question shown on screen for the student. Keep the EXACT current question during unheard, scaffolding_keyword, grammar_correction, or needs_retry. Only advance to a new follow-up question after independent_correct, assisted_correct, or corrected_complete (or when narrowing "I like football." to playing vs watching).',
      },
      nextQuestionChinese: {
        type: Type.STRING,
        description:
          'Natural, accurate Chinese translation of nextQuestion (e.g. "你喜欢做什么？" or "你在哪里踢足球？"). Always match nextQuestion!',
      },
      nextPhraseChoices: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          '2 to 3 short learned English phrases from this unit that directly answer nextQuestion (e.g. for "What do you like to do?" -> ["playing football", "watching football", "playing basketball"]; for "Where do you play football?" -> ["at school", "in the park", "on the playground"]). NEVER keep old phrases from a previous question!',
      },
      nextSentenceStarter: {
        type: Type.STRING,
        description:
          'A short English sentence starter with a blank ______ that directly fits nextQuestion (e.g. "I like ______." for hobby questions, "I play football ______." for where/who playing football, "I watch football ______." for watching football).',
      },
      isPracticeCompleted: {
        type: Type.BOOLEAN,
        description:
          'Set true ONLY after the student has completed a full 3-4 question practice flow cleanly (on outcome independent_correct, assisted_correct, or corrected_complete) and you are announcing that this practice is finished instead of asking another question.',
      },
    },
    required: [
      'outcome',
      'hintStage',
      'nextQuestion',
      'nextQuestionChinese',
      'nextPhraseChoices',
      'nextSentenceStarter',
    ],
  },
};

export const recordAssessmentTurnDeclaration: FunctionDeclaration = {
  name: 'record_assessment_turn',
  description:
    'Score the student response for the current speaking assessment task using the 5-point rubric (relevance 0-2, objective 0-2, clarity 0-1) and decide if one brief follow-up prompt is helpful within this same task.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      studentTranscriptSummary: {
        type: Type.STRING,
        description:
          'Exact or clean English transcript of what the student said, or "[unheard]" if silent/unclear.',
      },
      isUnheard: {
        type: Type.BOOLEAN,
        description:
          'True ONLY if the recording was silent, noisy, or unintelligible so the student should re-record with zero penalty.',
      },
      relevanceScore: {
        type: Type.INTEGER,
        description:
          '0, 1, or 2: 2 = directly answers the required information; 1 = partially answers; 0 = off-topic.',
      },
      objectiveScore: {
        type: Type.INTEGER,
        description:
          '0, 1, or 2: 2 = fully meets the task expression goal (full sentence when required, or short answer if short answer is accepted); 1 = partial (e.g. short phrase "At school." when full sentence was required); 0 = goal not met.',
      },
      clarityScore: {
        type: Type.INTEGER,
        description:
          '0 or 1: 1 = meaning is understandable (NEVER deduct for accent); 0 = cannot be understood.',
      },
      shouldAskFollowUp: {
        type: Type.BOOLEAN,
        description:
          'True ONLY on the initial attempt when the student gave a partial answer (e.g. "At school." when full sentence is required) and should try completing a full sentence once within this same task.',
      },
      followUpPromptEn: {
        type: Type.STRING,
        description:
          'If shouldAskFollowUp is true, a brief slow English prompt encouraging the student to complete the sentence within this task (e.g., "Yes, at school! Now try a full sentence starting with I play football.").',
      },
      feedbackReasonCn: {
        type: Type.STRING,
        description:
          'One concise, warm Chinese sentence explaining what the student did well or why partial credit was given (e.g., "你自己答出了地点。" or "你独立用完整句子回答了问题。").',
      },
      modelAnswerEn: {
        type: Type.STRING,
        description:
          'One natural model English sentence appropriate for this task (e.g., "I play football at school.").',
      },
    },
    required: [
      'isUnheard',
      'relevanceScore',
      'objectiveScore',
      'clarityScore',
      'shouldAskFollowUp',
      'feedbackReasonCn',
      'modelAnswerEn',
    ],
  },
};

export function buildSystemInstruction(unit: ServerUnitConfig): string {
  return `You are AURA EDU's patient, encouraging English Speaking Partner for elementary/middle school students.

CURRENT UNIT CONFIGURATION (STRICT BOUNDARY — USE ONLY THIS UNIT'S LEARNED WORDS & PATTERNS):
- Grade & Volume: ${unit.grade} ${unit.volume}
- Unit & Topic: ${unit.unit} (${unit.topic})
- Scene: ${unit.scene.title} — ${unit.scene.description}
- Learned Vocabulary: ${unit.vocabulary.join(', ')}
- Learned Sentence Patterns: ${unit.patterns.join(' | ')}
- Learning Objectives:
${unit.objectives.map((o, idx) => `  ${idx + 1}. ${o}`).join('\n')}
- Initial Question: "${unit.initialQuestion}" (${unit.initialQuestionChinese})
${unit.assessmentTasks?.length ? 'ORDERED PRACTICE TARGETS: Work through each prompt in order. Practice the same skills as the assessment. For a partial response, scaffold the current prompt rather than advancing. A retry does not count toward completion. Report the outcome using the tool and follow the next question it returns.\n' + unit.assessmentTasks.map((task, index) => (index + 1) + '. ' + task.prompt + ' — ' + task.requirementText).join('\n') : ''}

CORE SPOKEN AUDIO RULES:
1. Speak ENGLISH ONLY in audio! Keep your spoken voice SLOW, clear, warm, and very short (1–2 brief sentences).
2. Speak your feedback/demonstration ONLY ONCE per student turn! NEVER repeat the same sentence twice in one turn or repeat it again after sending the tool result.
3. Ask AT MOST ONE short question per turn.
4. All questions, follow-ups, and hints MUST stay within this unit's learned vocabulary and sentence patterns.
5. Connect naturally to what the student actually said and the prior turns.

EVALUATION, GRAMMAR CORRECTION & SCAFFOLDING FLOW (APPLY TO EVERY QUESTION & FOLLOW-UP):
On every student turn, first understand what the student wants to say, then follow these rules in priority order and ALWAYS call \`record_pedagogical_turn\` BEFORE speaking:

1. **Unheard / Unclear Speech**:
   - If audio is blank, noisy, or unintelligible, do NOT mark as a grammar error and do NOT pass.
   - Spoken reply (slow, short English): "Sorry, I didn't hear that clearly. Please try again."
   - Tool call: \`outcome: "unheard"\`, keep \`nextQuestion\` unchanged, \`hintStage: "none"\`.

2. **Grammar Errors (Check Subject-Verb Agreement, Verb Form, Missing Words, Word Order)**:
   - Focus on the SINGLE most important grammar error first.
   - Keep \`nextQuestion\` as the EXACT CURRENT QUESTION so the student stays on this question to retry!
   - Provide a simple 1-sentence Chinese explanation in \`grammarExplanationCn\` and the full corrected English sentence (preserving the student's intended meaning) in \`correctedExample\`.
   - Spoken reply (slow, short English): gently point out the change, model the correct sentence slowly ONCE, and ask the student to repeat it.
   - Required benchmark behaviors:
     - If student says "I like play football.":
       - \`outcome: "grammar_correction"\`, \`grammarExplanationCn: "这里把 play 改成 playing"\`, \`correctedExample: "I like playing football."\`
       - Spoken: "Good try! Change play to playing. Say: I like playing football. Please try again."
       - Note: Both "I like playing football." and "I like to play football." are grammatically correct! If they say "I like to play football.", accept it without correction!
     - If student says "I plays football at school.":
       - \`outcome: "grammar_correction"\`, \`grammarExplanationCn: "主语是 I，这里用 play"\`, \`correctedExample: "I play football at school."\`
       - Spoken: "Almost! After I, use play. Say: I play football at school. Please try again."
     - If the student retries and still makes a grammar error, stay on the same question (\`outcome: "grammar_correction"\`), give a clearer specific hint/explanation, and ask them to try one more time.

3. **Short / Keyword-Only / Incomplete Answers**:
   - If student says only a noun/keyword for an activity (e.g. "Football."):
     - Affirm warmly, keep the current question, set \`outcome: "scaffolding_keyword"\`, \`hintStage: "phrases_and_starter"\`, \`nextSentenceStarter: "I like ______."\`, \`demoSentence: "I like playing football."\`.
     - Spoken (ONCE): "Football! Try starting with: I like..."
   - If student says "I like football." (valid sentence, but unit objective wants specific activity like playing vs watching):
     - Accept it warmly! Follow up asking whether they like playing or watching football:
       - \`nextQuestion: "Do you like playing football or watching football?"\`
       - \`nextQuestionChinese: "你喜欢踢足球还是看足球？"\`
       - \`nextPhraseChoices: ["playing football", "watching football"]\`
       - \`nextSentenceStarter: "I like ______."\`
       - \`hintStage: "phrases"\`
   - If student answers a location question with only a location phrase (e.g. "At school." when asked "Where do you play football?"):
     - First affirm they got the location right! Keep \`nextQuestion: "Where do you play football?"\`, set \`outcome: "scaffolding_keyword"\`, \`hintStage: "phrases_and_starter"\`, \`nextSentenceStarter: "I play football ______."\`, \`demoSentence: "I play football at school."\`.
     - Spoken (ONCE): "Yes, at school! Say: I play football at school. Now you try!"
   - If student answers a partner question with only a phrase (e.g. "With my friends." when asked "Who do you play football with?"):
     - First affirm their meaning! Keep \`nextQuestion: "Who do you play football with?"\`, set \`outcome: "scaffolding_keyword"\`, \`hintStage: "phrases"\`, \`nextPhraseChoices: ["with my friends", "with my classmates", "my friends"]\`, \`nextSentenceStarter: "I play football ______."\`, \`demoSentence: "I play football with my friends."\`.
     - Spoken (ONCE): "With your friends! Say: I play football with my friends. Now you try!"

4. **Correct Complete Answers & Advancing to Follow-Up**:
   - Accept ALL semantically & grammatically valid answers (even if wording changed during retry, e.g. "I like to play football." or "I like playing football.").
   - Outcome:
     - If student fixed a prior grammar error on this question: \`outcome: "corrected_complete"\`.
     - Else if student used hints or keyword scaffolding on this question: \`outcome: "assisted_correct"\`.
     - Else: \`outcome: "independent_correct"\`.
   - Ask ONE contextual follow-up question using this unit's vocabulary/patterns based on what they said:
     - Playing football -> e.g. \`nextQuestion: "Where do you play football?"\`, \`nextQuestionChinese: "你在哪里踢足球？"\`, \`nextPhraseChoices: ["at school", "in the park", "on the playground"]\`, \`nextSentenceStarter: "I play football ______."\`, \`hintStage: "none"\`.
     - Watching football -> e.g. \`nextQuestion: "Where do you watch football?"\`, \`nextQuestionChinese: "你在哪里看足球？"\`, \`nextPhraseChoices: ["at home", "on TV", "with my friends"]\`, \`nextSentenceStarter: "I watch football ______."\`, \`hintStage: "none"\`.
     - After location of playing football -> e.g. \`nextQuestion: "Who do you play football with?"\`, \`nextQuestionChinese: "你和谁一起踢足球？"\`, \`nextPhraseChoices: ["with my friends", "with my classmates", "after school"]\`, \`nextSentenceStarter: "I play football ______."\`, \`hintStage: "none"\`.
   - CRITICAL: Whenever \`nextQuestion\` changes to a NEW question, you MUST set \`hintStage: "none"\` and provide fresh \`nextQuestionChinese\`, \`nextPhraseChoices\` (2–3 options strictly matching the NEW question), and \`nextSentenceStarter\`! Never carry over old question options!

5. **Wrapping Up Practice (\`isPracticeCompleted: true\`)**:
   - Conclude only after all assigned practice targets are met. When there is no ordered list, conclude after covering the core objectives.
   - Set \`isPracticeCompleted: true\`, \`hintStage: "none"\`, \`nextQuestion: "Great job today! You finished this practice!"\`, \`nextQuestionChinese: "这次练习完成了！你今天表现得很棒！"\`, \`nextPhraseChoices: []\`, \`nextSentenceStarter: ""\`.
   - Speak ONE brief, slow English closing remark once (e.g., "Great job today! You finished this practice. Well done!") and do NOT ask another question.
   - Unless concluding the session, keep \`isPracticeCompleted: false\`.`;
}

export function buildAssessmentSystemInstruction(
  unit: ServerUnitConfig,
  task: ServerAssessmentTask,
  isFollowUp: boolean
): string {
  return `You are AURA EDU's fair, warm English Speaking Examiner conducting one task of a unit speaking assessment.

CURRENT UNIT & TASK:
- Grade & Volume: ${unit.grade} ${unit.volume}
- Unit & Topic: ${unit.unit} (${unit.topic})
- Scene: ${unit.scene.title} — ${unit.scene.description}
- Task Objective: ${task.objectiveTitle}
- Task Question: "${task.prompt}" (${task.promptChinese})
- Task Requirement: ${task.requirementText}
- Requires Full Sentence: ${task.requiresFullSentence ? 'YES (short fragment alone gets partial objective score 1/2)' : 'NO (short natural answers are fully accepted for 2/2)'}
- Accepts Short Answer: ${task.acceptsShortAnswer ? 'YES' : 'NO'}
- Sample Model Answer: "${task.sampleAnswer}"
- Current Phase: ${isFollowUp ? 'FOLLOW-UP ATTEMPT within this same task (student already answered once; encourage and confirm completion, do NOT ask another follow-up!)' : 'INITIAL ATTEMPT for this task'}

STRICT 5-POINT SCORING RUBRIC:
1. \`relevanceScore\` (0–2):
   - 2 = directly answers what the task asks
   - 1 = partially answers
   - 0 = off-topic / unrelated
2. \`objectiveScore\` (0–2):
   - 2 = meets the task expression goal (full grammatical sentence if Requires Full Sentence is YES; or short/full valid answer if Accepts Short Answer is YES). Accept all valid variations (e.g., BOTH "I like playing football." and "I like to play football." get 2/2!).
   - 1 = partial goal met (for example, if Requires Full Sentence is YES and student says only "At school." or "Football.", or makes a minor grammar slip like "I like play football." while conveying the idea).
   - 0 = goal not met.
3. \`clarityScore\` (0–1):
   - 1 = meaning is understandable (NEVER deduct points for accent!).
   - 0 = unintelligible.
4. \`isUnheard\`:
   - Set \`isUnheard: true\` ONLY if audio is silent, noise, or completely unintelligible. Record the missing evidence. Do not ask for a repeat.

FOLLOW-UP & SPOKEN RESPONSE RULES:
1. ALWAYS call \`record_assessment_turn\` BEFORE speaking.
2. Speak ENGLISH ONLY, slowly, warmly, and briefly (1–2 short sentences).
3. Set shouldAskFollowUp to false on every response. A comprehensible submission ends this task. Judge meaning, including paraphrases and contractions, without requiring a match to the example. A minor grammar error that does not change the meaning must not reduce relevance. Explain the specific improvement in feedbackReasonCn and move on without asking the learner to repeat.
4. Provide a concise, warm Chinese reason in \`feedbackReasonCn\` (e.g., if student said "At school." on a full-sentence location task, write "你自己答出了地点。"; if full correct sentence, write "你独立用完整句子回答了问题。").`;
}
