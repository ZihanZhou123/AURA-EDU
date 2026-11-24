/* Bounded PEP conversational scaffolds, not a general AI or pronunciation scorer. */
(function(root){'use strict';
const normalize=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/[’]/g,"'").replace(/[.,!?]/g,'').trim().replace(/\s+/g,' ');
function respond({grade,term,index,text,hintLevel=0}){
 const g=root.UnitContent.get(grade,term),item=g.speak[index],t=normalize(text);
 if(!item)throw Error('当前单元没有这个口语任务');
 const response=(status,message,tag='expression',extra={})=>({status,message,tag,scope:g.title,automaticScore:null,policy:'pep-scaffold-1',...extra});
 if(!t)return response('unheard','这次还没有可辨识的文字。可以再说一次，或保留录音请老师听；这不算答错。','recognition');
 if(!/[a-z]/i.test(t))return response('clarify','我还没有听清你的英语表达。你可以先看图片、听一遍问题，再慢慢试一次。','recognition');
 const fix=/\bi (?:is|are)\b/.test(t)?['be-am','我听到了你在介绍自己。先看看主语 I：这里和 am 搭配。你愿意再试一次吗？']:/\b(?:he|she|my name) (?:am|are)\b/.test(t)?['be-is','我明白你在介绍一个人。想一想，he、she 或 my name 后面，可以用哪个 be 动词？']:/\bcan (?:plays|cooks|sweeps|makes|played|making|playing)\b/.test(t)?['can-base','我明白你在说会做的事情。can 后面的动作词用原形。只改这一点，再试着说一次。']:/\bi like play\b/.test(t)?['like-action','我明白你喜欢这项活动。说喜欢做某事，可以试试 like 后面的 playing，或 to play。你再组织一次好吗？']:null;
 if(fix)return response('revise',fix[1],fix[0],{nextHint:Math.max(hintLevel,1)});
 let related=false,complete=false,tag='expression',followup='';
 if(grade===3&&term==='a'){
  if(index===0){related=/\b(?:my name is|i am|i'm)\b/.test(t)||/^[a-z][a-z -]{0,28}$/.test(t);complete=/\b(?:my name is|i am|i'm)\s+[a-z]+/.test(t);tag='introduce';followup='你已经介绍了自己。现在可以对伙伴说一句见面问候吗？';}
  else if(index===1){related=/\b(?:nice|meet|hello|hi)\b/.test(t);complete=/\b(?:nice to meet you(?: too)?|hello|hi)\b/.test(t);tag='greet';followup='问候已经表达出来了。我们可以继续认识一位新伙伴。';}
  else if(index===2){related=/\b(?:this|friend|ben|mia|leo)\b/.test(t);complete=/\b(?:this is|he is|she is|my friend is)\s+\w+/.test(t);tag='friend';followup='你介绍了一位伙伴。可以再向他或她问好吗？';}
  else{related=/\b(?:thank|thanks)\b/.test(t);complete=/\b(?:thank you|thanks)\b/.test(t);tag='thanks';followup='感谢已经表达清楚了。这样的简短回应也可以是完整的交流。';}
 }else if(grade===3){
  if(index===0){related=/\b(?:china|canada|uk|usa|united states|united kingdom|britain)\b/.test(t);complete=/\b(?:i am|i'm) from (?:china|canada|the uk|the usa|the united states|the united kingdom|britain)\b/.test(t);tag='country';followup='你说出了来自哪里。再试着介绍一位本单元的虚构伙伴吧。';}
  else if(index===1){related=/\b(?:teacher|miss|mr|this)\b/.test(t);complete=/\b(?:this is|she is|he is|that's|that is)\b/.test(t)&&/\b(?:teacher|miss|mr)\b/.test(t);tag='role';followup='你介绍了老师。接下来可以介绍一位学生。';}
  else if(index===2){related=/\b(?:yes|student|he)\b/.test(t);complete=/\b(?:yes|he is a student)\b/.test(t);tag='role';followup='Yes 是这个问题可以接受的简短回应，不必硬改成长句。';}
  else{related=/\b(?:china|canada|uk|usa|from|friend)\b/.test(t);complete=/\bfrom\b/.test(t)&&/\b(?:this is|his name is|her name is|my friend|he is|she is)\b/.test(t);tag='country';followup='你把人物和来自哪里连起来说了。老师会再结合录音看看表达是否清楚。';}
 }else if(grade===4&&term==='a'){
  related=/\b(?:sweep|cook|floor|help|clean|look after|together)\b/.test(t);complete=related&&/\b(?:i|we|he|she|they) (?:can|cook|sweep|help|clean)\b/.test(t);tag='can-action';followup='你用学过的动作说明了能做的事。也可以想想和家人一起做什么。';
 }else if((grade===4&&term==='b')||(grade===5&&term==='b')){
  const known=grade===4?/\b(?:quiet|quietly|clean|listen|hand|run|eat|late|read)\b/:/\b(?:quietly|password|save|work|grass|touch|painting|wait|turn|eat|drink)\b/;
  related=known.test(t);complete=related&&/\b(?:please|do not|don't|no |we should|i should|keep|listen|raise|be quiet|save|wait|this rule)\b/.test(t);tag=grade===4?'rule-action':'rule-meaning';followup=grade===4?'你说出了一条课堂规则。可以再想一条不同的规则。':'你提出了规则。它保护了什么，或帮助大家怎样做呢？';
 }else if(grade===5){
  const traits=/\b(?:clever|lovely|young|hard-working|hard working|wonderful)\b/,abilities=/\b(?:piano|robot|chess|jump rope)\b/;
  related=(index===0?traits:index===1?abilities:/\b(?:clever|lovely|young|hard-working|hard working|wonderful|piano|robot|chess|jump rope)\b/).test(t);complete=related&&/\b(?:my friend|he|she|they|i|amy|ben|mia|leo)\b/.test(t)&&/\b(?:is|are|can|choose|like)\b/.test(t);tag=index===0?'trait':'ability';followup=index===0?'你描述了朋友的特点。接下来可以说说他或她会做什么。':'你提到了朋友的才艺。还可以用本单元的特点词介绍这位朋友。';
 }else if(term==='a'){
  related=/\b(?:village|bamboo|pumpkin|photos?|trip|went|saw|ate|took|wonderful|happy)\b/.test(t);complete=related&&/\b(?:i|we|he|she|they|it) (?:went|saw|ate|took|was|were)\b/.test(t);tag='past-go';
  if(related&&/\b(?:i|we|he|she) (?:go|see|eat|take)\b/.test(t))return response('revise','我听懂你在讲旅行。这个任务回忆过去的经历，先选一个动作，想想它的过去式，再试一次。','past-go');
  followup='你用过去的表达讲了旅行。还可以补充一项活动或一种感受。';
 }else{
  related=/\b(?:taller|shorter|longer|heavier|bigger|lighter|older|younger)\b/.test(t);complete=related&&/\b(?:is|are)\b/.test(t)&&/\b(?:tree|bag|ruler)\b/.test(t);tag='compare';followup='你说出了比较关系。再对照任务卡的数据，检查哪一个更高、更长或更重。';
 }
 if(!related)return response('clarify','我还不能确定这句话和当前问题的关系。可以指一指本单元图片，再换个说法；也可以留给老师听。暂不把它判错。',tag);
 if(!complete)return response('expand','我明白你想表达的关键词。'+(hintLevel<1?'先想想在介绍谁、做什么。你愿意把意思再说完整一点吗？':'可以从“'+item.starter+'”开始，再接上你自己的内容。'),tag,{nextHint:Math.min(2,hintLevel+1)});
 return response('understood','我初步理解了这句话。'+followup,tag,{followup,independent:hintLevel===0});
}
function hint(grade,term,index,level){const item=root.UnitContent.get(grade,term).speak[index];return level===1?'先想一想：'+item.zh:level===2?'试着从这里开始：'+item.starter:'这是一个例子，不是唯一答案：'+item.model+' 现在换成你想表达的内容。';}
function analysePCM(samples,sampleRate){if(!samples?.length||!Number.isFinite(sampleRate)||sampleRate<=0)return {signalStatus:'unavailable'};let peak=0,active=0,frames=0;const frame=Math.max(1,Math.round(sampleRate*.02));for(let i=0;i<samples.length;i+=frame){let sum=0,n=0;for(let j=i;j<Math.min(samples.length,i+frame);j++){const v=Number.isFinite(samples[j])?samples[j]:0;peak=Math.max(peak,Math.abs(v));sum+=v*v;n++;}frames++;if(Math.sqrt(sum/n)>.002)active++;}return {signalStatus:peak>.005&&active>=3?'detected':'quiet',peak,activeFrames:active,totalFrames:frames,method:'local-amplitude-check',speechVerified:false};}
root.UnitDialogue={respond,hint,analysePCM};
})(typeof window==='undefined'?globalThis:window);
