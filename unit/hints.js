/* Hints are bound to the current question and its actual audio, never a decorative picture. */
(function(root){'use strict';
const listenFocus={
 country:['这道题要听来自哪里，先找人物与国家信息。','留意 from 后面的国家词；如果有两个人，先分清是谁在说话。'],
 introduce:['先听这位伙伴怎样介绍名字。','注意 My name is 或 I am 后面的名字；不要把名字和问候词混在一起。'],
 greet:['先判断是在问候、告别，还是感谢。','留意见面时的 Hello、Hi 或 Nice to meet you 这类声音线索。'],
 thanks:['这道题关注交流的意思，先听完整句话。','留意表示感谢的词，再判断它适合什么情境。'],
 letters:['这道题要听字母的顺序。','跟着声音在心里排列字母，特别留意题目问的是哪一个位置。'],
 job:['先听人物和职业分别是什么。','留意人物之后介绍的职业词；不要因为是爸爸或妈妈就猜职业。'],
 'job-sentence':['先听句子在介绍谁。','留意开头表示家人的词；这道题问的是人物，不只是职业名称。'],
 'can-action':['先听这位伙伴能做什么。','注意 can 后面的动作词，听完整个动作短语再选择。'],
 'can-base':['先听伙伴表达的能力或动作。','把 can 后面的动作和题目要求对应，不凭装饰图猜。'],
 together:['先听他们做什么，以及怎样做。','留意表示一起行动的信息，把活动和人物关系分开。'],
 trait:['先听描述人物或动物特点的词。','注意 is 或 are 后面的描述；本题问特点，不一定问活动。'],
 'trait-sentence':['先听这句话怎样评价朋友。','留意描述词，区分积极评价和情绪词。'],
 ability:['先听是谁，再听会做哪项活动。','留意 can 后面的活动短语，把人物和才艺对应。'],
 'friend-action':['先听朋友之间做了什么。','注意帮助、分享等行动，不只听见一个人物名字就作答。'],
 role:['先听介绍的是哪位人物、什么身份。','留意人物名字后面的身份词，区分 teacher 和 student。'],
 person:['先听人物类别或称呼。','留意句子末尾的人物词，听清整个词再选择。'],
 'compare-word':['先判断这个问题在问哪一种信息。','留意 How 后面的关键词，区分身高、重量、年龄等信息。']};
function listening(q,level){
 if(!q?.audio?.trim())return '这道题缺少可核对的录音，请暂停并请老师检查。';
 const tag=String(q.tag||'');
 const topic=tag.startsWith('body-')?'身体部位':tag.startsWith('rule-')?'规则允许或禁止的动作':tag.startsWith('past-')?'过去发生的事':tag.startsWith('compare-')?'两个对象的差别':'题目问到的信息';
 const focus=listenFocus[tag]||['这题要听'+topic+'。','重听时只记和「'+q.prompt+'」有关的词，再判断它对应谁或什么。'];
 return level===1?focus[0]:level===2?focus[1]:'再播放一次。可以先复述你听到的相关部分，再对照题目和选项。';
}
function written(q,level){
 const tag=String(q.tag||'');
 if(q.passage){
  const clue=listenFocus[tag]?.[1]||'圈出题目里的名字、动作或比较对象，再在文段里找同一信息。';
  return level===1?'这题要找「'+q.prompt+'」所问的信息。':level===2?clue:'找出能支持答案的那句话，检查它说的是不是题目中的同一个人或对象。';
 }
 const be=tag.startsWith('be-');
 const clue=be?'先确定主语是 I、一个人还是多个人，再选择对应的 be 动词。':
  tag==='country'?'区分“来自”和国家名称，看空格放的是哪一种信息。':
  tag.startsWith('compare-')?'确认先写哪个对象，再检查比较词和第二个对象的位置。':
  tag.startsWith('past-')?'找句子里的过去时间线索，再检查动作的形式。':
  listenFocus[tag]?.[0]?.replace(/先听/,'先找').replace(/留意/,'检查')||'检查空格前后的词，判断需要补动作、称呼还是连接词。';
 return level===1?'先读整题「'+q.prompt+'」，确定要补哪部分。':level===2?clue:'把你想填的词放回整句读一遍，检查意思和语法，然后提交。';
}
root.UnitHints={listening,written};
})(typeof window==='undefined'?globalThis:window);
