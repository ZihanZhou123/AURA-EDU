/* Original prototype content; Grade 5 pilot scope, not textbook alignment certification. */
(function(){'use strict';
const norm=s=>String(s??'').toLowerCase().replace(/[.,!?]/g,'').replace(/\s+/g,' ').trim();
const META={G1:{topic:'am / is / are'},G2:{topic:'一般现在时主谓一致'},G3:{topic:'句子语序'},S:{topic:'词汇与句子应用'},C:{topic:'情境表达'}};
const FOCUS_NAMES={
 'G1:am':'I 与 am 的搭配','G1:is':'单数主语与 is 的搭配','G1:are':'复数主语 / you 与 are 的搭配',
 'G2:third':'第三人称单数动词变化','G2:base':'非第三人称单数使用动词原形',
 'G3:be-question':'be 动词疑问句语序','G3:do-question':'do / does 疑问句语序','G3:statement':'陈述句语序'
};
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
function similarQuestions(tag,seed=0){
 const places=['at school','in the classroom','in the garden','near the window','by the door','at home','in the library','near the desk','under the tree','in the park','by the bridge','in the room','near the school','by the window','at the table','in the house','near the garden','in the playground','under the desk','near the library','at the door','in the shop','near the tree','by the river','in the kitchen','near the park'];
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

const words=[['school','学校'],['teacher','老师'],['classroom','教室'],['student','学生'],['breakfast','早餐'],['morning','早晨'],['homework','家庭作业'],['evening','晚上'],['friend','朋友'],['happy','开心的'],['helpful','乐于助人的'],['together','一起'],['garden','花园'],['library','图书馆'],['window','窗户'],['partner','伙伴'],['bridge','桥'],['castle','城堡'],['rabbit','兔子'],['lion','狮子']];
const skills={G1:['G1:am','G1:is','G1:are'],G2:['G2:third','G2:base'],G3:['G3:be-question','G3:do-question','G3:statement']};
window.AuraContent=Object.freeze({version:'Y5-PILOT-2026.1',grade:5,alignment:'原创研究样题，尚未逐册完成外研版教材对齐',norm,focusNames:FOCUS_NAMES,focusTag,similarQuestions,bank,words,skills});
})();
