/* Local-only persistence. Teacher demo login is not server authentication. */
(function(){'use strict';
const E=window.AuraLearningEngine,PREFIX='aura_learning_v5_';
function activeId(){return localStorage.getItem('aura_active_learner_id_v2');}
function read(id){const raw=localStorage.getItem(PREFIX+encodeURIComponent(id));return raw?E.validateState(JSON.parse(raw),id):{...E.empty(id),revision:0};}
async function update(id,revision,mutate){const run=()=>{if(activeId()!==id)throw Error('学生身份已变化，请重新进入。');const data=read(id);if((data.revision||0)!==revision)throw Error('另一个标签已更新此学生记录。请刷新后继续，防止覆盖。');mutate(data);data.revision=(data.revision||0)+1;localStorage.setItem(PREFIX+encodeURIComponent(id),JSON.stringify(data));return data;};return navigator.locks? navigator.locks.request(PREFIX+id,run):run();}
function audioDB(){return new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(Error('当前浏览器不支持保存录音。'));const req=indexedDB.open('aura_audio_v5',1);req.onupgradeneeded=()=>req.result.createObjectStore('clips',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function putAudio(clip){const db=await audioDB();return new Promise((resolve,reject)=>{const tx=db.transaction('clips','readwrite');tx.objectStore('clips').put(clip);tx.oncomplete=()=>{db.close();resolve(clip.id);};tx.onerror=()=>{db.close();reject(tx.error);};});}
async function getAudio(id,learnerId){const db=await audioDB();return new Promise((resolve,reject)=>{const req=db.transaction('clips').objectStore('clips').get(id);req.onsuccess=()=>{const c=req.result;db.close();resolve(c?.learnerId===learnerId?c:null);};req.onerror=()=>{db.close();reject(req.error);};});}
window.AuraLearningStore=Object.freeze({PREFIX,activeId,read,update,putAudio,getAudio});
})();
