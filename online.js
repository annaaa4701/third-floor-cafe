'use strict';
const config=window.CAFE_CONFIG||{}, configured=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url||'')&&!/YOUR_/.test(config.url+config.key)&&!!config.key;
const api=configured&&window.supabase?window.supabase.createClient(config.url,config.key):null;
let baseline=null, queue=Promise.resolve(), pending=0, failed=false, loading=false, generation=0;
const clone=x=>JSON.parse(JSON.stringify(x)), eq=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
function setSync(s){let e=$('#syncStatus');if(e)e.textContent=s}
function choosePair(){if(!db.admin){pair=W().pairs.findIndex(p=>p.includes(db.session));actor=pair<0?0:P().indexOf(db.session)}else if(!P())pair=W().pairs.length?0:-1;}
function render(){if(!db.session){loginScreen();return}choosePair();if(tab==='admin'&&!db.admin)tab='board';renderOriginal();if(!db.admin){$('#pairs').disabled=true;$('#actor').disabled=true;$('#content').querySelectorAll('[data-p]').forEach(b=>{if(+b.dataset.p!==pair)b.disabled=true});}else{$('#actor').disabled=true;} }
function renderSession(){ $('#session').innerHTML=`<span>● ${db.admin?'MANAGER':'STAFF'} · ${esc(db.session)}</span><br><span id="syncStatus" style="font-size:11px">${failed?'저장 오류':pending?'저장 중…':'공유 연결'}</span><br><button id="sessionbtn">퇴근하기</button> <button id="reloadbtn">새로고침</button>`;$('#sessionbtn').onclick=logout;$('#reloadbtn').onclick=()=>reload(true); }
function loginDemo(){loginScreen()}
function loginScreen(message='',signup=false){
 $('#modal').hidden=true;$('#nav').innerHTML='';$('#side').innerHTML='<div class="notice">알바생 전용 공간입니다.<br>신규 알바생은 회원가입 후 출근하세요.</div>';$('#session').textContent='STAFF ONLY · 미출근';$('#paneltitle').textContent=signup?'STAFF REGISTRATION':'CLOCK IN';
 $('#content').innerHTML=`<div style="max-width:410px;margin:15px auto"><div class="eyebrow">THIRD FLOOR · STAFF ONLY</div><h2>${signup?'신규 알바생 등록':'알바생 출근하기'}</h2>${!api?'<div class="notice">Supabase 설정이 필요합니다.</div>':''}<form id="loginForm"><label for="loginId">알바생 ID</label><input id="loginId" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="${signup?'영문 소문자·숫자·밑줄 3~24자':'아이디 또는 이메일'}" ${signup?'minlength="3" maxlength="24" pattern="[a-z0-9_]{3,24}"':''} required><label for="loginPw">비밀번호</label><input id="loginPw" type="password" autocomplete="${signup?'new-password':'current-password'}" ${signup?'minlength="8" maxlength="72" placeholder="8자 이상 (다른 사이트와 다른 비밀번호)"':''} required>${signup?'<label for="twitterId">트위터 계정</label><input id="twitterId" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="@username" maxlength="16" pattern="@?[A-Za-z0-9_]{1,15}" required><p class="muted">트위터 계정은 운영진의 참여자 확인 목적으로만 사용합니다. 실제 이메일은 수집하지 않으며 비밀번호 분실 시 운영진에게 문의하세요.</p>':''}<button class="primary" style="margin-top:12px;width:100%" ${!api?'disabled':''}>${signup?'알바생 등록하기':'출근하기'}</button></form><p id="loginError" role="alert" style="color:#a94d3e">${esc(message)}</p><button id="switchAuth" type="button" style="width:100%;margin-top:8px">${signup?'이미 등록했나요? 출근하기':'신규 알바생 회원가입'}</button></div>`;
 $('#switchAuth').onclick=()=>loginScreen('',!signup);
 $('#loginForm').onsubmit=async e=>{e.preventDefault();let button=e.target.querySelector('button'),toggle=$('#switchAuth');button.disabled=true;toggle.disabled=true;let id=$('#loginId').value.trim().toLowerCase(),password=$('#loginPw').value;try{
 if(signup){let twitter=$('#twitterId').value.trim().replace(/^@/,'').toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(id)||['owner','admin','manager','root','administrator'].includes(id)||!/^[a-z0-9_]{1,15}$/.test(twitter)||password.length<8||new TextEncoder().encode(password).length>72)throw Error('아이디, 비밀번호, 트위터 계정 형식을 확인하세요. 관리자용 아이디는 사용할 수 없습니다.');
 const {data,error}=await api.auth.signUp({email:id+'@staff.cafe.invalid',password,options:{data:{cafe_signup:'1',twitter}}});if(error)throw error;if(!data.session)throw Error('가입 후 자동 로그인되지 않았습니다. 운영진에게 이메일 확인 설정을 문의하세요.');await reload(false);
 }else{let email=id.includes('@')?id:id+'@staff.cafe.invalid';const {error}=await api.auth.signInWithPassword({email,password});if(error)throw error;await reload(false);}
 }catch(err){const el=$('#loginError');if(el)el.textContent=err.message||'요청 실패';button.disabled=false;toggle.disabled=false;}
 };
}
function take(snapshot,reset=false){db=snapshot;baseline=clone(db);failed=false;if(reset||!db.weeks[week])week=db.admin?(db.weeks[current]?current:Object.keys(db.weeks).sort().at(-1)||current):current;choosePair();}
async function reload(closeModal=false){if(!api||loading)return;loading=true;try{await queue;if(closeModal){run++;openId=null;$('#modal').hidden=true;}const {data,error}=await api.rpc('cafe_snapshot');if(error)throw error;take(data);render();}catch(e){if(db.session){failed=true;setSync('새로고침 실패: '+e.message);alert(e.message);}else loginScreen(e.message);}finally{loading=false;}}
async function logout(){await queue;generation++;await api.auth.signOut({scope:'local'});db={roster:[],profiles:{},messages:[],weeks:{},session:null};baseline=null;week=current;pair=-1;tab='board';staffView=null;run++;openId=null;loginScreen();}
function makeOps(old,next){let ops=[];function add(path,a,b){if(!eq(a,b))ops.push({path,old:a??null,value:b??null})}function keys(a,b){return new Set([...Object.keys(a||{}),...Object.keys(b||{})])}
for(let k of keys(old.profiles,next.profiles))add(['profiles',k],old.profiles[k],next.profiles[k]);
let msg=a=>Object.fromEntries((a||[]).map(x=>[x.id,x])),om=msg(old.messages),nm=msg(next.messages);for(let k of keys(om,nm))add(['messages',k],om[k],nm[k]);
for(let w of keys(old.weeks,next.weeks)){let a=old.weeks[w]||{},b=next.weeks[w]||{};if(next.admin){add(['weeks',w],a.pairs?a:null,b.pairs?b:null);continue}for(let k of keys(a.sub,b.sub))add(['weeks',w,'sub',k],a.sub?.[k],b.sub?.[k]);for(let k of keys(a.games,b.games)){let x=a.games?.[k]||{},y=b.games?.[k]||{};let m=Number(k.split(':')[1]),p=Number(k.split(':')[0]),who=String(b.pairs?.[p]?.indexOf(next.session));if(!['0','1'].includes(who))continue;let f=({1:'records',2:'records',3:'choices',7:'homeRecords',8:'answers',11:'finished',12:'drawings',13:'choices'})[m];if(f){let aa=x[f]?.[who],bb=y[f]?.[who];if(m===12){if(!aa?.length)aa=null;if(!bb?.length)bb=null;}if(m===1||m===2||m===7){if(!aa?.length)aa=null;if(!bb?.length)bb=null;}add(['weeks',w,'games',k,f,who],aa,bb)}}}return ops;}
function save(){if(!baseline||failed||!api){alert('저장 연결을 확인하고 새로고침해 주세요.');return false;}let next=clone(db),ops=makeOps(baseline,next);baseline=next;if(!ops.length)return true;let epoch=generation;pending++;setSync('저장 중…');queue=queue.then(async()=>{if(failed||epoch!==generation)return;let {error}=await api.rpc('cafe_apply',{p_ops:ops});if(error)throw error;}).catch(e=>{failed=true;alert('서버 저장 실패: '+e.message+'\n새로고침하여 실제 저장 상태를 확인하세요.');}).finally(()=>{pending--;setSync(failed?'저장 오류 · 새로고침 필요':pending?'저장 중…':'공유 저장 완료')});return true;}
async function action(name,value,i){if(loading||failed)return;loading=true;let token=run;try{await queue;if(failed)throw Error('저장 오류를 먼저 확인하세요.');let {data,error}=await api.rpc('cafe_action',{p_week:week,p_pair:pair,p_action:name,p_value:value});if(error)throw error;take(data);if(token===run&&openId===i){openNew(i)}else render();}catch(e){alert(e.message);close();loading=false;await reload(false)}finally{loading=false;}}
// Opening a mission always loads latest shared record before playing; never change identity in UI.
const originalOpen=open;open=async function(i){if(!db.session||db.admin){alert('알바생 계정으로 게임을 진행하세요.');return}if(week!==current||W().settled){alert('지난 주 또는 정산된 주차의 미션은 수정할 수 없습니다. 실적 게시판을 확인해 주세요.');return}if(loading||failed||!P())return;loading=true;try{await queue;if(failed)throw Error('저장 오류 · 새로고침 필요');let {data,error}=await api.rpc('cafe_snapshot');if(error)throw error;take(data);if(!P()||W().settled)throw Error('미배정 또는 정산된 근무조');originalOpen(i);}catch(e){alert(e.message)}finally{loading=false; // start server-backed first-open calls after the initial load
 if(openId===i&&P()&&!W().settled){let s=G(i);if(i===14&&!s.guesses)action('safe_init','',i);}}};
// update shared data automatically only when no dialog/input is active.
setInterval(()=>{if(db.session&&!pending&&!failed&&!loading&&openId===null&&$('#modal').hidden&&['board','ranking','roster','archive'].includes(tab))reload(false)},20000);
(async()=>{loginScreen();if(!api)return;try{const {data,error}=await api.auth.getSession();if(error)throw error;if(data.session)await reload(false);}catch(e){loginScreen(e.message)}})();

// Handover: server consumes each attempt before revealing the sentence.
async function handoverRpc(name,value){
 if(loading||failed)throw Error('다른 요청 처리 중이거나 저장 오류가 발생했습니다.');
 loading=true;
 try{await queue;if(failed)throw Error('저장 오류 · 새로고침 필요');
 const {data,error}=await api.rpc('cafe_action',{p_week:week,p_pair:pair,p_action:name,p_value:value});if(error)throw error;
 const {handoverPrompt,handoverAttempt,...snapshot}=data;take(snapshot);return {handoverPrompt,handoverAttempt};
 }finally{loading=false;}
}
function renderHandover(i,s,who,other,show,btn){
 const records=s.handoverRecords||{},mine=records[who]||[],theirs=records[other]||[],won=a=>a.some(r=>r.status==='hit'),completed=won(mine),token=run;
 const valid=()=>token===run&&openId===i;
 show(`<div class="notice">이전 근무조가 남긴 문장을 시작과 동시에 공개합니다. 5초 이내 공백·문장부호까지 정확히 입력하면 자동 제출됩니다. 각자 3회, 두 사람 모두 성공하면 도장을 받습니다. 복사·붙여넣기 금지. 첫 조 또는 이전 조 미작성 시 운영진 기본 문장으로 대체합니다.</div>
 <p>내 도전 <b>${mine.length}/3회</b> · ${completed?'성공!':mine.length>=3?'도전 종료':'도전 가능'} / 동료 ${won(theirs)?'성공!':theirs.length+'/3회'}</p>
 <p class="handover-status">${mine.map((r,j)=>`${j+1}회 ${r.status==='hit'?'성공':'실패 또는 중단'}`).join(' · ')||'아직 기록 없음'}</p>
 ${S(i)?.status==='done'?'<div class="receipt"><b>🎉 도장 획득!</b></div>':''}
 ${!completed&&mine.length<3?'<button id="handoverStart" class="primary">5초 도전 시작</button>':''}
 <div id="handoverPlay"></div><h3>다음 근무조에게 인수인계 남기기</h3>
 ${s.handoverNote?`<div class="handover-prompt">${esc(s.handoverNote)}</div><p class="muted">작성 완료 · 근무조당 한 문장</p>`:`<p class="muted">공백·문장부호 포함 20자 이내. 의미 없는 문자열 및 특수문자 남발 금지. 두 사람 중 한 명만 작성하면 됩니다.</p><label for="handoverNote">인수인계 문장</label><input id="handoverNote" type="text" maxlength="40" autocomplete="off" placeholder="사장님 몰래 케이크 먹었어요."><p id="handoverLength" class="muted">0/20자</p><button id="handoverPost" class="primary">문장 확정</button>`}`);
 const note=$('#handoverNote');if(note)note.oninput=()=>{$('#handoverLength').textContent=[...note.value.normalize('NFC')].length+'/20자'};
 btn('#handoverPost',async()=>{const v=note.value.normalize('NFC').trim();if(!v||[...v].length>20||/[\r\n\t]/.test(v))return alert('공백 포함 1~20자 한 줄 문장을 입력하세요.');if(!confirm('다음 근무조에 문장을 확정할까요?'))return;$('#handoverPost').disabled=true;try{await handoverRpc('handover_note',v);if(valid())openNew(i)}catch(e){alert(e.message);if(valid())openNew(i)}});
 btn('#handoverStart',async()=>{
  $('#handoverStart').disabled=true;const post=$('#handoverPost');if(post)post.disabled=true;
  const play=$('#handoverPlay');play.parentElement.replaceChildren(play);play.innerHTML='<div class="handover-active"><div class="handover-time" id="handoverTime">준비 중</div><div class="handover-prompt" id="handoverPrompt">문장을 불러오는 중…</div><label for="handoverInput">문장을 그대로 입력</label><input id="handoverInput" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" maxlength="40"><button class="primary" id="handoverSubmit" disabled>제출</button></div>';
  const input=$('#handoverInput'),out=$('#handoverTime'),prompt=$('#handoverPrompt'),submit=$('#handoverSubmit');
  // Focus within the tap gesture, so mobile keyboards open before the server responds.
  input.focus({preventScroll:true});play.scrollIntoView({block:'nearest'});
  for(const name of ['paste','drop','copy','cut'])input.addEventListener(name,e=>e.preventDefault());
  input.addEventListener('beforeinput',e=>{if(['insertFromPaste','insertFromDrop','insertReplacementText'].includes(e.inputType))e.preventDefault()});
  prompt.addEventListener('copy',e=>e.preventDefault());
  try{
   const {handoverPrompt:word,handoverAttempt:attempt}=await handoverRpc('handover_start','');
   if(!valid())return;if(typeof word!=='string'||!Number.isInteger(attempt))throw Error('문장 응답 오류');
   input.value='';prompt.textContent=word;const deadline=performance.now()+5000;let ended=false,composing=false,timer;
   submit.disabled=false;
   function finish(success){if(ended)return;ended=true;clearInterval(timer);input.disabled=true;submit.disabled=true;out.textContent=success?'확인 중…':'시간 초과';const text=success?input.value.normalize('NFC'):'';
    handoverRpc('handover_submit',JSON.stringify({attempt,text})).then(()=>{if(valid())openNew(i);else render()}).catch(e=>{alert(e.message);if(valid())openNew(i)});
   }
   function check(){if(ended||!valid())return;if(performance.now()>deadline){finish(false);return}if(!composing&&input.value.normalize('NFC')===word)finish(true);}
   input.addEventListener('compositionstart',()=>composing=true);input.addEventListener('compositionend',()=>{composing=false;check()});input.addEventListener('input',e=>{if(!e.isComposing)check()});
   input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&!composing){e.preventDefault();check()}});submit.onclick=check;
   function tick(){if(!valid()){clearInterval(timer);return}const left=Math.max(0,deadline-performance.now());out.textContent=(left/1000).toFixed(2)+'초';if(left<=0)finish(false)}
   timer=setInterval(tick,35);tick();
  }catch(e){alert(e.message);if(valid())openNew(i)}
 });
}
