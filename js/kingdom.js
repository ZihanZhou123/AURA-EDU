/* AURA Kingdom 4.0: learner-scoped, rule-based learning, not an LLM. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const PREFIX='aura_kingdom_v4_', RULE='KINGDOM-80-1.0', PASS=80;
const PHASES=['diagnostic','practice','reassessment'];
const PHASE_NAMES=['探索起点 · Diagnostic','伙伴练习 · Practice','独立新题 · Reassessment'];
const NODES={camp:[52,85],junction:[58,84],east:[69,72],gardenTurn:[68,65],garden:[64,57],castleTurn:[82,66],castle:[85,59],south:[51,68],west:[35,67],academy:[31,59]};
const EDGES={camp:['junction'],junction:['camp','east'],east:['junction','gardenTurn','castleTurn','south'],gardenTurn:['east','garden'],garden:['gardenTurn'],castleTurn:['east','castle'],castle:['castleTurn'],south:['east','west'],west:['south','academy'],academy:['west']};
const PARTNERS={Mia:'🦊',Leo:'🦁',Luna:'🐰',Finn:'🐼'};
const META={
 G1:{title:'G1 · 点亮语法水晶',topic:'am / is / are',area:'grammar',node:'academy',story:'修好水晶灯：让每个主语找到合适的 be 动词。'},
 G2:{title:'G2 · 修复时钟塔',topic:'一般现在时 · 主谓一致',area:'grammar',node:'academy',story:'时钟塔需要日常生活句子。留意 he / she 和动词的搭配。'},
 G3:{title:'G3 · 搭建句子桥',topic:'陈述句与疑问句语序',area:'grammar',node:'academy',story:'将散落的句子碎片排好，让通往花园的桥亮起来。'},
 S:{title:'Spelling · 唤醒花园',topic:'学校与日常词汇',area:'spelling',node:'garden',story:'用正确的单词唤醒花朵，再检查花园里的句子水晶。'},
 C:{title:'Speaking · 城堡见面会',topic:'情境表达准备',area:'speaking',node:'castle',story:'帮助伙伴回应城堡朋友。这里检查表达内容；发音由原有录音任务留给老师评估。'}
};
const escapeText=s=>String(s??'');
const norm=s=>String(s??'').toLowerCase().replace(/[.,!?]/g,'').replace(/\s+/g,' ').trim();
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);
let learner=null, state=null, storageOK=true, currentNode='camp', moving=false, frame=null;
let session=null, item=null, itemRecord=null, phaseIndex=0, qIndex=0, answered=false, selected=[], hintLevel=0;
let view='intro', chosenModule='G1', focusBefore=null, toastTimer=null, celebrationTimer=null;
let returnModule=null;
let audio=null, recognizer=null, recognitionId=0, answerSource='typed', typingStart=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');

function active(){try{return window.AuraLearnerIdentity?.getActiveLearner()||null;}catch{return null;}}
function fresh(){return {version:4,companion:'Leo',sound:true,sessions:[],rewards:{},seen:{}};}
function read(){const raw=localStorage.getItem(PREFIX+encodeURIComponent(learner.id));if(!raw)return fresh();const data=JSON.parse(raw);if(data.version!==4||!Array.isArray(data.sessions)||!data.rewards||!data.seen)throw Error('记录格式异常');return data;}
function persist(data){localStorage.setItem(PREFIX+encodeURIComponent(learner.id),JSON.stringify(data));state=data;}
function identityOK(){if(active()?.id===learner?.id)return true;stopSpeech();cancelAnimationFrame(frame);moving=false;session=null;returnModule=null;pendingFocus=null;close();bind();toast('学生身份已变化，请重新选择任务。');return false;}
function toast(text){clearTimeout(toastTimer);$('message').textContent=text;$('message').classList.add('visible');toastTimer=setTimeout(()=>$('message').classList.remove('visible'),4200);}
function fit(){const box=$('viewport'),img=$('scene');const ratio=img.naturalWidth/img.naturalHeight||1672/941;const w=Math.min(box.clientWidth,box.clientHeight*ratio);$('stage').style.width=w+'px';$('stage').style.height=w/ratio+'px';}
new ResizeObserver(fit).observe($('viewport'));$('scene').addEventListener('load',fit);window.addEventListener('resize',fit);
function sound(kind){if(!state?.sound)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio=audio||new AC();audio.resume().catch(()=>{});const notes=kind==='win'?[523,659,784,1047]:kind==='correct'?[659,880]:kind==='retry'?[330,294]:[523];notes.forEach((f,i)=>{const t=audio.currentTime+i*.09,o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.07,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.18);});}catch{/* Sound never blocks a task. */}}
function score(records){return records.length?Math.round(records.filter(r=>r.firstAttemptCorrect).length/records.length*100):0;}
function latest(list){return [...list].sort((a,b)=>String(b.completedAt).localeCompare(String(a.completedAt)))[0];}
function resultFor(module){
 const own=latest(state.sessions.filter(s=>s.learnerId===learner.id&&s.moduleId===module&&s.completedAt&&s.ruleVersion===RULE&&!s.isTargeted));
 let legacy=null;
 try{
  if(module.startsWith('G')){const g=AuraGrammarUnlock.evaluateModule(module,learner.id);if(g.reassessmentPercent!==undefined&&g.status!=='INVALID_EVIDENCE')legacy={completedAt:g.completedAt,percent:g.reassessmentPercent,source:'legacy'};}
  if(module==='S'){const s=AuraSpellingMastery.evaluate(learner.id);if(s.ok&&s.scores?.reassessment)legacy={completedAt:findLegacySpellingDate(s.sessions.reassessmentSessionId),percent:s.scores.reassessment.percent,source:'legacy'};}
 }catch{}
 const candidates=[];if(own)candidates.push({completedAt:own.completedAt,percent:own.summary.reassessment,source:'kingdom'});if(legacy?.completedAt)candidates.push(legacy);
 return latest(candidates)||{percent:null,source:null};
}
function findLegacySpellingDate(id){try{return JSON.parse(localStorage.getItem('aura_spelling_reassessment_records_v1')||'[]').find(s=>s.sessionId===id)?.completedAt;}catch{return null;}}
function grammarPassed(){return ['G1','G2','G3'].every(m=>resultFor(m).percent>=PASS);}
function eligible(module){if(module==='G1')return true;if(module==='G2')return resultFor('G1').percent>=PASS;if(module==='G3')return resultFor('G1').percent>=PASS&&resultFor('G2').percent>=PASS;if(module==='S')return grammarPassed();return grammarPassed()&&resultFor('S').percent>=PASS;}
function stars(){return Object.values(state.rewards).reduce((a,b)=>a+Number(b||0),0);}
function bind(){learner=active();if(!learner){location.replace('index.html');return;}storageOK=true;try{state=read();}catch{state=fresh();storageOK=false;toast('记录无法读取，已暂停保存。请保留数据并联系老师。');}render();}
function render(){
 $('liveName').textContent=learner.nickname||learner.name||learner.displayName||learner.id;
 $('stars').textContent='⭐ '+stars();$('liveWallet').textContent='故事奖励 ⭐ '+stars();
 $('home').textContent='回到营地';
 const next=['G1','G2','G3','S','C'].find(m=>resultFor(m).percent<PASS||resultFor(m).percent===null);
 $('objective').textContent=next?'下一站：'+META[next].title:'王国旅程已完成 · 可继续巩固';
 $('instruction').textContent='独立复测达到 80% 即通关；练习时可以放心求助。';
 for(const [id,m]of [['grammar','G1'],['spelling','S'],['speaking','C']])$(id).querySelector('.place-tag').textContent=id==='grammar'?'📘 G1 → G2 → G3':eligible(m)?'✨ 已解锁':'🔒 先完成前站';
 document.querySelectorAll('.companion').forEach(b=>{const yes=b.dataset.companion===state.companion;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));b.querySelector('.name').textContent=b.dataset.companion+(yes?' ✓':'');});
 $('travelerIcon').textContent=PARTNERS[state.companion]||'🦁';$('travelerName').textContent=state.companion;
}
function route(start,goal){const queue=[[start]],seen=new Set([start]);while(queue.length){const p=queue.shift(),n=p.at(-1);if(n===goal)return p;for(const next of EDGES[n])if(!seen.has(next)){seen.add(next);queue.push([...p,next]);}}return[start];}
function position(p){$('traveler').style.left=p[0]+'%';$('traveler').style.top=p[1]+'%';}
function travel(target,arrive){if(moving)return;const points=route(currentNode,target).map(n=>NODES[n]);$('route').setAttribute('points',points.map(p=>p.join(',')).join(' '));if(points.length<2||reduced.matches){currentNode=target;position(NODES[target]);arrive();return;}moving=true;$('traveler').classList.add('walking');let start=null;const lens=points.slice(1).map((p,i)=>Math.hypot((p[0]-points[i][0])*1.7768,p[1]-points[i][1]));const total=lens.reduce((a,b)=>a+b,0),duration=Math.min(800,Math.max(350,total*7));function tick(t){if(start===null)start=t;const progress=Math.min((t-start)/duration,1);let d=progress*total,i=0;while(i<lens.length-1&&d>lens[i])d-=lens[i++];const f=lens[i]?d/lens[i]:1;position([points[i][0]+(points[i+1][0]-points[i][0])*f,points[i][1]+(points[i+1][1]-points[i][1])*f]);if(progress<1)frame=requestAnimationFrame(tick);else{moving=false;currentNode=target;position(NODES[target]);$('traveler').classList.remove('walking');arrive();}}frame=requestAnimationFrame(tick);}
function resetDialog(){releaseRecording();$('enter').onclick=mainAction;stopSpeech();$('task').hidden=true;$('extra').hidden=true;$('extra').textContent='';$('formal').hidden=true;$('export').hidden=true;$('enter').hidden=false;$('enter').disabled=false;$('progressFill').style.width='0%';$('step').textContent='';}
function open(){focusBefore=document.activeElement;$('overlay').hidden=false;$('app').inert=true;$('close').focus();}
function close(){releaseRecording();stopSpeech();$('overlay').hidden=true;$('app').inert=false;if(focusBefore?.isConnected)focusBefore.focus();}
function area(id){if(!identityOK()||moving)return;if(session&&(!session.completedAt||view==='save')){open();return;}sound('tap');travel(id==='grammar'?'academy':id==='spelling'?'garden':'castle',()=>{if(!identityOK())return;resetDialog();view='menu';chosenModule=id==='grammar'?['G1','G2','G3'].find(m=>resultFor(m).percent<PASS||resultFor(m).percent===null)||'G1':id==='spelling'?'S':'C';$('dialogIcon').textContent=id==='grammar'?'📘':id==='spelling'?'🌸':'🎤';$('dialogTitle').textContent=id==='grammar'?'语法学院 · 三关冒险':META[chosenModule].title;$('dialogText').textContent=id==='grammar'?'G1 → G2 → G3，每关独立新题达到 80% 即通过。':META[chosenModule].story;$('answers').replaceChildren();$('extra').hidden=false;if(id==='grammar'){
 const lines=['G1','G2','G3'].map(m=>m+' · '+META[m].topic+'：'+(resultFor(m).percent===null?'尚未完成':resultFor(m).percent+'%')+(eligible(m)?'':' 🔒'));$('extra').textContent=lines.join('\n');$('task').hidden=false;$('question').textContent='选择关卡';$('sentence').hidden=true;$('inputAnswer').hidden=true;$('inputLabel').hidden=true;$('mic').hidden=true;$('speechStatus').textContent='';$('feedback').textContent='';$('hintText').hidden=true;$('hint').hidden=true;$('reset').hidden=true;
 for(const m of ['G1','G2','G3']){const b=document.createElement('button');b.className='choice';b.textContent=m+(eligible(m)?'':' 🔒');b.disabled=!eligible(m);b.onclick=()=>intro(m);$('answers').append(b);}
 }else $('extra').textContent=eligible(chosenModule)?'已解锁。每轮包含诊断、带提示练习和 5 道独立新题。':chosenModule==='S'?'先让 G1、G2、G3 的独立复测均达到 80%。':'先完成 Grammar，并让 Spelling 独立复测达到 80%。';$('enter').textContent=eligible(chosenModule)?'进入 '+chosenModule:'先去补齐前站';open();});}
function intro(module){if(!identityOK())return;chosenModule=module;resetDialog();view='intro';$('dialogIcon').textContent=META[module].area==='grammar'?'💎':module==='S'?'🌸':'🎤';$('dialogTitle').textContent=META[module].title;$('dialogText').textContent=pendingFocus?'错点巩固：'+(FOCUS_NAMES[pendingFocus]||pendingFocus)+'。换句子练习，不是重刷整章。':META[module].story;$('step').textContent='诊断 3 题 → 练习 5 题 → 独立复测 5 题';$('extra').hidden=false;$('extra').textContent='通过标准：独立复测 ≥ 80%（5 题答对 4 题）。\n练习提示不会扣掉通关资格。诊断和复测只允许一次作答。\n'+(module==='C'?'表达任务为情境内容检查，不是发音评分。可输入或使用浏览器语音转写。':'遇到困难时，伙伴会提供分层提示。');$('enter').textContent='开始冒险';if(module==='C'){$('formal').hidden=false;$('formal').href='#';$('formal').textContent='🎙 真实录音任务（老师评估）';$('formal').onclick=e=>{e.preventDefault();recordingTask();};}}

/* Fine-grained tags describe observed item demands, not learner diagnoses. */
const FOCUS_NAMES={
 'G1:am':'I 与 am 的搭配','G1:is':'单数主语与 is 的搭配','G1:are':'复数主语 / you 与 are 的搭配',
 'G2:third':'第三人称单数动词变化','G2:base':'非第三人称单数使用动词原形',
 'G3:be-question':'be 动词疑问句语序','G3:do-question':'do / does 疑问句语序','G3:statement':'陈述句语序'
};
let pendingFocus=null, practiceSerial=0;
function focusTag(q){
 if(q.focusTag)return q.focusTag;
 const skill=q.errorSkill||q.skill,a=norm(q.expected??q.answer);
 if(skill==='G1'){
  if(['am','is','are'].includes(a))return 'G1:'+a;
  const text=norm(q.attempts?.[0]?.response||'');
  if(/\bi\s+(?:is|are)\b/.test(text))return 'G1:am';
  if(/\b(?:we|they|you)\s+(?:is|am)\b/.test(text))return 'G1:are';
  return 'G1:is';
 }
 if(skill==='G2')return 'G2:'+(/(?:s|es)$/.test(a)||a==='has'?'third':'base');
 if(skill==='G3')return 'G3:'+(/^(?:is|are|am)\b/.test(a)?'be-question':/^(?:do|does)\b/.test(a)?'do-question':'statement');
 return skill==='SPELL'?'SPELL:'+a:skill;
}
function mistakes(records){
 const counts=new Map();
 for(const r of records.filter(x=>x.firstAttemptCorrect===false)){
  const tag=focusTag(r);counts.set(tag,(counts.get(tag)||0)+1);
 }
 return [...counts].sort((a,b)=>b[1]-a[1]).map(([tag])=>tag);
}
function similarQuestions(tag,seed=0){
 const places=['near the waterfall','at the magic camp','beside the pink tree','inside the blue tower','by the little stream','near the stone steps','beside the crystal gate','under the old tree','in the quiet courtyard','at the purple tent','near the golden fountain','beside the wooden sign','on the garden path','outside the clock tower','near the silver bridge','at the flower stall','beside the yellow door','inside the green tent','near the mountain lake','beside the red lantern','at the small harbour','near the rainbow gate','by the picnic table','inside the reading room','beside the blue umbrella','at the forest entrance'];
 const people=['Mia','Leo','Luna','Finn','Amy','Ben','Tom','May','Ella','Jack','Ruby','Sam','Zoe'];
 const rows=[];
 for(let i=0;i<26;i++){
  const place=places[(i+seed)%places.length],person=people[i%people.length];let prompt,answer,options,type='choice',hints;
  if(tag.startsWith('G1:')){
   answer=tag.split(':')[1];const subject=answer==='am'?'I':answer==='is'?person:['We','They','You','My friends','The children'][i%5];
   prompt=subject+' ___ '+place+'.';options=['am','is','are'];hints=['先找主语：'+subject+'。',FOCUS_NAMES[tag]+'。','完整句子：'+prompt.replace('___',answer)];
  }else if(tag.startsWith('G2:')){
   const third=tag.endsWith('third'),verbs=[['read','reads','a story'],['play','plays','a game'],['draw','draws','a picture'],['eat','eats','an apple'],['watch','watches','the birds'],['carry','carries','a bag'],['study','studies','English']];const v=verbs[i%verbs.length],subject=third?person:['We','They','I','You','My friends'][i%5];
   answer=v[third?1:0];prompt=subject+' ___ '+v[2]+' '+place+' every day.';options=[v[0],v[1]];hints=['先判断主语 '+subject+' 是一个人还是其他情况。',FOCUS_NAMES[tag]+'。','完整句子：'+prompt.replace('___',answer)];
  }else if(tag.startsWith('G3:')){
   answer=tag.endsWith('be-question')?'Is '+person+' '+place+'?':tag.endsWith('do-question')?'Does '+person+' read '+place+'?':person+' is '+place+'.';prompt='排列句子 · '+(tag.endsWith('statement')?'说明伙伴的位置。':'询问伙伴的位置或活动。');type='order';options=answer.split(' ');hints=['先判断这是陈述句还是疑问句。',FOCUS_NAMES[tag]+'。','参考句子：'+answer];
  }else return [];
  rows.push({id:'FOCUS-'+tag+'-'+seed+'-'+i,phase:'practice',focusTag:tag,prompt,answer,options,skill:tag.split(':')[0],type,hints});
 }
 return rows;
}
function targetedPractice(tags,existing,avoid,seed=0){
 const candidates=tags.flatMap(tag=>similarQuestions(tag,seed));
 const unique=[],seen=new Set(avoid);
 for(const q of shuffle(candidates)){const sig=q.prompt+'|'+q.answer;if(seen.has(sig))continue;seen.add(sig);unique.push(q);}
 const result=unique.slice(0,5);
 for(const q of existing){if(result.length>=5)break;const sig=q.prompt+'|'+q.answer;if(!seen.has(sig)){seen.add(sig);result.push(q);}}
 return result.length===5?result:existing;
}
function adaptAfterDiagnostic(){
 const diagnostic=session.records.filter(r=>r.stage==='diagnostic');
 if(session.isTargeted)return;const tags=mistakes(diagnostic);
 const prior=latest(state.sessions.filter(s=>s.moduleId===session.moduleId&&s.records));
 const focus=tags.length?tags:mistakes(prior?.records||[]);
 if(!focus.length)return;
 const avoid=Object.values(session.questionSets).flat().filter(q=>q.phase!=='practice').map(q=>q.prompt+'|'+q.answer);
 const selected=targetedPractice(focus,session.questionSets.practice,avoid,session.form*7);
 session.questionSets.practice=selected;
 session.adaptationEvidence.push({rule:'DIAGNOSTIC-ERROR-TO-SIMILAR-PRACTICE',sourceQuestionIds:(tags.length?diagnostic:(prior?.records||[])).filter(r=>!r.firstAttemptCorrect).map(r=>r.questionId),sourceSessionId:tags.length?session.sessionId:prior?.sessionId,focusTags:focus,selectedQuestionIds:selected.map(q=>q.id),at:now()});
}
function adaptRemainingPractice(){
 if(phaseIndex!==1||itemRecord.firstAttemptCorrect!==false)return;
 const tag=focusTag(itemRecord),avoid=[...session.records.map(r=>r.prompt+'|'+r.expected),...session.questionSets.reassessment.map(q=>q.prompt+'|'+q.answer)];
 const candidates=similarQuestions(tag,++practiceSerial).filter(q=>!avoid.includes(q.prompt+'|'+q.answer));
 const count=Math.min(2,session.questionSets.practice.length-qIndex-1);
 if(!candidates.length||count<1)return;
 const selected=shuffle(candidates).slice(0,count);
 session.questionSets.practice.splice(qIndex+1,selected.length,...selected);
 session.adaptationEvidence.push({rule:'PRACTICE-ERROR-TO-NEXT-SIMILAR-ITEMS',sourceQuestionIds:[item.id],focusTags:[tag],selectedQuestionIds:selected.map(q=>q.id),at:now()});
}

/* Two parallel forms per level. Each phase has its own item IDs and prompts.
   Finite banks deliberately label review after both forms are used. */
function bank(module,form){
 const offset=form*20;
 const make=(phase,i,prompt,answer,options,skill,type='choice',hint=null)=>({id:module+'-'+form+'-'+phase+'-'+i,phase,prompt,answer,options,skill,type,hints:hint||['先看句子的主语和任务要求。','想一想 '+META[module].topic+' 的规则。','参考答案：'+answer]});
 if(module==='G1'){
 const subjects=form===0?[['I','am'],['Mia','is'],['We','are'],['The kitten','is'],['You','are'],['Leo','is'],['My books','are'],['I','am'],['The rabbits','are'],['Finn','is'],['Luna and Mia','are'],['I','am'],['The garden','is']]:[['I','am'],['My sister','is'],['They','are'],['The panda','is'],['We','are'],['The flowers','are'],['I','am'],['Your brother','is'],['My friends','are'],['You','are'],['I','am'],['The castle','is'],['Mia and Finn','are']];
 const endings=form===0?['ready for the trip','near the gate','in the garden','under the bridge','welcome here','my partner','on the shelf','happy to help','beside the tent','very kind','at the fountain','a young explorer','full of flowers']:['excited today','at the library','on the path','beside the pond','good friends','pink and white','in the classroom','helpful','outside the castle','ready to learn','at the camp','beautiful','in my team'];
 return subjects.map(([s,a],i)=>make(i<3?'diagnostic':i<8?'practice':'reassessment',i,s+' ___ '+endings[i]+'.',a,['am','is','are'],'G1','choice',[`找到主语：${s}。`,s==='I'?'I 搭配 am。':a==='are'?'这个主语用 are。':'一个人或事物通常用 is。',`完整句子：${s} ${a} ${endings[i]}.`]));
 }
 if(module==='G2'){
 const triples=form===0?[
 ['Mia ___ books every day.','reads','read'],['We ___ to school together.','walk','walks'],['Leo ___ a blue bag.','has','have'],['My sister ___ music.','likes','like'],['They ___ football after school.','play','plays'],['Finn ___ his homework at night.','does','do'],['I ___ breakfast at home.','eat','eats'],['The bird ___ in the morning.','sings','sing'],['Luna ___ English on Monday.','studies','study'],['My friends ___ in the park.','run','runs'],['He ___ to the library.','goes','go'],['You ___ a kind teacher.','have','has'],['The fox ___ apples.','likes','like']]:[
 ['My father ___ tea every morning.','drinks','drink'],['You ___ very well.','dance','dances'],['Luna ___ a green pencil.','has','have'],['The rabbit ___ near the tent.','lives','live'],['We ___ new words each day.','learn','learns'],['Mia ___ her face every morning.','washes','wash'],['I ___ my friends after class.','help','helps'],['He ___ to school by bus.','goes','go'],['Finn ___ pictures on Sunday.','draws','draw'],['They ___ their bags.','carry','carries'],['She ___ a new book.','has','have'],['The children ___ outside.','play','plays'],['My brother ___ English every day.','studies','study']];
 return triples.map(([p,a,b],i)=>make(i<3?'diagnostic':i<8?'practice':'reassessment',i,p,a,[a,b],'G2','choice',['先找出谁在做这个动作。','一般现在时中，he / she / 单数名词的动词通常需要变化。','完整答案：'+p.replace('___',a)]));
 }
 if(module==='G3'){
 const sentences=form===0?['I am ready.','She likes music.','Are you happy?','We are good friends.','Mia reads a book.','Is Leo at school?','They play in the garden.','I like my classroom.','Finn is my friend.','Does Mia like apples?','We learn English together.','The cat is under the chair.','They go to school every day.']:['I am happy.','He plays football.','Is she ready?','You are very kind.','Finn has a blue bag.','Are they at home?','We read in the library.','Luna likes her school.','Mia is near the bridge.','Does Leo read books?','They help their friends.','The books are on the desk.','I go to the park on Sunday.'];
 return sentences.map((s,i)=>make(i<3?'diagnostic':i<8?'practice':'reassessment',i,'按顺序组成句子 · Build the sentence',s,s.split(' '),'G3','order',['先判断是陈述句，还是疑问句。',s.endsWith('?')?'疑问句通常由 be 动词或助动词开头。':'陈述句通常先说主语，再说动作或状态。','参考句子：'+s]));
 }
 if(module==='S'){
 const words=form===0?[['学校','school'],['老师','teacher'],['朋友','friend'],['学生','student'],['早晨','morning'],['开心的','happy'],['家庭作业','homework'],['一起','together'],['教室','classroom'],['早餐','breakfast']]:[['晚上','evening'],['乐于助人的','helpful'],['花园','garden'],['兔子','rabbit'],['狮子','lion'],['城堡','castle'],['桥','bridge'],['伙伴','partner'],['窗户','window'],['图书馆','library']];
 const rows=words.map(([zh,en],i)=>make(i<3?'diagnostic':i<8?'practice':'reassessment',i,'花朵线索：'+zh,en,[],'SPELL','input',['说一说这个词，想想字母组合。','词首：'+en.slice(0,2)+'；共 '+en.length+' 个字母。','完整拼写：'+en]));
 rows.push(make('reassessment',10,form===0?'The flowers ___ beautiful.':'My friend ___ kind.',form===0?'are':'is',['am','is','are'],'G1'));
 rows.push(make('reassessment',11,form===0?'She ___ books every day.':'They ___ in the garden.',form===0?'reads':'play',form===0?['read','reads']:['play','plays'],'G2'));
 rows.push(make('reassessment',12,'排列句子水晶',form===0?'We are good friends.':'Mia likes her school.',(form===0?'We are good friends.':'Mia likes her school.').split(' '),'G3','order'));
 return rows;
 }
 const prompts=form===0?[
 ['朋友说 “Hello!”。你如何打招呼？','Hello!', ['Hello!','Goodbye!','I am ten.']],
 ['朋友问 “How are you?”。你如何回答？','I am fine, thank you.',['I am fine, thank you.','It is a pencil.','At school.']],
 ['你想借铅笔。选择礼貌说法。','Can I borrow your pencil, please?',['Can I borrow your pencil, please?','Give pencil.','I pencil.']],
 ['向新朋友打招呼，输入 Hello 或 Hi。','hello',null],
 ['告诉朋友“我准备好了”。','I am ready.',null],
 ['你想表达感谢。','Thank you.',null],
 ['你没听清，礼貌请对方重复。','Please say that again.',null],
 ['你想知道对方的名字。','What is your name?',null],
 ['朋友帮助了你，你说什么？','Thank you.',null],
 ['告诉伙伴“我们是朋友”。','We are friends.',null],
 ['你没听清楚，请对方再说一遍。','Please say that again.',null],
 ['你想问对方叫什么名字。','What is your name?',null],
 ['你想告诉伙伴“我喜欢英语”。','I like English.',null]
 ]:[
 ['早上见到老师，你说什么？','Good morning!',['Good morning!','Good night!','Goodbye!']],
 ['别人说 “Thank you.”，你如何回应？','You are welcome.',['You are welcome.','I am ten.','It is blue.']],
 ['你想加入游戏。选择礼貌问法。','Can I join the game, please?',['Can I join the game, please?','Game me.','I game.']],
 ['早上向伙伴问好。','Good morning.',null],
 ['回应别人的感谢。','You are welcome.',null],
 ['你想表达“我喜欢阅读”。','I like reading.',null],
 ['你想问朋友是否准备好了。','Are you ready?',null],
 ['你想礼貌地请求帮助。','Can you help me, please?',null],
 ['朋友感谢你，你如何回应？','You are welcome.',null],
 ['你想告诉朋友“我喜欢音乐”。','I like music.',null],
 ['你想询问对方是否准备好了。','Are you ready?',null],
 ['你需要帮助，请礼貌表达。','Can you help me, please?',null],
 ['你想告诉朋友“我们可以一起学习”。','We can learn together.',null]
 ];
 return prompts.map(([p,a,opts],i)=>make(i<3?'diagnostic':i<8?'practice':'reassessment',i,p,a,opts||[],'COMM',opts?'choice':'expression',['先想清楚情境：打招呼、请求还是回应？','可以使用完整句子，也可以选择合适的简短表达。','示例表达：'+a]));
}
function chooseQuestions(module){
 const previous=state.sessions.filter(s=>s.moduleId===module).length,form=previous%2;
 const all=bank(module,form),seen=new Set(state.seen[module]||[]);
 const round={};for(const p of PHASES)round[p]=shuffle(all.filter(q=>q.phase===p));
 return {round,form,review:previous>=2||all.some(q=>seen.has(q.id))};
}
function start(){if(!identityOK()||!storageOK)return toast('请先解决记录读取问题。');if(!eligible(chosenModule)&&!returnModule)return toast('请先完成前一关。');try{state=read();}catch{storageOK=false;return toast('记录无法读取，已暂停任务。');}
 const pick=chooseQuestions(chosenModule);session={sessionId:uid(),learnerId:learner.id,moduleId:chosenModule,ruleVersion:RULE,startedAt:now(),form:pick.form,review:pick.review,questionSets:pick.round,records:[],adaptivePath:'pending',remediationEvents:[],adaptationEvidence:[]};if(pendingFocus){const pool=similarQuestions(pendingFocus,session.form*3);if(pool.length>=13){session.isTargeted=true;session.focusTag=pendingFocus;session.questionSets={diagnostic:pool.slice(0,3).map(q=>({...q,phase:'diagnostic'})),practice:pool.slice(3,8),reassessment:pool.slice(8,13).map(q=>({...q,phase:'reassessment'}))};}pendingFocus=null;}phaseIndex=0;qIndex=0;showQuestion();}
function showQuestion(){stopSpeech();view='question';answered=false;selected=[];hintLevel=0;answerSource='typed';typingStart=performance.now();item=session.questionSets[PHASES[phaseIndex]][qIndex];itemRecord={questionId:item.id,stage:item.phase,skill:item.skill,prompt:item.prompt,expected:item.answer,attempts:[],focusTag:focusTag(item),highestHintUsed:0,firstAttemptCorrect:null,completedCorrectly:false,startedAt:now()};
 resetDialog();$('task').hidden=false;$('dialogIcon').textContent=phaseIndex===2?'🌟':'💎';$('dialogTitle').textContent=META[session.moduleId].title;$('dialogText').textContent=PHASE_NAMES[phaseIndex];$('step').textContent=(session.review?'复习轮 · ':'新题轮 · ')+(qIndex+1)+' / '+session.questionSets[item.phase].length+(phaseIndex===1?' · 可重试和求助':' · 一次独立作答');$('progressFill').style.width=((phaseIndex+(qIndex/session.questionSets[item.phase].length))/3*100)+'%';$('question').textContent=item.prompt;$('answers').replaceChildren();$('feedback').textContent='';$('feedback').className='';$('hintText').hidden=true;$('hintText').textContent='';$('hint').hidden=phaseIndex!==1;$('hint').disabled=false;$('hint').textContent='伙伴提示 · H1';$('reset').hidden=item.type!=='order';$('reset').disabled=false;$('sentence').hidden=item.type!=='order';$('sentence').textContent='点击词语组成句子';$('inputAnswer').value='';$('inputAnswer').hidden=!['input','expression'].includes(item.type);$('inputLabel').hidden=$('inputAnswer').hidden;$('inputAnswer').disabled=false;$('mic').disabled=false;$('mic').hidden=item.type!=='expression';$('speechStatus').textContent=item.type==='expression'?'可输入，或语音转写后检查文字。这里只检查表达内容。':'';$('enter').textContent='提交答案 · Check';$('enter').disabled=['choice','order'].includes(item.type);
 if(item.type==='choice'||item.type==='order')for(const value of shuffle(item.options)){const b=document.createElement('button');b.className='choice';b.textContent=value;b.onclick=()=>{if(answered||!identityOK())return;sound('tap');if(item.type==='choice'){selected=[value];$('answers').querySelectorAll('button').forEach(x=>x.style.borderColor=x===b?'#8661cc':'');}else{selected.push(value);b.disabled=true;$('sentence').textContent=selected.join(' ');}$('enter').disabled=item.type==='order'?selected.length!==item.options.length:false;};$('answers').append(b);}
 if(phaseIndex===1&&session.adaptivePath==='guided'){hintLevel=1;itemRecord.highestHintUsed=1;$('hintText').hidden=false;$('hintText').textContent=state.companion+' · H1：'+item.hints[0];$('hint').textContent='再给一点提示 · H2';}
}
function expressionCorrect(response){const a=norm(response),expected=norm(item.answer);if(a===expected)return true;const alternatives={hello:['hi','hello there'], 'thank you':['thanks','thank you very much','thanks a lot'],'please say that again':['could you repeat that please','can you say that again please','say that again please','could you say that again please'],'what is your name':["what's your name"],'you are welcome':["you’re welcome","you're welcome",'no problem'],'can you help me please':['please help me','could you help me please']};return (alternatives[expected]||[]).includes(a);}
function submit(){if(!identityOK()||answered)return;stopSpeech();const response=['input','expression'].includes(item.type)?$('inputAnswer').value.trim():selected.join(' ');if(!response)return toast('先填写或选择你的答案。');const correct=item.type==='expression'?expressionCorrect(response):norm(response)===norm(item.answer);if(!correct&&session.moduleId==='C'){const text=norm(response);if(/\b(i (?:is|are)|(?:we|they|you) (?:is|am)|(?:he|she) (?:am|are))\b/.test(text))itemRecord.errorSkill='G1';else if(/\b(?:he|she) (?:go|like|play|have|read|do)\b/.test(text))itemRecord.errorSkill='G2';}const attempt={response,correct,hintLevel,inputMode:item.type==='expression'?answerSource:item.type==='input'?'typed':'selected',at:now(),elapsedMs:Math.round(performance.now()-typingStart)};itemRecord.attempts.push(attempt);if(itemRecord.firstAttemptCorrect===null)itemRecord.firstAttemptCorrect=correct;sound(correct?'correct':'retry');
 $('feedback').className=correct?'good':'retry';
 if(!correct&&phaseIndex===1){$('feedback').textContent=item.type==='expression'?'这句表达暂时不在本练习的可识别答案中。可以换一种说法或查看示例；不代表其他表达一定错误。':'还差一点。检查一下，也可以向伙伴求助。';return;}
 answered=true;itemRecord.completedCorrectly=correct;itemRecord.completedAt=now();session.records.push(itemRecord);$('hint').disabled=true;$('reset').disabled=true;$('inputAnswer').disabled=true;$('mic').disabled=true;$('answers').querySelectorAll('button').forEach(b=>b.disabled=true);
 $('feedback').textContent=correct?'✨ 做得好！这一块水晶亮起来了。':item.type==='expression'?'本题按有限表达规则未匹配；老师可在记录中查看原回答。\n示例：'+item.answer:'谢谢你独立尝试。参考答案：'+item.answer;
 $('enter').textContent='继续 →';$('enter').disabled=false;$('enter').focus();
}
function recommendation(){
 const module=session.moduleId;if(/^G[123]$/.test(module)){if(session.isTargeted)return null;const wrong=session.records.filter(r=>r.stage==='reassessment'&&!r.firstAttemptCorrect);if(!wrong.length)return null;const tag=mistakes(wrong)[0];return {target:module,focusTag:tag,reason:'建议巩固：'+(FOCUS_NAMES[tag]||META[module].topic)+'。接下来更换句子，练习同一个错点。'};}
 const independent=session.records.filter(r=>r.stage!=='practice'),last=independent.slice(-5);if(last.length<5)return null;
 const current=score(last),baseline=module==='S'?Math.round(['G1','G2','G3'].reduce((s,m)=>s+(resultFor(m).percent||0),0)/3):resultFor('S').percent;
 if(current>=60||baseline-current<25)return null;
 const errors=last.filter(r=>!r.firstAttemptCorrect);const counts={};for(const r of errors){const skill=r.errorSkill||r.skill;counts[skill]=(counts[skill]||0)+1;}const grammar=Object.keys(counts).filter(k=>/^G[123]$/.test(k)).sort((a,b)=>counts[b]-counts[a])[0];return {current,baseline,target:grammar||(module==='S'?'S':'C'),focusTag:grammar?mistakes(errors.filter(r=>(r.errorSkill||r.skill)===grammar))[0]:null,reason:grammar?'本轮出现对应语法错误，建议先巩固该知识点。':module==='S'?'错误主要来自拼写，留在花园练习字母组合。':'表达内容尚未匹配，先使用城堡里的表达支架。不能据此判断发音。'};
}
function next(){adaptRemainingPractice();qIndex++;if(qIndex<session.questionSets[PHASES[phaseIndex]].length)return showQuestion();if(phaseIndex===0){session.adaptivePath=score(session.records.filter(r=>r.stage==='diagnostic'))<67?'guided':'independent';adaptAfterDiagnostic();}if(phaseIndex<2){phaseIndex++;qIndex=0;return showQuestion();}finish();}
async function save(){if(!identityOK())return false;const bound=session;const commit=()=>{if(active()?.id!==bound.learnerId||session!==bound)throw Error('身份已变化');const latestState=read();const found=latestState.sessions.find(s=>s.sessionId===session.sessionId);if(found){found.remediationEvents=session.remediationEvents;persist(latestState);}else{latestState.sessions.push(session);latestState.seen[session.moduleId]=[...new Set([...(latestState.seen[session.moduleId]||[]),...session.records.map(r=>r.questionId)])];if(!session.isTargeted&&session.summary.reassessment>=PASS)latestState.rewards[session.moduleId]=3;persist(latestState);}};try{if(navigator.locks)await navigator.locks.request('aura-kingdom-'+learner.id,commit);else commit();render();return true;}catch{toast('保存未成功，请保留本页，点击重新保存。');return false;}}
async function finish(){session.completedAt=session.completedAt||now();session.summary=Object.fromEntries(PHASES.map(p=>[p,score(session.records.filter(r=>r.stage===p))]));session.summary.passed=session.summary.reassessment>=PASS;session.recommendation=recommendation();session.limitations=['Immediate small-item assessment','Finite rule-based scoring','Not durable mastery'];if(session.moduleId==='C')session.limitations.push('Expression preparation only; no pronunciation score');const bound=session;const saved=await save();if(session!==bound||active()?.id!==bound.learnerId)return;view=saved?'result':'save';resetDialog();$('dialogIcon').textContent=session.summary.passed?'🏆':'🌱';$('dialogTitle').textContent=session.isTargeted?'错点巩固已完成':session.summary.passed?'这一关通过啦！':'找到下一步练习方向啦';$('dialogText').textContent='独立复测 '+session.summary.reassessment+'% · 通关线 80%';$('extra').hidden=false;$('extra').textContent='诊断 '+session.summary.diagnostic+'% → 练习首次作答 '+session.summary.practice+'% → 独立复测 '+session.summary.reassessment+'%\n'+(session.isTargeted?'本次仅巩固一个错点，不改变整关通关成绩。':session.summary.passed?'奖励最多每关 3 星；反复通关不会重复领取。':'继续练习后，再用另一套题挑战。')+(session.recommendation?'\n\n'+session.recommendation.reason:'')+'\n'+(saved?'记录已保存。':'保存失败，请重新保存。');$('enter').textContent=saved?(session.recommendation?'查看针对性补习':returnModule?'返回 '+returnModule+' 继续挑战':'返回关卡选择'):'重新保存';$('export').hidden=false;if(session.moduleId==='C'&&session.summary.passed){$('formal').hidden=false;$('formal').href='#';$('formal').textContent='🎙 真实录音任务（老师评估）';$('formal').onclick=e=>{e.preventDefault();recordingTask();};}if(session.summary.passed){sound('win');celebrate();}}
function remediate(){const r=session.recommendation;session.remediationEvents.push({target:r.target,reason:r.reason,at:now()});view='remediation';resetDialog();$('dialogIcon').textContent='🛠';$('dialogTitle').textContent='伙伴补习 · '+r.target;$('dialogText').textContent=r.reason;$('extra').hidden=false;const notes={G1:'I am；he / she / 单数名词用 is；we / they / 复数名词用 are。',G2:'一般现在时中，he / she / 单数名词后动词通常加 s 或 es。其他主语通常用原形。',G3:'陈述句通常是主语＋动词＋其他成分；疑问句注意 be 或助动词的位置。',S:'先读词，再拆分字母组合，最后放进句子。单词拼错不等于语法没学会。',C:'先确定交际目的，再用句子开头组织回答：I am… / I like… / Can you…?'};$('extra').textContent=notes[r.target]+'\n\n'+session.records.filter(x=>(x.errorSkill||x.skill)===r.target&&!x.firstAttemptCorrect).map(x=>x.prompt+'\n你的回答：'+x.attempts[0].response+'\n参考：'+x.expected).join('\n\n');$('enter').textContent=/^G[123]$/.test(r.target)?'去 '+r.target+' 完成针对性巩固':'返回 '+session.moduleId+' 用另一套题再试';save();}
function celebrate(){clearTimeout(celebrationTimer);$('celebration').replaceChildren();if(reduced.matches)return;for(let i=0;i<25;i++){const e=document.createElement('span');e.className='confetti';e.textContent=['⭐','✨','💎'][i%3];e.style.left=Math.random()*100+'%';e.style.animationDelay=Math.random()*.4+'s';$('celebration').append(e);}celebrationTimer=setTimeout(()=>$('celebration').replaceChildren(),2400);}
function stopSpeech(){recognitionId++;if(recognizer){recognizer.onresult=null;recognizer.onerror=null;recognizer.onend=null;try{recognizer.abort();}catch{}recognizer=null;}$('mic').disabled=false;}
$('mic').onclick=()=>{if(!identityOK()||answered)return;const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return $('speechStatus').textContent='当前浏览器不支持语音转写，请输入回答；正式录音任务可单独打开。';stopSpeech();const token=recognitionId;const rec=new SR();recognizer=rec;rec.lang='en-US';rec.interimResults=false;rec.onresult=e=>{if(token!==recognitionId||!identityOK()||answered)return;$('inputAnswer').value=e.results[0][0].transcript;answerSource='speech-transcript';$('speechStatus').textContent='已转成文字，请检查后提交。没有保存音频，也没有发音评分。';};rec.onerror=()=>{$('speechStatus').textContent='未能完成转写，可继续输入回答。';};rec.onend=()=>{$('mic').disabled=false;if(recognizer===rec)recognizer=null;};try{rec.start();$('mic').disabled=true;$('speechStatus').textContent='正在听…… 浏览器会处理语音转写。';}catch{$('speechStatus').textContent='无法启动转写，请输入回答。';}};
$('inputAnswer').addEventListener('input',()=>{answerSource=answerSource==='speech-transcript'?'edited-transcript':'typed';});
$('inputAnswer').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&!$('enter').disabled)$('enter').click();});
function mainAction(){if(!identityOK())return;if(view==='menu'){if(eligible(chosenModule))intro(chosenModule);else{close();area('grammar');}}else if(view==='intro')start();else if(view==='question'){if(answered)next();else submit();}else if(view==='save')finish();else if(view==='result'){if(session.recommendation)remediate();else if(returnModule){const destination=returnModule;returnModule=null;intro(destination);}else intro(session.moduleId);}else if(view==='remediation'){const target=session.recommendation.target;if(/^G[123]$/.test(target)){returnModule=session.moduleId;pendingFocus=session.recommendation.focusTag||null;intro(target);}else intro(session.moduleId);}else close();}
$('enter').onclick=mainAction;
$('hint').onclick=()=>{if(!identityOK()||phaseIndex!==1||answered||hintLevel>=3)return;$('hintText').hidden=false;$('hintText').textContent=state.companion+' · H'+(hintLevel+1)+'：'+item.hints[hintLevel];hintLevel++;itemRecord.highestHintUsed=hintLevel;$('hint').textContent=hintLevel===3?'全部提示已显示':'再给一点提示 · H'+(hintLevel+1);$('hint').disabled=hintLevel===3;};
$('reset').onclick=()=>{if(answered||!identityOK())return;selected=[];$('sentence').textContent='点击词语组成句子';$('answers').querySelectorAll('button').forEach(b=>b.disabled=false);$('enter').disabled=true;};
$('export').onclick=e=>{e.preventDefault();if(!identityOK()||!session)return;const url=URL.createObjectURL(new Blob([JSON.stringify(session,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='AURA-'+session.moduleId+'-'+session.sessionId+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);};
for(const b of document.querySelectorAll('.area'))b.onclick=()=>area(b.dataset.area);
for(const b of document.querySelectorAll('.companion'))b.onclick=()=>{if(!identityOK()||moving)return;try{const d=read();d.companion=b.dataset.companion;persist(d);render();sound('tap');toast(d.companion+'：一起探索吧！');}catch{toast('伙伴选择未能保存。');}};
$('home').onclick=$('camp').onclick=()=>{if(!identityOK())return;travel('camp',()=>{$('route').setAttribute('points','');toast('回到伙伴营地。');});};
$('close').onclick=$('back').onclick=close;$('overlay').onclick=e=>{if(e.target===$('overlay'))close();};
$('chooseLearner').onclick=()=>location.href='index.html';
$('journey').onclick=()=>{if(!identityOK()||moving)return;resetDialog();view='info';$('dialogTitle').textContent='我的旅程 · My Journey';$('dialogIcon').textContent='🧭';$('dialogText').textContent='通关线 80%，不要求每题都完美。';$('extra').hidden=false;$('extra').textContent=['G1','G2','G3','S','C'].map(m=>META[m].title+'：'+(resultFor(m).percent===null?'未完成':resultFor(m).percent+'%')+(eligible(m)?'':' 🔒')).join('\n')+'\n故事星星：'+stars()+' / 15';$('enter').textContent='继续探索';open();};
$('help').onclick=()=>{if(!identityOK())return;try{const d=read();d.sound=!d.sound;persist(d);toast('游戏音效已'+(d.sound?'开启':'关闭')+'。通关需独立复测至少答对 4 / 5 题。');if(d.sound)sound('tap');}catch{toast('音效设置未能保存。');}};
$('help').textContent='🔊 音效开关';
addEventListener('keydown',e=>{if($('overlay').hidden)return;if(e.key==='Escape')return close();if(e.key!=='Tab')return;const list=[...$('dialog').querySelectorAll('button,a,input')].filter(x=>!x.disabled&&x.getClientRects().length);const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
addEventListener('storage',e=>{if(e.key==='aura_active_learner_id_v2'||e.key==='aura_learner_profiles_v2'||e.key===null)identityOK();else if(e.key===PREFIX+encodeURIComponent(learner.id)&&!session)bind();});
addEventListener('focus',()=>{if(identityOK()&&$('overlay').hidden){try{state=read();render();}catch{toast('学习记录无法读取。');}}});
addEventListener('beforeunload',e=>{if((view==='recording'&&!recordingSaved)||(session&&!session.completedAt)){e.preventDefault();e.returnValue='';}});
$('scene').addEventListener('error',()=>toast('地图图片缺失：assets/aura-kingdom.png'));
for(let i=0;i<30;i++){const e=document.createElement('span');e.className='sparkle';e.style.left=Math.random()*100+'%';e.style.top=35+Math.random()*60+'%';e.style.animationDelay=-Math.random()*7+'s';$('magic').append(e);}
/* Optional actual speaking recording. No automated pronunciation grade. */
let recorder=null, recordingStream=null, recordingURL=null, recordingToken=0;
let recordingData=null, recordingStarted=0, recordingDuration=0, recordingTimer=null;
let recordingBound=null, recordingSaved=false;
function releaseRecording(){recordingToken++;clearTimeout(recordingTimer);if(recorder&&recorder.state!=='inactive'){recorder.onstop=null;try{recorder.stop();}catch{}}recorder=null;if(recordingStream)recordingStream.getTracks().forEach(t=>t.stop());recordingStream=null;if(recordingURL)URL.revokeObjectURL(recordingURL);recordingURL=null;}
function recordingTask(){if(!identityOK()||!eligible('C'))return;resetDialog();view='recording';recordingBound=learner.id;recordingSaved=false;recordingData=null;$('dialogIcon').textContent='🎙';$('dialogTitle').textContent='城堡真实表达 · Speaking Recording';$('dialogText').textContent='Introduce yourself and your partner. Tell us one thing you like. 用英语介绍自己和伙伴，再说一项爱好。';$('step').textContent='最多录制 30 秒；播放确认后保存。老师评估，不自动给口语分。';$('extra').hidden=false;$('extra').replaceChildren();
 const controls=document.createElement('div'),record=document.createElement('button'),stop=document.createElement('button'),player=document.createElement('audio'),label=document.createElement('label'),check=document.createElement('input'),status=document.createElement('p');
 record.textContent='开始录音';stop.textContent='停止录音';record.className=stop.className='action secondary';stop.disabled=true;player.controls=true;player.style.width='100%';player.style.marginTop='14px';check.type='checkbox';check.disabled=true;label.append(check,document.createTextNode(' 我已播放并确认包含自己的英语回答。'));status.setAttribute('role','status');status.textContent='录音仅保存在当前浏览器，不自动上传。';controls.append(record,stop,player,label,status);$('extra').append(controls);$('enter').textContent='保存录音证据';$('enter').disabled=true;
 function ready(){return recordingData&&check.checked&&active()?.id===recordingBound&&!recordingSaved;}
 check.onchange=()=>{$('enter').disabled=!ready();};player.onplay=()=>{if(recordingData)check.disabled=false;};
 stop.onclick=()=>{if(recorder?.state==='recording')recorder.stop();};
 record.onclick=async()=>{if(!identityOK())return;if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){status.textContent='当前浏览器不支持录音，请使用支持录音的浏览器打开本地网站。';return;}releaseRecording();const token=recordingToken;recordingData=null;check.checked=false;check.disabled=true;$('enter').disabled=true;record.disabled=true;status.textContent='正在请求麦克风权限……';try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});if(token!==recordingToken||active()?.id!==recordingBound){stream.getTracks().forEach(t=>t.stop());return;}recordingStream=stream;const chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=()=>{releaseRecording();status.textContent='录音发生错误，请重试。';record.disabled=false;stop.disabled=true;};recorder.onstop=()=>{clearTimeout(recordingTimer);recordingDuration=Date.now()-recordingStarted;stream.getTracks().forEach(t=>t.stop());recordingStream=null;stop.disabled=true;record.disabled=false;const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});if(token!==recordingToken)return;if(recordingDuration<1000||blob.size<100||blob.size>2000000){status.textContent='录音太短、为空或文件过大，请重新录制。';return;}recordingURL=URL.createObjectURL(blob);player.src=recordingURL;const reader=new FileReader();reader.onload=()=>{if(token!==recordingToken)return;recordingData={dataUrl:reader.result,mimeType:blob.type,bytes:blob.size,durationMs:recordingDuration};status.textContent='请播放录音，再勾选确认。音量和内容尚未由系统评估。';};reader.readAsDataURL(blob);};recorder.start();recordingStarted=Date.now();stop.disabled=false;status.textContent='正在录音……最多 30 秒。';recordingTimer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},30000);}catch{releaseRecording();record.disabled=false;stop.disabled=true;status.textContent='无法使用麦克风，请检查浏览器权限后重试。';}};
 $('enter').onclick=async()=>{if(!identityOK()||!ready())return;try{const data=read();data.sessions.push({sessionId:uid(),learnerId:recordingBound,moduleId:'C-AUDIO',ruleVersion:RULE,startedAt:new Date(Date.now()-recordingDuration).toISOString(),completedAt:now(),review:false,form:0,adaptivePath:'teacher-review',summary:{diagnostic:null,practice:null,reassessment:null,passed:null},recommendation:null,records:[{prompt:$('dialogText').textContent,inputMode:'audio',selfConfirmed:true,pronunciationScore:null,...recordingData}],limitations:['Self-confirmed recording','Content and pronunciation require teacher review']});persist(data);recordingSaved=true;$('enter').disabled=true;status.textContent='录音已保存，等待老师查看；没有自动判定口语通关。';sound('correct');}catch{status.textContent='保存未成功，可能是浏览器空间不足。请保留本页并重试。';}};
}

bind();position(NODES.camp);fit();
})();
