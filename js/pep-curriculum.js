/* PEP curriculum registry. Directory evidence is not a playable lesson or mastery evidence. */
(function (root) {
  'use strict';
  const SOURCES = {
    teacherNotice: 'https://www.pep.com.cn/rjdt/rjdt/202409/t20240905_1994696.shtml',
    teacherTranscript: 'https://www.scribd.com/document/882420017/义务教育教科书教师教学用书-英语-PEP-三年级上册-Units-1-2',
    overview: 'https://www.pep.com.cn/xw/zt/hd/12/xjcjs/xx/202409/t20240920_1995564.html'
  };
  const directories = [
    [3, 'upper', '3s', ['Making friends', 'Different families', 'Amazing animals', 'Plants around us', 'The colourful world', 'Useful numbers'], 'Being a good guest'],
    [3, 'lower', '3x', ['Meeting new people', 'Expressing yourself', 'Learning better', 'Healthy food', 'Old toys', 'Numbers in life'], null],
    [4, 'upper', '4s', ['Helping at home', 'My friends', 'Places we live in', 'Helping in the community', 'The weather and us', 'Changing for the seasons'], 'Let’s help!'],
    [4, 'lower', '4x', ['Class rules', 'Family rules', 'Time for school', 'Going shopping', 'Farms and us', 'From farm to table'], 'A great weekend plan'],
    [5, 'upper', '5s', ['Different friends', 'My feelings', 'Work and play', 'Healthy habits', 'Food we eat', 'Nature and us'], 'New Year’s party'],
    [5, 'lower', '5x', ['Following the rules', 'Our community', 'Life in different seasons', 'My hometown', 'Travelling around', 'Making a travel plan'], null],
    [6, 'upper', '6s', ['Amazing places', 'Getting together', 'Healthy life', 'Managing money well', 'Exploring space', 'Energy, nature and us'], 'Learning in museums'],
    [6, 'lower', '6x', [null, null, null, null], null]
  ];
  const books = directories.map(([grade, term, code, titles, revision]) => {
    const id = 'PEP-NEW-G' + grade + '-' + term.toUpperCase();
    const known = titles.every(Boolean);
    const source = known ? 'https://www.pep.com.cn/zslth/yyptzy/xypep/' + code + '/' : null;
    return {
      id, series: 'PEP', startGrade: 3, grade, term,
      label: grade + '年级' + (term === 'upper' ? '上册' : '下册'),
      resourceFamily: 'pep-yyptzy-new', editionYear: null,
      editionStatus: 'copyright-page-pending', directoryStatus: known ? 'official-directory-checked' : 'pending',
      source, checkedOn: '2026-11-16',
      note: known ? '目录来自人教社配套资源；具体版次须核对版权页。' : '仅依据新教材简介预留四单元，名称未知；未混入旧版目录。',
      revision: {title: revision, status: known ? (revision ? 'title-checked' : 'section-checked-title-unspecified') : 'pending'},
      units: titles.map((title, i) => ({
        id: id + '-U' + (i + 1), bookId: id, number: i + 1, title,
        directoryStatus: title ? 'official-directory-checked' : 'pending', directorySource: source,
        contentStatus: 'pending', learningEnabled: false,
        // No authored samples or legacy five-grade records are silently promoted to PEP content.
        vocabulary: [], patterns: [], sourcePages: [],
        review: {copyrightPage: false, vocabulary: false, patterns: false, tasks: false, independentAssessment: false, browser: false},
        assessmentVersion: null,
        modules: ['sentence', 'word-sound', 'speaking'].map(key => ({key, contentStatus: 'pending', taskIds: []}))
      }))
    };
  });
  const first = books[0].units[0];
  first.contentStatus = 'teacher-reference-reviewed';
  first.reference = {
    publisherNotice: SOURCES.teacherNotice,
    readableTranscript: SOURCES.teacherTranscript,
    evidenceLevel: 'public-teacher-guide-transcript',
    guidePrintedPages: [13, 14, 15],
    textbookPageNumbers: null,
    limitation: '已阅读公开教参转录文本；尚未逐页核对学生课本、版权页与正式单元词表。教参页码不是学生课本页码。'
  };
  first.blueprint = {
    sourceBasedGoals: [
      '向新朋友问好并介绍自己，作出合适回应。',
      '在图片和动作支持下学习身体部位及友好相处的相关词语。',
      '学习字母 Aa—Dd 的名称音、相关发音、大小写辨认和书写。',
      '用适当的表达提供帮助、分享与表达感谢。'
    ],
    excludedAssumptions: ['不把整关 am/is/are 规则辨析作为本单元入门任务。', '不默认所有新词都要求脱离图片独立默写。', '不从兴趣聊天或其他未核实的单元句型开始。'],
    // These stages are the original product design, not copied textbook exercises.
    productStages: [
      {id: 'greet', module: 'sentence', goal: '分辨初次见面时适当的问候与回应', support: '图片、可重听的短语和按需中文帮助'},
      {id: 'notice-words', module: 'word-sound', goal: '把本单元核实后的词音与图意联系起来，另设 Aa—Dd 活动', support: '图音匹配；书写要求待教材核对，不先写全词听写题'},
      {id: 'meet-companion', module: 'speaking', goal: '向伙伴问好、介绍自己并回应', support: '当前问题旁显示情境和提示；不使用空白自由聊天框'},
      {id: 'new-partner', module: 'speaking', goal: '换一个伙伴，观察学生是否能够减少提示完成相同交际目标', support: '练习时按需提示；独立检查另行设计，不与跟读合并'}
    ],
    responsePolicy: {
      shortName: '仅回答昵称时先认可意思，再示范与自我介绍相符的完整表达，等待学生尝试后再延伸。',
      completeCommunicativeAct: '问候、感谢等本身适当的简短表达直接认可，不强制扩成长句。',
      alternatives: '依据当前交际目标接受合理表达，不与示例逐字匹配。',
      uncertainty: '没听清时确认或重听；不把语音识别失败记作语言知识错误。',
      language: '默认简单英语，主动请求帮助时简短中文；不因疑似其他语言而突然切换。',
      timing: '每轮一个短问题，留思考时间；支持重听和实际有效的慢速播放。',
      evidenceKinds: ['imitation', 'supported-expression', 'independent-expression'],
      automaticMastery: false
    }
  };
  function deepFreeze(value) {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
    return value;
  }
  const registry = deepFreeze({schema: 1, version: 'PEP-DIRECTORY-2026.11.16', checkedOn: '2026-11-16', sources: SOURCES, books});
  function getUnit(unitId) {
    if (typeof unitId !== 'string') return null;
    for (const book of books) {
      const found = book.units.find(unit => unit.id === unitId);
      if (found) return found;
    }
    return null;
  }
  function readiness(unitId) {
    const unit = getUnit(unitId);
    if (!unit) return {enabled: false, reasons: ['未知课程单元']};
    const book = books.find(item => item.id === unit.bookId);
    const reasons = [];
    if (unit.directoryStatus !== 'official-directory-checked') reasons.push('单元目录待核对');
    if (book.editionStatus !== 'copyright-page-checked' || !unit.review.copyrightPage) reasons.push('版权页与版次待核对');
    if (unit.contentStatus !== 'approved') reasons.push('课程内容尚未完成审核');
    if (!unit.vocabulary.length || !unit.review.vocabulary) reasons.push('词汇及学习要求待核对');
    if (!unit.patterns.length || !unit.review.patterns) reasons.push('句型和交际表达待核对');
    if (!unit.sourcePages.length) reasons.push('缺少学生课本页码依据');
    if (!unit.review.tasks || unit.modules.some(m => !m.taskIds.length || m.contentStatus !== 'approved')) reasons.push('三个板块的任务尚未完成');
    if (!unit.review.independentAssessment || !unit.assessmentVersion) reasons.push('独立检查方案待核对');
    if (!unit.review.browser) reasons.push('浏览器与真实语音验收待完成');
    if (unit.learningEnabled !== true) reasons.push('学生课程入口尚未开放');
    return {enabled: reasons.length === 0, reasons};
  }
  function summary() {
    const units = books.flatMap(book => book.units);
    return {
      books: books.length,
      directoryCheckedBooks: books.filter(book => book.directoryStatus === 'official-directory-checked').length,
      directoryCheckedUnits: units.filter(unit => unit.directoryStatus === 'official-directory-checked').length,
      reservedUnits: units.filter(unit => unit.directoryStatus === 'pending').length,
      referenceReviewedUnits: units.filter(unit => unit.contentStatus === 'teacher-reference-reviewed').length,
      enabledUnits: units.filter(unit => readiness(unit.id).enabled).length
    };
  }
  root.AuraPepCurriculum = deepFreeze({registry, getUnit, readiness, summary});
})(typeof window === 'undefined' ? globalThis : window);
