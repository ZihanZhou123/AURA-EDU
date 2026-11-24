const vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');
const definition=JSON.parse(fs.readFileSync(__dirname+'/dom-fixture.json','utf8'));
const values=new Map([['aura_learner_profiles_v2',JSON.stringify([{id:'ui-a',name:'学习者A',grade:5},{id:'ui-b',name:'学习者B',grade:5}])],['aura_active_learner_id_v2','ui-a']]);
let failWrite=false;
function app(){
 const ids=new Map(),events={};let document;
 class Element{
 constructor(tag='div',attrs={}){this.tagName=tag.toUpperCase();this.attributes={...attrs};this.children=[];this.parentElement=null;this.hidden='hidden'in attrs;this.disabled='disabled'in attrs;this.style={};this.value='';this.checked=false;this.paused=true;this.listeners={};this.dataset={};for(const[k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5)]=v;this.className=attrs.class||'';if(attrs.id)ids.set(attrs.id,this);this.classList={add:(...x)=>{this.className=[...new Set([...this.className.split(' '),...x])].join(' ')},remove:(...x)=>{this.className=this.className.split(' ').filter(k=>!x.includes(k)).join(' ')},toggle:(x,on)=>{const has=this.className.split(' ').includes(x);const use=on??!has;use?this.classList.add(x):this.classList.remove(x);return use;}};}
 set textContent(v){this.children=[String(v)];}get textContent(){return this.children.map(c=>typeof c==='string'?c:c.textContent).join('');}
 set innerHTML(v){this.html=v;this.children=[];}get innerHTML(){return this.html||'';}
 append(...nodes){for(const n of nodes){if(typeof n==='object')n.parentElement=this;this.children.push(n);}}replaceChildren(...n){this.children=[];this.append(...n);}setAttribute(k,v){this.attributes[k]=String(v);}removeAttribute(k){delete this.attributes[k];}getAttribute(k){return this.attributes[k]??null;}addEventListener(k,f){(this.listeners[k]??=[]).push(f);}pause(){this.paused=true;}play(){this.paused=false;}focus(){document.activeElement=this;}click(){if(this.disabled)return;return this.onclick?.({preventDefault(){}});}querySelectorAll(sel){const out=[];for(const c of this.children)if(typeof c==='object'){if(sel==='button'&&c.tagName==='BUTTON'||sel==='[data-partner]'&&c.dataset.partner)out.push(c);out.push(...c.querySelectorAll(sel));}return out;}
 }
 function build(d){if(typeof d==='string')return d;const e=new Element(d.tag,d.attrs);for(const c of d.children)e.append(build(c));return e;}
 const root=build(definition);document={body:ids.get('fatal').parentElement,activeElement:null,getElementById:id=>{if(!ids.has(id))throw Error('MISSING DOM ID '+id);return ids.get(id)},createElement:tag=>new Element(tag),createTextNode:text=>String(text),querySelectorAll:s=>root.querySelectorAll(s),addEventListener:(k,f)=>{(events['document-'+k]??=[]).push(f)}};
 // Find the real body node (fatal may be a direct child).
 const findBody=n=>n.tagName==='BODY'?n:n.children.filter(x=>typeof x==='object').map(findBody).find(Boolean);document.body=findBody(root);
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(failWrite&&k.startsWith('aura_learning_v5_'))throw Error('test quota');values.set(k,v);}};
 const env={console,document,localStorage:storage,crypto:require('node:crypto').webcrypto,navigator:{locks:{request:async(k,fn)=>fn()}},location:{replace:p=>{env.redirect=p},reload(){}},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},addEventListener:(k,f)=>{(events[k]??=[]).push(f)},Blob,URL};env.window=env;vm.createContext(env);
 for(const f of ['identity','learning-content','learning-engine','learning-storage'])vm.runInContext(fs.readFileSync(__dirname+'/../js/'+f+'.js','utf8'),env);
 let source=fs.readFileSync(__dirname+'/../js/learning-app.js','utf8');const marker='try{profile=currentProfile();';source=source.replace(marker,"window.__ui={get working(){return working},get state(){return state},get panel(){return panel},get busy(){return busy},get blocked(){return blocked}};"+marker);vm.runInContext(source,env);
 return {$:id=>document.getElementById(id),env,events,async click(id){await this.$(id).click();await new Promise(r=>setImmediate(r));},async flush(){await new Promise(r=>setImmediate(r));}};
}
let ui=app(),checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
async function moduleStart(m){if(ui.env.__ui.panel!=='map')await ui.click('resultMap');if(m[0]==='G')await ui.$('grammarLevels').children.find(b=>b.textContent.startsWith(m)).click();else await ui.click(m==='S'?'spellingStart':'speakingStart');await ui.click('begin');}
async function answer(correct=true){const q=ui.env.AuraLearningEngine.item(ui.env.__ui.working);let value=correct?q.answer:q.type==='choice'?q.options.find(x=>x!==q.answer):'wrong';if(q.type==='choice'){await ui.$('options').children.find(b=>b.textContent===value).click();}else if(q.type==='order'){const tokens=value==='wrong'?[...q.options].reverse():q.answer.split(' ');for(const token of tokens){const b=ui.$('options').children.find(b=>b.textContent===token&&!b.disabled);if(!b)throw Error('word missing '+token);await b.click();}}else ui.$('answer').value=value;await ui.click('check');}
(async()=>{
 test('actual map DOM starts G2 locked',()=>assert(ui.$('grammarLevels').children[1].disabled));
 await moduleStart('G1');for(let i=0;i<3;i++){await answer();await ui.click('next');}
 await ui.click('hint');await ui.click('hint');await ui.click('hint');await answer(false);
 const attempts=ui.env.__ui.working.current.attempts.length;
 await ui.click('backMap');test('returning from adaptive practice does not unlock G2',()=>assert(ui.$('grammarLevels').children[1].disabled));
 ui=app();await ui.click('resume');test('refresh resumes H3 and first wrong attempt',()=>{assert.equal(ui.env.__ui.working.hintLevel,3);assert.equal(ui.env.__ui.working.current.attempts.length,attempts);assert.equal(ui.env.__ui.working.current.firstAttemptCorrect,false);assert(ui.$('buddyBubble').textContent.startsWith('H3'));});
 await answer();await ui.click('next');test('next question has fresh hint state and no previous H3',()=>{assert.equal(ui.env.__ui.working.hintLevel,0);assert(!ui.$('buddyBubble').textContent.startsWith('H3'));});
 while(ui.env.__ui.working.phase==='practice'){await answer();await ui.click('next');}
 await ui.click('backMap');ui=app();test('reloaded paused independent test keeps wrong book unavailable',()=>assert(ui.$('wrongBook').disabled));await ui.click('restMap');test('reloaded independent test keeps language activities unavailable',()=>{assert(ui.$('wordGame').disabled);assert(ui.$('animation').disabled);});
 await ui.click('music');const localTrack=ui.$('restContent').children.find(x=>x.tagName==='AUDIO');
 test('pure music is available during independent pause without autoplay',()=>{assert(localTrack);assert.equal(localTrack.src,'audio/rest/gentle-piano.wav');assert(!localTrack.autoplay);assert(localTrack.paused);});
 localTrack.play();await ui.click('quietRest');test('switching rest modes stops local music',()=>{assert(localTrack.paused);assert.equal(localTrack.currentTime,0);});
 await ui.click('music');const leavingTrack=ui.$('restContent').children.find(x=>x.tagName==='AUDIO');leavingTrack.play();await ui.click('restBack');test('returning from rest stops music before answering',()=>assert(leavingTrack.paused));await ui.click('resume');
 await answer(false);ui=app();await ui.click('resume');test('refresh after independent answer cannot retry it',()=>{assert(ui.$('check').hidden);assert(!ui.$('next').hidden);assert.equal(ui.env.__ui.working.current.attempts.length,1);assert.equal(ui.env.__ui.working.current.firstAttemptCorrect,false);});await ui.click('next');
 while(!ui.env.__ui.working.completedAt){await answer();if(ui.env.__ui.working.index===9)failWrite=true;await ui.click('next');}
 test('failed final save offers retry and does not grant a pass',()=>{assert(!ui.$('retrySave').hidden);assert(!ui.env.AuraLearningEngine.eligible(ui.env.__ui.state,'G2'));});failWrite=false;await ui.click('retrySave');await ui.click('resultMap');test('successful full retest save unlocks G2',()=>assert(!ui.$('grammarLevels').children[1].disabled));
 const other=JSON.parse(values.get('aura_learner_profiles_v2'));values.set('aura_active_learner_id_v2','ui-b');for(const fn of ui.events.focus||[])fn();test('identity switch blocks old page',()=>assert(ui.env.__ui.blocked));ui=app();test('second learner inherits no unlock or draft',()=>{assert(ui.$('grammarLevels').children[1].disabled);assert(ui.$('resumeCard').hidden);});
 test('blocked forged summary without evidence does not qualify UI learner',()=>{const d=ui.env.AuraLearningEngine.empty('ui-b');d.sessions.push({id:'fake',learnerId:'ui-b',moduleId:'G1',kind:'assessment',completedAt:new Date().toISOString(),grade:5,courseVersion:ui.env.AuraLearningEngine.VERSION,ruleVersion:ui.env.AuraLearningEngine.RULE,summary:{passed:true,reassessment:100}});assert(!ui.env.AuraLearningEngine.eligible(d,'G2'));});
 
 values.set('aura_active_learner_id_v2','ui-a');ui=app();
 for(const m of ['G2','G3','S','C']){
  await moduleStart(m);
  let count=0;
  while(!ui.env.__ui.working.completedAt){await answer();await ui.click('next');if(++count>30)throw Error('workflow loop');}
  test('full UI workflow completes and saves '+m,()=>{assert(ui.env.__ui.state.sessions.some(s=>s.moduleId===m));assert(ui.env.AuraLearningEngine.result(ui.env.__ui.state,m).passed);});
 }
 await ui.click('resultMap');await ui.click('speakingStart');await ui.click('recordEntry');
 test('real recording screen is separate from content score',()=>{assert.equal(ui.env.__ui.panel,'record');assert(ui.$('recordStatus').textContent.includes('不会自动上传'));});
 await ui.click('recordStart');test('unsupported microphone does not create fake audio or scores',()=>{assert.equal((ui.env.__ui.state.recordings||[]).length,0);assert(!ui.env.__ui.blocked);assert(ui.$('notice').textContent.includes('不支持录音'));});
 
 await ui.click('recordBack');await ui.click('backMap');await ui.click('restMap');await ui.click('animation');
 const cards=ui.$('restContent').children.find(x=>x.className==='media-cards');
 test('animation station links to official released resources, not a fake local video',()=>{assert.equal(cards.children.length,3);const link=cards.children[0].children.find(x=>x.tagName==='A');assert.equal(link.href,'https://www.youtube.com/watch?v=JCjIrEQCzWM');assert.equal(link.target,'_blank');assert(link.rel.includes('noopener'));});
 await ui.click('restBack');
 const soundEvents=[];
 class FakeAudioContext{
  constructor(){this.state='suspended';this.currentTime=8;this.destination={};}
  async resume(){await Promise.resolve();this.state='running';soundEvents.push({kind:'resume'});}
  createOscillator(){const context=this;return {type:'',frequency:{value:0},connect(){},start(t){assert.equal(context.state,'running');soundEvents.push({kind:'start',time:t});},stop(){}};}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(v){soundEvents.push({kind:'gain',value:v});}},connect(){}};}
 }
 ui.env.AudioContext=FakeAudioContext;ui.$('effectsVolume').value=90;await ui.$('effectsVolume').onchange();await ui.click('testSound');
 test('sound preview resumes context and applies persisted adjustable gain',()=>{assert.equal(ui.env.__ui.state.preferences.effectsVolume,90);assert(soundEvents.some(e=>e.kind==='resume'));assert(soundEvents.filter(e=>e.kind==='start').length>=3);assert(soundEvents.some(e=>e.kind==='gain'&&e.value>.15&&e.value<=.22));});
 await moduleStart('G1');const countBefore=soundEvents.filter(e=>e.kind==='start').length;await answer();
 test('independent answer still does not reveal correctness through sound',()=>assert.equal(soundEvents.filter(e=>e.kind==='start').length,countBefore));
 console.log('ALL '+checks+' DOM-SIMULATION TESTS PASSED (not native-browser visual QA)');
})();
