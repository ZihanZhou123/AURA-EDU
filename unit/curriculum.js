/* Companion questions, not reproduced textbook pages. Sources and edition boundaries are explicit. */
(function(root){'use strict';
const C=root.UnitContent,copy=x=>JSON.parse(JSON.stringify(x));
const catalog={
'3a':['Making friends','Different families','Amazing animals','Plants around us','The colourful world','Useful numbers'],
'3b':['Meeting new people','Expressing yourself','Learning better','Healthy food','Old toys','Numbers in life'],
'4a':['Helping at home','My friends','Places we live in','Helping in the community','The weather and us','Changing for the seasons'],
'4b':['Class rules','Family rules','Time for school','Going shopping','Farms and us','From farm to table'],
'5a':['Different friends','My feelings','Work and play','Healthy habits','Food we eat','Nature and us'],
'5b':['Following the rules','Our community','Life in different seasons','My hometown','Travelling around','Making a travel plan'],
'6a':['Amazing places','Getting together','Healthy life','Managing money well','Exploring space','Energy, nature and us'],
'6b':['How tall are you?','Last weekend','Where did you go?','Then and now']};
// Rows: knowledge point, picture, listening text, comprehension prompt, answer, two distractors, writing prompt, writing target.
const rows={
'3a':[
['greet','wave','Hello! Nice to meet you.','伙伴见面时在做什么？','问好','道别','道谢','补全：h _ l l o。只写缺少的字母。','e'],
['introduce','girl','My name is Amy.','新伙伴叫什么名字？','Amy','Ben','Tom','补全：My name ___ Amy.','is'],
['body-hand','hand','This is my hand.','听到的是哪个身体部位？','hand','eye','ear','补全：h _ n d（手）。','a'],
['body-eye','eye','This is my eye.','听到的是哪个身体部位？','eye','hand','arm','补全：e _ e（眼睛）。','y'],
['body-ear','ear','This is my ear.','听到的是哪个身体部位？','ear','mouth','hand','补全：e _ r（耳朵）。','a'],
['thanks','help','Thank you, Ben.','伙伴在表达什么？','感谢','告别','自我介绍','补全：Thank ___!（谢谢你）','you'],
['friend-action','friends','We help and share.','朋友们会怎样相处？','帮助和分享','抢东西','不理人','补全：We help ___ share.（和）','and'],
['letters','letter','A, B, C, D.','听到的最后一个字母是什么？','D','B','A','写出大写 D 对应的小写字母。','d']],
'3b':[
['country','china','I am from China.','这位伙伴来自哪里？','China','Canada','the UK','补全：I am ___ China.（来自）','from'],
['country','canada','I am from Canada.','这位伙伴来自哪里？','Canada','China','the USA','补全：I ___ from Canada.','am'],
['country','uk','I am from the UK.','这位伙伴来自哪里？','the UK','China','Canada','补全：I am from ___ UK.','the'],
['country','usa','I am from the USA.','这位伙伴来自哪里？','the USA','the UK','China','补全：I am from the US _。（只填最后一个字母）','A'],
['role','teacher','Miss White is a teacher.','Miss White 是什么身份？','teacher','student','boy','补全：She ___ a teacher.','is'],
['role','student','Ben is a student.','Ben 是什么身份？','student','teacher','woman','补全：He is a stu _ ent.（学生）','d'],
['person','boy','This is a boy.','介绍的是谁？','boy','woman','girl','补全：This is a b _ y.（男孩）','o'],
['person','girl','This is a girl.','介绍的是谁？','girl','man','boy','补全：This is a g _ rl.（女孩）','i']],
'4a':[
['job','doctor','My mother is a doctor.','妈妈是什么职业？','doctor','nurse','farmer','补全：My mother ___ a doctor.','is'],
['job','nurse','My father is a nurse.','爸爸是什么职业？','nurse','doctor','farmer','写出“护士”的英文单词。','nurse'],
['job','farmer','Ben is a farmer.','Ben 是什么职业？','farmer','doctor','nurse','写出“农民”的英文单词。','farmer'],
['can-action','broom','I can sweep the floor.','伙伴能帮忙做什么？','扫地','做饭','弹琴','补全：I can ___ the floor.（扫）','sweep'],
['can-action','cook','Amy can cook.','Amy 能做什么？','做饭','扫地','读书','补全：Amy can ___.（做饭）','cook'],
['together','cook','We cook together.','他们怎样做饭？','一起做','互不理睬','只看不做','补全：We cook ___.（一起）','together'],
['can-base','broom','He can sweep the floor.','他能做什么？','扫地','弹琴','唱歌','改正括号里的词：He can (sweeps) the floor.','sweep'],
['job-sentence','doctor','My parents are doctors.','描述的是谁的职业？','父母两人','一个朋友','一位老师','补全：My parents ___ doctors.','are']],
'4b':[
['rule-action','quiet','Be quiet, please.','老师希望大家怎样做？','安静','跑步','大喊','补全：Be ___, please.（安静）','quiet'],
['rule-action','clean','Keep the classroom clean.','伙伴建议怎样做？','保持教室干净','在走廊跑','大声说话','补全：Keep the classroom ___.（干净）','clean'],
['rule-negative','stop','Do not run in the classroom.','哪件事不应该做？','在教室跑','安静阅读','整理课桌','补全：Do ___ run in the classroom.','not'],
['rule-time','clock','Do not be late for class.','这条规则提醒什么？','上课不迟到','上课吃东西','课上睡觉','补全：Do not be ___ for class.（迟到）','late'],
['rule-action','hand','Raise your hand, please.','回答前可以怎样做？','举手','喊叫','推挤','补全：Raise your ___.（手）','hand'],
['rule-action','ear','Listen to the teacher.','课堂上要认真做什么？','听老师讲','吃东西','跑步','补全：Listen ___ the teacher.','to'],
['rule-negative','food','Do not eat in class.','这条规则不允许什么？','课上吃东西','听讲','举手','改正括号里的词：Do not (eats) in class.','eat'],
['rule-action','book','Read quietly, please.','读书时应怎样做？','轻声','大喊','推挤','补全：Read ___.（轻声地）','quietly']],
'5a':[
['trait','student','My friend Amy is clever.','Amy 有什么特点？','clever','angry','sad','写出“聪明的”英文单词。','clever'],
['trait','rabbit','The rabbit is lovely.','兔子有什么特点？','lovely','worried','angry','写出“可爱的”英文单词。','lovely'],
['trait','student','Ben is hard-working.','Ben 有什么特点？','勤奋','生气','担心','补全：Ben ___ hard-working.','is'],
['ability','piano','Amy can play the piano.','Amy 会什么？','弹钢琴','下棋','制作机器人','补全：Amy can play the ___.（钢琴）','piano'],
['ability','robot','Ben can make a robot.','Ben 会什么？','制作机器人','弹琴','跳绳','补全：Ben can make a ___.（机器人）','robot'],
['ability','chess','My friend can play chess.','朋友会什么？','下棋','弹琴','唱歌','补全：My friend can play ___.（国际象棋）','chess'],
['ability','friends','Luna can jump rope.','Luna 会什么？','跳绳','弹琴','做饭','补全：Luna can ___ rope.（跳）','jump'],
['trait-sentence','friends','My friends are wonderful.','怎样评价这些朋友？','很棒','生气','害怕','补全：My friends ___ wonderful.','are']],
'5b':[
['rule-meaning','quiet','We should talk quietly in the computer room.','在计算机房应怎样说话？','轻声','大喊','唱歌','补全：We should talk ___.（轻声地）','quietly'],
['rule-negative','food','No eating or drinking.','这条规则禁止什么？','吃喝','阅读','排队','补全：___ eating or drinking.（禁止）','No'],
['rule-password','lock','Do not give out your password.','什么信息不应随便告诉别人？','密码','天气','书名','补全：Do not give out your ___.（密码）','password'],
['rule-work','computer','Save your work.','离开前应该怎样处理文件？','保存','删除全部','不管它','补全：___ your work.（保存）','Save'],
['rule-meaning','tree','Keep off the grass.','这条规则在保护什么？','草地','课桌','钢琴','补全：Keep ___ the grass.（不要踏入）','off'],
['rule-negative','stop','Do not touch the painting.','什么行为被禁止？','触摸画作','观看画作','排队入场','改正括号里的词：Do not (touches) the painting.','touch'],
['rule-turn','friends','Please wait your turn.','轮到别人时应该怎样做？','等待','插队','推人','补全：Please ___ your turn.（等待）','wait'],
['rule-reason','tree','This rule protects the grass.','这条规则有什么作用？','保护草地','让草地变脏','让人跑步','补全：This rule ___ the grass.（protect 的正确形式）','protects']],
'6a':[
['past-go','travel','I went to a village last summer.','旅行是什么时候？','去年夏天','明天','每周','补全：Last summer, I ___ to a village.（go）','went'],
['past-see','tree','I saw bamboo in the village.','在村庄看见了什么？','竹子','钢琴','飞机','补全：I ___ bamboo.（see 的过去式）','saw'],
['past-eat','pumpkin','I ate pumpkin there.','在那里吃了什么？','南瓜','面包','蛋糕','补全：I ___ pumpkin.（eat 的过去式）','ate'],
['past-take','camera','We took photos of the village.','他们做了什么？','拍照','弹琴','做饭','补全：We ___ photos.（take 的过去式）','took'],
['past-was','travel','It was a wonderful trip.','怎样评价这次旅行？','很棒','糟糕','还未出发','补全：It ___ a wonderful trip.','was'],
['past-go','home','Amy went to the village with Ben.','谁和 Amy 一起去？','Ben','Luna','Finn','改正括号里的词：Yesterday, Amy (go) to a village.','went'],
['past-detail','tree','We saw bamboo and took photos.','哪两件事都发生了？','看竹子并拍照','弹琴并唱歌','吃饭并跳绳','补全：We saw bamboo ___ took photos.（和）','and'],
['past-was','friends','My friends were happy after the trip.','朋友们旅行后感觉怎样？','开心','担心','生气','补全：My friends ___ happy yesterday.（be）','were']],
'6b':[
['compare-height','ruler','Amy is 1.5 metres tall. Ben is 1.6 metres tall.','谁更高？','Ben','Amy','一样高','补全：Ben is ___ than Amy.（tall）','taller'],
['compare-age','friends','Amy is eleven. Ben is twelve.','谁年龄更大？','Ben','Amy','一样大','补全：Ben is ___ than Amy.（old）','older'],
['compare-length','ruler','The blue ruler is twenty centimetres. The red ruler is ten centimetres.','哪把尺子更长？','蓝尺子','红尺子','一样长','补全：The blue ruler is ___.（long）','longer'],
['compare-weight','bag','Bag A is two kilograms. Bag B is three kilograms.','哪个书包更重？','B','A','一样重','补全：Bag B is ___.（heavy）','heavier'],
['compare-size','shoe','These shoes are bigger than those shoes.','这双鞋和那双相比怎样？','更大','更小','一样大','补全：These shoes are ___.（big）','bigger'],
['compare-height','tree','Tree A is shorter than Tree B.','哪棵树更高？','B','A','一样高','补全：Tree A is ___ than Tree B.（short）','shorter'],
['compare-word','ruler','How tall are you?','这个问题在问什么？','身高','年龄','体重','补全：How ___ are you?（多高）','tall'],
['compare-word','bag','How heavy is this bag?','这个问题在问什么？','重量','颜色','长度','补全：How ___ is this bag?（多重）','heavy']]
};
const lower={
3:{title:catalog['3b'][0],zh:'新朋友，来自哪里？',theme:'friends',task:'制作一张虚构伙伴的介绍卡',unit2:catalog['3b'][1],words:[['China','中国','china'],['Canada','加拿大','canada'],['teacher','教师','teacher'],['student','学生','student']],starter:'I am … / I am from …',model:'I am Amy. I am from China.',writingPrompt:'为虚构伙伴填写名字和来自哪里；使用学过的短句。',level:'图片、词语与介绍短句',goals:['辨认人物和国家','介绍伙伴来自哪里','读懂新朋友名片','补全介绍短句'],speak:[['Where are you from?','可以选择图片中的虚构身份。','I am from …','I am from China.','china'],['Who is this?','介绍一位虚构教师。','This is …','This is my teacher.','teacher'],['Is Ben a student?','看任务卡：Ben 是学生。','Yes, …','Yes, he is.','student'],['Tell me about your new friend.','说出名字和来自哪里。','This is … / He is from …','This is Ben. He is from Canada.','friends']]},
4:{title:catalog['4b'][0],zh:'一起设计友善课堂',theme:'classroom',task:'制作一张课堂规则卡',unit2:catalog['4b'][1],words:[['quiet','安静','quiet'],['clean','干净','clean'],['hand','手','hand'],['rule','规则','book']],starter:'Please … / Do not …',model:'Please be quiet. Do not run in class.',writingPrompt:'为课堂写两条简短、清楚的规则，可以使用 Please 或 Do not。',level:'课堂指令与规则表达',goals:['听懂课堂规则','说清楚应该怎样做','读懂规则及情境','写出简短课堂规则'],speak:[['What can we do in class?','说一条合适的课堂行为。','We can …','We can listen to the teacher.','ear'],['Tell me one class rule.','为友善课堂提出规则。','Please …','Please be quiet.','quiet'],['Can we run in the classroom?','想一想安全和规则。','No, …','No. Do not run in the classroom.','stop'],['Make a rule for our reading time.','给阅读时间提出一条规则。','Please …','Please read quietly.','book']]},
5:{title:catalog['5b'][0],zh:'规则背后，有个为什么',theme:'rules',task:'设计一张公共场所规则说明卡',unit2:catalog['5b'][1],words:[['password','密码','lock'],['save','保存','computer'],['quietly','轻声地','quiet'],['grass','草地','tree']],starter:'We should … / Do not …',model:'We should talk quietly. Do not give out your password.',writingPrompt:'选择计算机房或公共场所，写两条相关规则，并尝试说明一条规则的作用。',level:'规则、行为与原因',goals:['听懂不同场所规则','说明合适行为','理解规则保护什么','写出有联系的规则'],speak:[['What are the rules in the computer room?','说出一条计算机房规则。','We should …','We should talk quietly.','computer'],['What should you do before leaving?','离开计算机房前怎么处理作品？','I should …','I should save my work.','computer'],['Can you give out your password?','说明密码应该怎样保管。','No. Do not …','No. Do not give out your password.','lock'],['Why should we keep off the grass?','尝试把规则与作用联系起来。','This rule …','This rule protects the grass.','tree']]},
6:{title:catalog['6b'][0],zh:'用英语比较身边的事物',theme:'compare',task:'制作一张虚构物品比较卡',unit2:catalog['6b'][1],words:[['taller','更高','ruler'],['longer','更长','ruler'],['heavier','更重','bag'],['bigger','更大','shoe']],starter:'… is … than …',model:'Tree A is taller than Tree B.',writingPrompt:'根据虚构数据比较两件物品，组织两到三句有联系的话。不要填写真实身高或体重。',level:'比较、数据理解与短段表达',goals:['听懂比较关系','用数据解释比较','整合图文比较信息','写简单比较短段'],speak:[['Which tree is taller?','设定：Tree A 为 3 米，Tree B 为 2 米。','Tree … is …','Tree A is taller than Tree B.','tree'],['Which bag is heavier?','设定：Bag A 为 2 千克，Bag B 为 3 千克。','Bag … is …','Bag B is heavier than Bag A.','bag'],['Compare these two rulers.','设定：红尺 10 厘米，蓝尺 20 厘米。','The … ruler is …','The blue ruler is longer than the red ruler.','ruler'],['Tell me two things about the bags.','设定：A 更大，B 更重；组织两个相关信息。','Bag A … / Bag B …','Bag A is bigger. Bag B is heavier.','bag']]}
};
const books={};
for(const grade of [3,4,5,6])for(const term of ['a','b']){
 const key=grade+term,g=term==='a'?copy(C.grades[grade]):{...copy(C.grades[grade]),...lower[grade]};
 g.grade=grade;g.term=term;g.edition=key==='6b'?'PEP 旧版（独立册）':'PEP 新版配套资源系列';g.catalog=catalog[key];
 if(term==='b'){
  g.subtitle='把本单元学过的词句，放进看得见、说得出的任务里。';g.writingFrame='';g.writingEnd='';g.readTitle='规则与伙伴任务卡';g.readArt=g.theme;
  g.source=key==='6b'?'https://www.pep.com.cn/zslth/yyptypzj/xypep/6x/':'https://www.pep.com.cn/zslth/yyptzy/xypep/'+grade+'x/';
  g.reference=g.source;g.basis=key==='6b'?'本册为旧版 PEP，比身高、年龄、长度和重量。与六上新版分开标注；不是新版六下的替代目录。':'本册单元名称已核对人教社配套目录。以下题目依据单元语言功能编制，是配套练习，仍需结合实际课本版权页和教师逐题审校。';
  g.speak=lower[grade].speak.map(([q,zh,starter,model,art])=>({q,zh,starter,model,art,tips:'可以使用不同但合理的表达。需要时听例句，再换成自己的内容。'}));
 }else{
  const a=g.speak;g.speak.push({...copy(a[0]),starter:grade===3?'This is …':grade===4?'We can …':grade===5?'I choose … because …':'It was …',q:grade===3?'Please introduce a new friend.':grade===4?'Tell me one thing you can do with your family.':grade===5?'Choose a friend for the music team. Tell me why.':'Tell me how the trip was.',zh:'结合本单元图片，组织自己的表达。',model:grade===3?'This is Ben.':grade===4?'We can cook together.':grade===5?'I choose Amy. She can play the piano.':'It was a wonderful trip.'});
  g.speak.push({...copy(a[1]),starter:grade===3?'Thank …':grade===4?'I can …':grade===5?'My friend is … / She can …':'I went … / I saw …',q:grade===3?'A friend helps you. What do you say?':grade===4?'Can you help at home? Tell me two things.':grade===5?'Tell me two things about your friend.':'Tell me about a trip from start to finish.',zh:'把本单元学过的内容连接起来说。',model:grade===3?'Thank you!':grade===4?'I can sweep the floor. We can cook together.':grade===5?'My friend is clever. She can make a robot.':'I went to a village. I saw bamboo. It was wonderful.'});
 }
 const rs=rows[key];
 function q(row,i,kind,variant=0){const [tag,art,audio,prompt,answer,d1,d2,wp,wa]=row;let statement=audio,question=prompt,target=answer,choices=[answer,d1,d2],writePrompt=wp,writeAnswer=wa;
  if(variant){statement=audio.replace(/Amy/g,variant===1?'Kate':'Rose').replace(/Ben/g,variant===1?'Sam':'Jack').replace(/Luna/g,variant===1?'Ella':'May');question=prompt.replace(/Amy/g,variant===1?'Kate':'Rose').replace(/Ben/g,variant===1?'Sam':'Jack').replace(/Luna/g,variant===1?'Ella':'May');choices=choices.map(x=>x.replace(/Amy/g,variant===1?'Kate':'Rose').replace(/Ben/g,variant===1?'Sam':'Jack').replace(/Luna/g,variant===1?'Ella':'May'));target=choices[0];writePrompt=wp.replace(/Amy/g,variant===1?'Kate':'Rose').replace(/Ben/g,variant===1?'Sam':'Jack').replace(/Luna/g,variant===1?'Ella':'May');
  }
  const id=key+'-'+(variant?'v'+variant:'p')+'-'+kind+'-'+i;
  const itemTag=kind==='write'?(/I ___ from/.test(writePrompt)?'be-am':/My name ___|She ___|mother ___|Ben ___/.test(writePrompt)?'be-is':/friends ___|parents ___/.test(writePrompt)?'be-are':tag):tag;return {id,tag:itemTag,art,prompt:kind==='write'?writePrompt:question,answer:kind==='write'?writeAnswer:target,options:kind==='write'?null:choices.slice((i+variant)%3).concat(choices.slice(0,(i+variant)%3)),audio:kind==='listen'?statement:undefined,passage:kind==='read'?statement:undefined,readTitle:'任务卡 '+(i+1),cognitive:kind==='write'?(wp.startsWith('改正')?'纠错':'控制性书写'):(/谁更|哪个.*更|哪.*都|作用/.test(prompt)?'整合推断':'信息理解')};
 }
 // Eight distinct core targets, with separately identified transfer items for targeted support.
 for(const skill of ['listen','read','write']){g[skill]=rs.map((r,i)=>q(r,i,skill));g.support=g.support||{};g.support[skill]=rs.map((r,i)=>{const item=q(r,i,skill,1);item.id=key+'-support-'+skill+'-'+i;item.prompt=skill==='write'?item.prompt:'换一个情境：'+item.prompt;return item;});}
 // Reading is not the listening script: 2 linked stories with eight source-grounded questions below.
 g.readText=g.read.map(x=>x.passage).join('\n');g.readTitle='本单元图文任务卡';
 const stories=storySets(key);for(let i=0;i<8;i++){const item=stories[i];Object.assign(g.read[i],{passage:item[0],prompt:item[1],answer:item[2],options:item[3]});Object.assign(g.support.read[i],{passage:item[0].replace(/Mia/g,'Nora').replace(/Leo/g,'Owen'),prompt:item[1].replace(/Mia/g,'Nora').replace(/Leo/g,'Owen'),answer:item[2].replace(/Mia/g,'Nora').replace(/Leo/g,'Owen'),options:item[3].map(x=>x.replace(/Mia/g,'Nora').replace(/Leo/g,'Owen'))});}
 const readTags={ '3a':['introduce','friend','friend-action','friend','friend-action','thanks','thanks','friend-action'],'3b':['country','country','role','country','role','person','person','role'],'4a':['job','job','can-action','job','can-action','job','together','together'],'4b':['rule-action','rule-action','rule-negative','rule-action','rule-action','rule-negative','rule-action','rule-action'],'5a':['ability','ability','trait','ability','ability','ability','friend-action','ability'],'5b':['rule-work','rule-password','rule-negative','rule-meaning','rule-reason','rule-turn','rule-negative','rule-meaning'],'6a':['past-go','past-take','past-eat','past-go','past-take','past-see','past-was','past-was'],'6b':['compare-height','compare-length','compare-height','compare-height','compare-weight','compare-age','compare-weight','compare-weight'] }[key];
 g.read.forEach((q,i)=>{q.tag=readTags[i];q.options=q.options.slice(i%3).concat(q.options.slice(0,i%3));g.support.read[i].tag=readTags[i];});
 g.support.write.forEach(q=>{if(q.tag==='be-am'){q.prompt='换一个介绍情境：I ___ a student.';q.answer='am';}if(q.tag==='be-is'){q.prompt='换一个介绍情境：Ben ___ my friend.';q.answer='is';}if(q.tag==='be-are'){q.prompt='换一个介绍情境：My friends ___ here.';q.answer='are';}});
 // Transfer tasks change the question direction rather than replaying the missed item.
 for(const skill of ['listen','read'])g.support[skill].forEach((q,i)=>{const claim=i%2?q.options.find(x=>x!==q.answer):q.answer;const truth=claim===q.answer;q.prompt='换个角度判断：对于“'+q.prompt+'”，回答“'+claim+'”是否符合材料？';q.answer=truth?'符合':'不符合';q.options=['符合','不符合'];});
 // A/B use alternate item directions, independent scenarios and context-sensitive reading answers.
 g.examForms=[0,1].map(form=>{
  const ex={audio:[],listen:[],read:[],write:[],text:'',oral:g.speak[0].zh+' '+g.speak[3].zh};
  for(let i=0;i<8;i++){
   const row=rs[(i+(form?3:1))%8],listen=q(row,i,'listen',form+1);listen.id=key+'-exam-'+form+'-l-'+i;listen.prompt='听完整信息，再回答：'+listen.prompt;ex.audio.push(listen.audio);ex.listen.push(listen);
   const source=stories[(i+(form?4:0))%8],names=form?['Dora','Max']:['Eva','Noah'];let passage=source[0].replace(/Mia/g,names[0]).replace(/Leo/g,names[1]),prompt=source[1].replace(/Mia/g,names[0]).replace(/Leo/g,names[1]);
   // Reverse true/false direction between forms where applicable; numeric/detail choices are ordered separately.
   const transform=x=>x.replace(/Mia/g,names[0]).replace(/Leo/g,names[1]);let answer=transform(source[2]),options=source[3].map(transform);options=options.slice((i+form+1)%3).concat(options.slice(0,(i+form+1)%3));
   ex.read.push({id:key+'-exam-'+form+'-r-'+i,tag:readTags[(i+(form?4:0))%8],art:rs[i][1],passage,prompt:'独立阅读：'+prompt,answer,options});
   const w=q(row,i,'write',form+1);w.id=key+'-exam-'+form+'-w-'+i;
   // Require sentence assembly on selected upper-grade items, not eight identical single-word blanks.
   if(grade>=4&&i%4===3){let sentence=row[2].replace(/Amy/g,form?'Rose':'Kate').replace(/Ben/g,form?'Jack':'Sam');w.prompt='连词成句（注意句首与标点，可正常输入）：'+sentence.replace(/[.!?]/g,'').split(' ').reverse().join(' / ');w.answer=sentence;w.cognitive='句子组织';}
   else if(grade===3&&i===7){w.prompt=term==='a'?'独立写出：My name ___ Eva.（填一个词）':'独立写出：I ___ from China.（填一个词）';w.answer=term==='a'?'is':'am';w.tag=term==='a'?'be-is':'be-am';}
   if(form===1){const claim=i%2?listen.options.find(x=>x!==listen.answer):listen.answer;listen.prompt='听录音，判断这条理解是否正确：'+listen.prompt.replace('听完整信息，再回答：','')+' 回答：“'+claim+'”。';listen.answer=i%2?'不符合':'符合';listen.options=['符合','不符合'];
    const rq=ex.read.at(-1),claimR=i%2?rq.options.find(x=>x!==rq.answer):rq.answer;rq.prompt='阅读后判断：“'+rq.prompt.replace('独立阅读：','')+'”的回答是“'+claimR+'”，是否符合材料？';rq.answer=i%2?'不符合':'符合';rq.options=['符合','不符合'];
   }
   ex.write.push(w);
  }
  ex.oral=grade===3?(term==='a'?'请先向新伙伴问好，再介绍你选用的英文昵称。':'请介绍一位虚构伙伴，说明名字和来自哪里。'):grade===4?(term==='a'?'说出两项能做的家务，可以介绍自己或虚构人物。':'为课堂提出两条合适的规则，说明该怎样做。'):grade===5?(term==='a'?'介绍一位虚构朋友的特点和才艺，并说明邀请这位朋友参加哪项活动。':'为计算机房或公共场所提出两条规则，并尝试说明一条规则的作用。'):term==='a'?'讲述一次虚构的过去旅行，包含地点、活动和感受。':'比较虚构物品：Tree A 为3米、Tree B为2米；Bag A为2千克、Bag B为3千克。说清两组比较关系。';
  return ex;
 });g.exam=g.examForms[0];books[key]=g;
}
function storySets(key){
 const data={
 '3a':[['Hi! My name is Mia. Leo is my friend. We help and share.',['这是谁的介绍？','Mia',['Mia','Leo','Ben']],['Mia 的朋友是谁？','Leo',['Leo','Amy','Ben']],['他们会怎样相处？','帮助和分享',['帮助和分享','争抢','不理人']],['哪句话符合这张名片？','Leo 是 Mia 的朋友',['Leo 是 Mia 的朋友','Mia 不认识 Leo','Ben 是 Mia 的朋友']]],['Leo helps Mia. Mia says, "Thank you!" Leo says, "It is OK."',['谁帮助了 Mia？','Leo',['Leo','Mia','Ben']],['Mia 表达了什么？','感谢',['感谢','告别','不满']],['帮助后说哪句话合适？','Thank you!',['Thank you!','Goodbye!','My name is Ben.']],['这段小故事体现什么？','朋友互相帮助',['朋友互相帮助','谁都不愿分享','朋友在告别']]]],
 '3b':[['My name is Mia. I am from China. Leo is from Canada. We are students.',['Mia 来自哪里？','China',['China','Canada','the UK']],['Leo 来自哪里？','Canada',['Canada','the USA','China']],['他们的身份是？','学生',['学生','教师','医生']],['谁来自 Canada？','Leo',['Leo','Mia','老师']]],['Miss White is a teacher. Ben is a boy. Amy is a girl. They are students.',['谁是教师？','Miss White',['Miss White','Ben','Amy']],['Ben 的身份是？','boy',['boy','woman','teacher']],['Amy 的身份是？','girl',['girl','man','teacher']],['哪句话有依据？','Ben 和 Amy 是学生',['Ben 和 Amy 是学生','Ben 是教师','Amy 是教师']]]],
 '4a':[['Mia has a happy family. Her mother is a nurse. Her father is a farmer. Mia can sweep the floor.',['Mia 妈妈是什么职业？','nurse',['nurse','doctor','farmer']],['爸爸是什么职业？','farmer',['farmer','doctor','nurse']],['Mia 能做什么？','扫地',['扫地','弹琴','造机器人']],['医院需要护士，可以邀请谁？','Mia 的妈妈',['Mia 的妈妈','Mia 的爸爸','Mia']]],['Leo can cook. His father is a doctor. They cook together. They help each other.',['谁能做饭？','Leo',['Leo','护士','没有人']],['爸爸是什么职业？','doctor',['doctor','farmer','nurse']],['他们一起做什么？','做饭',['做饭','跳绳','下棋']],['哪条信息有依据？','他们互相帮助',['他们互相帮助','Leo 不能做饭','爸爸是农民']]]],
 '4b':[['Our class rules: Be quiet. Listen to the teacher. Raise your hand. Do not run in the classroom.',['想回答问题时怎么做？','举手',['举手','抢着喊','跑出去']],['老师讲话时怎么做？','认真听',['认真听','吃东西','大喊']],['哪项违反规则？','在教室跑',['在教室跑','安静听讲','举手']],['这张卡适合哪里？','教室',['教室','农场','厨房']]],['Reading time: Keep the classroom clean. Read quietly. Do not eat in class. Mia follows these rules.',['读书时怎么做？','轻声',['轻声','大喊','跑步']],['能在课上吃东西吗？','不能',['不能','可以','没有说']],['谁遵守规则？','Mia',['Mia','Leo','无人']],['哪项行动符合规则？','整理干净教室',['整理干净教室','把零食放桌上吃','大声吵闹']]]],
 '5a':[['Mia is clever and hard-working. She can make a robot. Leo is lovely. He can play the piano.',['谁会制作机器人？','Mia',['Mia','Leo','都不会']],['谁适合钢琴演出？','Leo',['Leo','Mia','无人']],['Mia 有什么特点？','聪明且勤奋',['聪明且勤奋','生气','害怕']],['制作机器人可以邀请谁？','Mia',['Mia','Leo','都不行']]],['Leo can play chess. Mia can jump rope. They are wonderful friends. They help each other.',['谁会下棋？','Leo',['Leo','Mia','无人']],['谁会跳绳？','Mia',['Mia','Leo','都不会']],['他们怎样相处？','互相帮助',['互相帮助','从不说话','互相抢东西']],['哪项活动可以邀请 Mia？','跳绳',['跳绳','弹钢琴','下棋']]]],
 '5b':[['Computer room rules: Talk quietly. No eating or drinking. Save your work. Do not give out your password.',['离开前先做什么？','保存文件',['保存文件','公开密码','吃东西']],['哪项信息不该公开？','密码',['密码','天气','书名']],['什么行为违反规则？','吃东西',['吃东西','保存文件','轻声交谈']],['交谈时应怎样？','轻声',['轻声','大喊','唱歌']]],['In the park, keep off the grass. This rule protects the grass. Wait your turn. Do not touch the painting in the museum.',['公园规则保护什么？','草地',['草地','电脑','钢琴']],['轮到别人时应怎样？','等待',['等待','插队','推人']],['博物馆里不应做什么？','触摸画作',['触摸画作','观看画作','排队']],['哪一组行为都合适？','不踩草地并等待轮次',['不踩草地并等待轮次','踩草地并插队','触画并推挤']]]],
 '6a':[['Last summer, Mia went to a village with Leo. They saw bamboo. Mia took photos. Leo ate pumpkin.',['Mia 去了哪里？','村庄',['村庄','机场','学校']],['谁拍了照片？','Mia',['Mia','Leo','没有人']],['谁吃了南瓜？','Leo',['Leo','Mia','两人都没有']],['什么时候发生的？','去年夏天',['去年夏天','明天','每周']]],['Yesterday, Leo went to a village. He took photos and saw bamboo. The trip was wonderful. His friends were happy.',['哪个动作发生了？','拍照',['拍照','弹琴','跳绳']],['他看见什么？','竹子',['竹子','飞机','钢琴']],['怎样评价旅行？','很棒',['很棒','糟糕','尚未发生']],['哪句话有依据？','朋友们很开心',['朋友们很开心','明天才去','没有拍照']]]],
 '6b':[['Tree A is 3 metres tall. Tree B is 2 metres tall. Ruler A is 20 centimetres long. Ruler B is 10 centimetres long.',['哪棵树更高？','A',['A','B','一样高']],['哪把尺子更长？','A',['A','B','一样长']],['两棵树的高度差是？','1 米',['1 米','2 米','3 米']],['哪句话符合数据？','Tree B is shorter.',['Tree B is shorter.','Tree A is shorter.','Both are 3 metres.']]],['Bag A is 2 kilograms. Bag B is 3 kilograms. Amy is eleven. Ben is twelve.',['哪个书包更重？','B',['B','A','一样重']],['谁年龄更大？','Ben',['Ben','Amy','一样大']],['两个书包的重量差是？','1 千克',['1 千克','2 千克','3 千克']],['哪句话符合数据？','Bag A is lighter.',['Bag A is lighter.','Bag B is lighter.','Both are 3 kilograms.']]]]
 };return data[key].flatMap(([text,...items])=>items.map(([prompt,answer,options])=>[text,prompt,answer,options]));
}
root.UnitContent={version:'PEP-UNIT-BANK-2',skills:C.skills.filter(s=>s.id!=='speak').concat(C.skills.filter(s=>s.id==='speak')),grades:C.grades,books,catalog,get:(grade,term='a')=>books[grade+term]};
})(typeof window==='undefined'?globalThis:window);
