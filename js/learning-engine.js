/* AURA EDU 5 — deterministic research prototype; no network or model API. */
(function(){
'use strict';
const C=window.AuraContent;
const VERSION='AURA-Y5-2.0', RULE='INDEPENDENT-80-COVERAGE-1.0';
const PHASES=['diagnostic','practice','reassessment'];
const COUNTS={diagnostic:3,practice:5,reassessment:10};
const MODULES=['G1','G2','G3','S','C'];
const TITLES={G1:'G1 · be 动词搭配',G2:'G2 · 主谓一致',G3:'G3 · 句子组织',S:'Spelling · 词汇与应用',C:'Speaking · 表达准备'};
function clone(x){return JSON.parse(JSON.stringify(x));}
function uid(){return window.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);}
function stamp(){return new Date().toISOString();}
function hash(text){let h=2166136261;for(const char of text){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function shuffle(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function prepare(q,stage){const v=clone(q);v.stage=v.phase=stage;v.focusTag=C.focusTag(q);v.id='Y5-'+hash([v.skill,v.prompt,C.norm(v.answer)].join('|'));return v;}
function signature(q){return q.prompt+'|'+C.norm(q.answer??q.expected);}
function history(state){return state.sessions.flatMap(s=>s.records||[]);}
function empty(learnerId){return {schema:5,version:VERSION,learnerId,grade:5,sessions:[],draft:null,partner:'Leo',sound:true,restEvents:[],gameEvents:[],preferences:{}};}
function validateState(data,id){if(!data||data.schema!==5||data.learnerId!==id||data.grade!==5||!Array.isArray(data.sessions)||!Array.isArray(data.restEvents)||!Array.isArray(data.gameEvents))throw Error('学习记录格式不匹配。为保护数据，已暂停写入。');if(data.draft&&(data.draft.learnerId!==id||data.draft.grade!==5))throw Error('暂停任务的身份不一致。');return data;}
function pool(module,stage,form){
 if(C.skills[module])return C.skills[module].flatMap(tag=>C.similarQuestions(tag,form*7).filter((q,i)=>stage==='reassessment'?i>=8:i<8).map(q=>prepare(q,stage)));
 if(module==='S'){
  const words=stage==='reassessment'?C.words.slice(8):C.words.slice(0,8);
  const qs=words.map(([word,zh])=>prepare({prompt:'拼写线索：'+zh,answer:word,options:[],skill:'SPELL',type:'input',focusTag:'SPELL:'+word,hints:['先回想这个词，再想字母组合。','词首 '+word.slice(0,2)+'；共 '+word.length+' 个字母。','参考拼写：'+word]},stage));
  if(stage==='reassessment')for(const tag of ['G1:is','G1:are','G2:third','G2:base','G3:statement'])qs.push(...C.similarQuestions(tag,form*7).slice(8).map(q=>prepare(q,stage)));
  return qs;
 }
 return C.bank('C',form%2).filter(q=>q.phase===stage).map(q=>prepare(q,stage));
}
function choose(poolItems,n,avoid,seen,rng){
 const unique=[...new Map(poolItems.map(q=>[signature(q),q])).values()].filter(q=>!avoid.has(signature(q)));
 const candidates=[...shuffle(unique.filter(q=>!seen.has(q.id)),rng),...shuffle(unique.filter(q=>seen.has(q.id)),rng)];
 if(candidates.length<n)throw Error('该知识点可用题目不足，已停止出题，不能用重复题凑数。');
 return candidates.slice(0,n);
}
function mistakeTags(records){const counts={};for(const r of records.filter(r=>r.firstAttemptCorrect===false))counts[r.errorTag||r.focusTag]=(counts[r.errorTag||r.focusTag]||0)+1;return Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);}
function createSession(state,module,options={}){
 if(!MODULES.includes(module))throw Error('未知关卡。');
 if(!options.focusTag&&!eligible(state,module))throw Error('前一关独立复测尚未通过。');
 const completed=state.sessions.filter(s=>s.moduleId===module&&s.kind==='assessment').length,form=completed%2;
 const records=history(state),seen=new Set(records.map(r=>r.questionId)),avoid=new Set(),sets={};
 const rng=options.rng||Math.random;const wordFocus=options.focusTag?.startsWith('SPELL:')?options.focusTag.slice(6):null;const wordMeaning=C.words.find(w=>w[0]===wordFocus)?.[1];
 for(const stage of PHASES){
  let candidates=options.focusTag&&C.skills[module]?C.similarQuestions(options.focusTag,form*7).filter((q,i)=>stage==='reassessment'?i>=8:i<8).map(q=>prepare(q,stage)):pool(module,stage,form);
  let count=COUNTS[stage];if(wordFocus){if(!wordMeaning)throw Error('该错词暂未配置巩固内容。');const clues={school:'I go to ___.',teacher:'My ___ is kind.',classroom:'This is my ___.',student:'I am a ___.',breakfast:'I eat ___ every morning.',morning:'We read in the ___.',homework:'I do my ___ after school.',evening:'We rest in the ___.',friend:'Mia is my ___.',happy:'I feel ___ today.',helpful:'My partner is very ___.',together:'We learn ___.',garden:'The flowers are in the ___.',library:'We read in the ___.',window:'Please open the ___.',partner:'Leo is my learning ___.',bridge:'We walk over the ___.',castle:'The king lives in the ___.',rabbit:'The ___ has long ears.',lion:'The ___ has a mane.'};const prompts=stage==='diagnostic'?['错词回顾：请拼写“'+wordMeaning+'”。']:stage==='practice'?['把“'+wordMeaning+'”的英文填入句子：'+clues[wordFocus],'请再拼写“'+wordMeaning+'”，需要时可以向伙伴求助。']:['不看提示，再写一次“'+wordMeaning+'”的英文。'];candidates=prompts.map(prompt=>prepare({prompt,answer:wordFocus,options:[],skill:'SPELL',focusTag:options.focusTag,type:'input',hints:['先想这个词的字母组合。','词首 '+wordFocus.slice(0,2)+'；共 '+wordFocus.length+' 个字母。','参考拼写：'+wordFocus]},stage));count=prompts.length;}
  if(module==='C'&&stage==='reassessment')count=5; // Content preparation is not a speaking proficiency test.
  if(options.focusTag&&!wordFocus)count=stage==='diagnostic'?2:stage==='practice'?4:4;
  let selected;
  if(C.skills[module]&&!options.focusTag){
   const blueprint=module==='G1'?(stage==='reassessment'?['G1:am','G1:am','G1:is','G1:is','G1:is','G1:is','G1:are','G1:are','G1:are','G1:are']:stage==='diagnostic'?C.skills[module]:['G1:am','G1:is','G1:are','G1:is','G1:are']):Array.from({length:count},(_,i)=>C.skills[module][i%C.skills[module].length]);
   selected=[];for(const tag of blueprint){const q=choose(candidates.filter(q=>q.focusTag===tag),1,avoid,seen,rng)[0];selected.push(q);avoid.add(signature(q));}
  }else if(module==='S'&&stage==='reassessment'&&!wordFocus){
   selected=choose(candidates.filter(q=>q.skill==='SPELL'),5,avoid,seen,rng);for(const q of selected)avoid.add(signature(q));
   for(const tag of ['G1:is','G1:are','G2:third','G2:base','G3:statement']){const q=choose(candidates.filter(q=>q.focusTag===tag),1,avoid,seen,rng)[0];selected.push(q);avoid.add(signature(q));}
  }else{selected=choose(candidates,count,avoid,seen,rng);for(const q of selected)avoid.add(signature(q));}
  sets[stage]=shuffle(selected,rng);
 }
 const s={id:uid(),learnerId:state.learnerId,grade:5,courseVersion:VERSION,contentVersion:C.version,ruleVersion:RULE,moduleId:module,kind:options.focusTag?'focus':'assessment',focusTag:options.focusTag||null,sourceEvidence:clone(options.sourceEvidence||[]),returnTo:options.returnTo||null,form,startedAt:stamp(),completedAt:null,sets,records:[],phase:'diagnostic',index:0,current:null,selected:[],input:'',answered:false,hintLevel:0,decisions:[],pauses:[],explanations:[],practiceSerial:0};
 s.review=!!wordFocus||Object.values(sets).flat().some(q=>seen.has(q.id));s.wordReview=!!wordFocus;s.priorFocus=wrongBook(state).filter(w=>w.priority>=3).slice(0,2).map(w=>({tag:w.tag,sourceQuestionIds:w.sourceQuestionIds,sourceEvidence:w.sourceEvidence}));
 return s;
}
function item(s){return s.sets[s.phase][s.index];}
function enterItem(s){const q=item(s);s.current={questionId:q.id,stage:s.phase,focusTag:q.focusTag,skill:q.skill,prompt:q.prompt,expected:q.answer,firstAttemptCorrect:null,highestHintUsed:0,attempts:[],startedAt:stamp(),completedAt:null};s.selected=[];s.input='';s.answered=false;s.hintLevel=0;return q;}
function hint(s){if(s.phase!=='practice'||s.answered)throw Error('独立测试不提供知识提示。');if(s.hintLevel>=3)return null;s.hintLevel++;s.current.highestHintUsed=Math.max(s.current.highestHintUsed,s.hintLevel);return item(s).hints[s.hintLevel-1];}
function expressionMatches(answer,expected){const a=C.norm(answer),e=C.norm(expected);if(a===e)return true;const synonyms={hello:['hi','hello there'],'thank you':['thanks','thank you very much','thanks a lot'],'please say that again':['could you repeat that please','can you say that again please','could you say that again please'],'what is your name':["what's your name"],'you are welcome':["you're welcome",'no problem'],'can you help me please':['could you help me please','please help me']};return (synonyms[e]||[]).includes(a);}
function submit(s,response,inputMode='typed'){
 if(s.answered)throw Error('本题已经提交。');const q=item(s);response=String(response).trim();if(!response)throw Error('先完成你的回答。');
 const correct=q.type==='expression'?expressionMatches(response,q.answer):C.norm(response)===C.norm(q.answer);
 const r=s.current;
 if(r.firstAttemptCorrect===null)r.firstAttemptCorrect=correct;
 r.attempts.push({response,correct,hintLevel:s.hintLevel,inputMode,at:stamp(),wallElapsedMs:Date.now()-Date.parse(r.startedAt)});
 if(!correct&&s.moduleId==='C'){
  const v=C.norm(response);if(/\bi (?:is|are)\b/.test(v))r.errorTag='G1:am';else if(/\b(?:we|they|you) (?:is|am)\b/.test(v))r.errorTag='G1:are';else if(/\b(?:he|she) (?:are|am)\b/.test(v))r.errorTag='G1:is';else if(/\b(?:he|she) (?:go|like|play|have|read|do)\b/.test(v))r.errorTag='G2:third';
 }
 if(s.phase==='practice'&&!correct)return {correct,done:false,feedback:q.type==='expression'?'这句表达暂未匹配示例规则。可以换一种说法或向伙伴求助；这不代表其他表达一定错误。':'还差一点。看看伙伴提示，再试一次。'};
 r.completedAt=stamp();r.completedCorrectly=correct;s.records.push(clone(r));s.answered=true;
 return {correct,done:true,feedback:s.phase==='practice'?'做得好！这次练习完成了。':'回答已记录。完成全部测试后一起回顾。'};
}
function adaptivePool(s,tag){
 if(tag.startsWith('SPELL:')){
  const original=pool('S','practice',s.form).find(q=>q.focusTag===tag)||pool('S','reassessment',s.form).find(q=>q.focusTag===tag);
  if(!original)return [];const word=original.answer;const sentences={school:'I go to ___.',teacher:'My ___ is kind.',classroom:'This is my ___.',student:'I am a ___.',breakfast:'I eat ___ every morning.',morning:'I read in the ___.',homework:'I do my ___ after school.',evening:'We rest in the ___.',friend:'Mia is my ___.',happy:'I am ___ today.',helpful:'My partner is very ___.',together:'We learn ___.',garden:'The flowers are in the ___.',library:'We read in the ___.',window:'Please open the ___.',partner:'Leo is my learning ___.',bridge:'We walk over the ___.',castle:'The king lives in the ___.',rabbit:'The ___ has long ears.',lion:'The ___ has a mane.'};return [prepare({...original,prompt:'把刚才的词用在句子里：'+(sentences[word]||'Word: ___'),hints:original.hints},'practice')];
 }
 if(!/^G[123]:/.test(tag))return [];
 return C.similarQuestions(tag,s.practiceSerial*3+s.form*7).slice(0,8).map(q=>prepare(q,'practice'));
}
function adapt(s,tags,sourceIds,limit){
 if(!tags.length||limit<=0)return;
 const start=s.phase==='diagnostic'?0:s.index+1;const replaceCount=Math.min(limit,s.sets.practice.length-start);const avoid=new Set([...s.records.map(r=>signature(r)),...s.sets.reassessment.map(signature),...s.sets.practice.slice(start+replaceCount).map(signature)]);
 const seen=new Set(s.records.map(r=>r.questionId));
 const candidates=tags.flatMap(t=>adaptivePool(s,t));
 const available=[...new Map(candidates.map(q=>[signature(q),q])).values()].filter(q=>!avoid.has(signature(q)));
 const selected=shuffle(available).slice(0,Math.min(limit,s.sets.practice.length-start));
 if(!selected.length)return;
 s.sets.practice.splice(start,selected.length,...selected);
 s.decisions.push({rule:s.phase==='diagnostic'?'DIAGNOSTIC-ERROR-TO-SIMILAR':'PRACTICE-ERROR-TO-SIMILAR',sourceQuestionIds:sourceIds,sourceSessionIds:[s.id],focusTags:tags,selectedQuestionIds:selected.map(q=>q.id),selectedPrompts:selected.map(q=>q.prompt),at:stamp()});
}
function mixAfterSuccess(s){
 if(s.kind==='focus'||s.phase!=='practice'||s.index+1>=s.sets.practice.length)return;
 const recent=s.records.filter(r=>r.stage==='practice').slice(-2),tag=s.current.focusTag,owner=tag.split(':')[0];
 if(recent.length<2||recent.some(r=>r.focusTag!==tag||!r.firstAttemptCorrect||r.highestHintUsed!==0)||!C.skills[owner])return;
 const keep=s.sets.practice.filter((q,i)=>i>s.index+1),avoid=new Set([...s.records.map(signature),...s.sets.reassessment.map(signature),...keep.map(signature)]);
 const candidates=C.skills[owner].filter(t=>t!==tag).flatMap(t=>adaptivePool(s,t)).filter(q=>!avoid.has(signature(q)));
 if(!candidates.length)return;const q=shuffle(candidates)[0];s.sets.practice[s.index+1]=q;
 s.decisions.push({rule:'INDEPENDENT-SUCCESS-TO-CONTRAST',sourceQuestionIds:recent.map(r=>r.questionId),sourceSessionIds:[s.id],focusTags:[tag],selectedQuestionIds:[q.id],selectedPrompts:[q.prompt],at:stamp()});
}
function advance(s){
 if(!s.answered)throw Error('请先提交当前答案。');
 if(s.phase==='practice'&&s.current.firstAttemptCorrect===false){s.practiceSerial++;adapt(s,[s.current.errorTag||s.current.focusTag],[s.current.questionId],2);}
 mixAfterSuccess(s);s.index++;
 if(s.index<s.sets[s.phase].length){enterItem(s);return 'question';}
 if(s.phase==='diagnostic'){
  const errors=s.records.filter(r=>r.stage==='diagnostic'&&!r.firstAttemptCorrect);if(errors.length)adapt(s,mistakeTags(errors),errors.map(r=>r.questionId),3);else if(s.priorFocus?.length){const before=s.decisions.length;adapt(s,s.priorFocus.map(w=>w.tag),s.priorFocus.flatMap(w=>w.sourceQuestionIds),3);if(s.decisions.length>before){s.decisions.at(-1).rule='HISTORY-REPEATED-ERROR-TO-SIMILAR';s.decisions.at(-1).sourceEvidence=s.priorFocus.flatMap(w=>w.sourceEvidence);s.decisions.at(-1).sourceSessionIds=[...new Set(s.priorFocus.flatMap(w=>w.sourceEvidence.map(e=>e.sessionId)))];}}
 }
 if(s.phase!=='reassessment'){s.phase=PHASES[PHASES.indexOf(s.phase)+1];s.index=0;enterItem(s);return 'transition';}
 s.completedAt=stamp();s.summary=summarize(s);return 'complete';
}
function percent(records){return records.length?Math.round(records.filter(r=>r.firstAttemptCorrect===true).length/records.length*100):null;}
function summarize(s){
 const out={};for(const p of PHASES)out[p]=percent(s.records.filter(r=>r.stage===p));
 const ret=s.records.filter(r=>r.stage==='reassessment');const by={};for(const r of ret)(by[r.focusTag]??=[]).push(r);
 out.byFocus=Object.fromEntries(Object.entries(by).map(([tag,rs])=>[tag,{correct:rs.filter(r=>r.firstAttemptCorrect).length,total:rs.length,percent:percent(rs)}]));
 out.criticalGaps=Object.entries(by).filter(([tag,rs])=>/^G[123]:/.test(tag)&&rs.length>=2&&rs.every(r=>!r.firstAttemptCorrect)).map(([tag])=>tag);
 if(s.moduleId==='S'){out.wordSpelling=percent(ret.filter(r=>r.skill==='SPELL'));out.sentenceApplication=percent(ret.filter(r=>r.skill!=='SPELL'));}
 out.passed=out.reassessment>=80&&out.criticalGaps.length===0&&(s.moduleId!=='S'||out.wordSpelling>=80&&out.sentenceApplication>=80);
 out.label=s.moduleId==='C'?'表达内容准备，不是口语能力评分':'即时独立表现，不是长期掌握';return out;
}
function completeEvidence(s){
 if(!s||s.kind!=='assessment'||s.grade!==5||s.courseVersion!==VERSION||s.ruleVersion!==RULE||!Number.isFinite(Date.parse(s.completedAt))||!s.sets||!Array.isArray(s.records))return false;
 for(const phase of PHASES){
  const count=s.moduleId==='C'&&phase==='reassessment'?5:COUNTS[phase];
  const qs=s.sets[phase],rs=s.records.filter(r=>r.stage===phase);
  if(!Array.isArray(qs)||qs.length!==count||rs.length!==count||new Set(rs.map(r=>r.questionId)).size!==count)return false;
  for(const q of qs){const r=rs.find(r=>r.questionId===q.id);if(!r||r.prompt!==q.prompt||r.expected!==q.answer||!r.completedAt||!Array.isArray(r.attempts)||r.attempts.length<1||r.firstAttemptCorrect!==r.attempts[0].correct)return false;const actual=q.type==='expression'?expressionMatches(r.attempts[0].response,q.answer):C.norm(r.attempts[0].response)===C.norm(q.answer);if(r.firstAttemptCorrect!==actual)return false;if(phase==='practice'&&!r.completedCorrectly)return false;if(phase!=='practice'&&(r.attempts.length!==1||r.highestHintUsed!==0||r.attempts[0].hintLevel!==0))return false;}
 }
 return new Set(Object.values(s.sets).flat().map(signature)).size===Object.values(s.sets).flat().length;
}
function result(state,module){const list=[...state.sessions].reverse().filter(s=>s.learnerId===state.learnerId&&s.moduleId===module&&completeEvidence(s)).sort((a,b)=>String(b.completedAt).localeCompare(String(a.completedAt)));const s=list[0];return s?{sessionId:s.id,completedAt:s.completedAt,...summarize(s)}:null;}
function eligible(state,module){if(module==='G1')return true;const required=module==='G2'?['G1']:module==='G3'?['G1','G2']:module==='S'?['G1','G2','G3']:['G1','G2','G3','S'];return required.every(m=>result(state,m)?.passed===true);}
function rewards(state){return MODULES.filter(m=>state.sessions.some(s=>s.learnerId===state.learnerId&&s.moduleId===m&&completeEvidence(s)&&summarize(s).passed)).length*3;}
function wrongBook(state){
 const sessions=[...state.sessions];if(state.draft&&!sessions.some(s=>s.id===state.draft.id))sessions.push(state.draft);
 const grouped={};for(const s of sessions)for(const r of s.records||[]){const tag=r.errorTag||r.focusTag;if(!tag)continue;(grouped[tag]??=[]).push({...r,sessionId:s.id});}
 return Object.entries(grouped).map(([tag,rs])=>{
  rs.sort((a,b)=>String(a.completedAt).localeCompare(String(b.completedAt)));
  const bad=rs.filter(r=>r.firstAttemptCorrect===false),hints=rs.filter(r=>r.highestHintUsed>=2),lastWrong=[bad.at(-1)?.completedAt,hints.at(-1)?.completedAt].filter(Boolean).sort().at(-1);
  const independent=rs.filter(r=>r.stage!=='practice'&&r.firstAttemptCorrect&&r.highestHintUsed===0&&(!lastWrong||r.completedAt>lastWrong));
  const confirmed=new Set(bad.map(r=>r.questionId)).size>=2||hints.length>=2;
  const recovery=new Set(independent.map(r=>r.questionId)).size>=3&&new Set(independent.map(r=>r.sessionId)).size>=2;
  const spaced=recovery&&lastWrong&&Date.parse(independent.at(-1).completedAt)-Date.parse(lastWrong)>=86400000;
  return {tag,label:C.focusNames[tag]||(tag.startsWith('SPELL:')?'词汇：'+tag.slice(6):'情境表达'),errors:bad.length,distinctWrongItems:new Set(bad.map(r=>r.questionId)).size,highHints:hints.length,status:spaced?'已间隔巩固':recovery?'已改善，待间隔复习':confirmed?'重点巩固':'观察中',priority:spaced?0:recovery?1:confirmed?3:2,sourceQuestionIds:bad.map(r=>r.questionId),sourceEvidence:bad.map(r=>({sessionId:r.sessionId,questionId:r.questionId,at:r.completedAt,response:r.attempts[0]?.response})),recent:rs.slice(-5)};
 }).filter(x=>x.errors||x.highHints).sort((a,b)=>b.priority-a.priority||b.errors-a.errors);
}
function recommend(state,s){
 const wrong=s.records.filter(r=>r.stage==='reassessment'&&!r.firstAttemptCorrect),tags=mistakeTags(wrong);
 if(!tags.length)return null;
 const tag=tags[0];const target=/^G[123]:/.test(tag)?tag.split(':')[0]:s.moduleId;
 const prior=state.sessions.filter(x=>x.moduleId===s.moduleId&&x.kind==='assessment').at(-1);
 const baseline=prior?summarize(prior).reassessment:s.moduleId==='S'?Math.round(['G1','G2','G3'].reduce((n,m)=>n+(result(state,m)?.reassessment||0),0)/3):s.moduleId==='C'?result(state,'S')?.reassessment:null;
 return {target,tag,label:C.focusNames[tag]||(tag.startsWith('SPELL:')?'拼写 '+tag.slice(6):'情境表达'),sourceQuestionIds:wrong.filter(r=>(r.errorTag||r.focusTag)===tag).map(r=>r.questionId),drop:baseline===null?null:baseline-summarize(s).reassessment,reason:/^G/.test(tag)?'出现可定位的语法错误，建议围绕该错点练新句子。':tag.startsWith('SPELL:')?'这是词汇拼写困难，留在词汇练习，不据此判定语法退步。':'表达规则未匹配，先使用情境示例；不能据此判断发音。'};
}
window.AuraLearningEngine=Object.freeze({VERSION,RULE,PHASES,COUNTS,MODULES,TITLES,clone,uid,stamp,hash,shuffle,empty,validateState,createSession,item,enterItem,hint,submit,advance,summarize,completeEvidence,result,eligible,rewards,wrongBook,recommend,focusTag:C.focusTag});
})();
