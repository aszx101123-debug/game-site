(() => {
'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height,GROUND=470,SAVE_KEY='mapleAdventureSave_v1';
let WORLD=3800,regionIndex=0,unlockedRegions=1,regionKills=0,job=null,scene='town',questAccepted=false,questClaimed=false,skillCooldowns={2:0,3:0,4:0};
const regionDefs=[
{name:'초록숲',zone:'GREEN FOREST',enemyName:'초록 슬라임',enemyHp:48,enemyExp:22,enemyMeso:16,bossName:'숲의 버섯왕',bossHp:420,enemyColor:'#65d889',skyTop:'#80c9ef',skyBottom:'#f2f4d8'},
{name:'버섯 언덕',zone:'MUSHROOM HILLS',enemyName:'주황 버섯',enemyHp:92,enemyExp:42,enemyMeso:28,bossName:'거대 버섯 군주',bossHp:820,enemyColor:'#f3a45e',skyTop:'#f3b98e',skyBottom:'#f8e7c2'},
{name:'얼음 동굴',zone:'FROZEN CAVE',enemyName:'얼음 정령',enemyHp:155,enemyExp:78,enemyMeso:46,bossName:'서리 골렘',bossHp:1450,enemyColor:'#78d7ed',skyTop:'#739bbd',skyBottom:'#d8f3f5'}
];
ctx.imageSmoothingEnabled=false;
const $=id=>document.getElementById(id);
const ui={level:$('levelText'),stat:$('statText'),hpFill:$('hpFill'),hp:$('hpText'),expFill:$('expFill'),exp:$('expText'),meso:$('mesoText'),sideMeso:$('sideMeso'),potions:$('potionCount'),kills:$('killCount'),quest:$('questProgressFill'),toast:$('toast'),start:$('startOverlay'),over:$('gameOverOverlay'),inventory:$('inventoryModal'),inventoryContents:$('inventoryContents'),shop:$('shopModal'),shopMeso:$('shopMeso'),smith:$('smithModal'),questBoard:$('questBoardModal')};
const down=new Set(),pressed=new Set();
const camera={x:0,shake:0};
let platforms=[{x:0,y:GROUND,w:WORLD,h:100},{x:330,y:385,w:190,h:18},{x:690,y:320,w:175,h:18},{x:1060,y:390,w:210,h:18},{x:1460,y:335,w:190,h:18},{x:1880,y:390,w:190,h:18},{x:2280,y:315,w:200,h:18},{x:2740,y:380,w:210,h:18},{x:3190,y:335,w:210,h:18}];
const player={x:120,y:GROUND-58,w:34,h:58,job:'',skillReach:50,skillPower:1,skillWide:false,weaponName:'초보자의 검',armorName:'가죽 조끼',weaponBonus:0,armorBonus:0,vx:0,vy:0,speed:3.65,jump:12.2,grounded:false,face:1,hp:120,maxHp:120,level:1,exp:0,nextExp:100,attack:18,defense:4,meso:0,potions:3,inv:0,attackTime:0,attackCd:0,hit:new Set(),kills:0,spawnX:120,spawnY:GROUND-58,dead:false};
function slime(x,patrol){return{x:x,y:GROUND-30,w:42,h:30,hp:48,maxHp:48,alive:true,speed:1.0,face:Math.random()<.5?-1:1,start:x,patrol:patrol,flash:0,cd:0,bob:Math.random()*6,exp:22,meso:12+Math.floor(Math.random()*16)}}
let slimes=[slime(560,90),slime(900,105),slime(1360,120),slime(1840,100),slime(2380,120),slime(2850,110)];
let npc={x:1120,y:GROUND-62,w:32,h:62};
const townNpcs=[{id:'guide',x:180,name:'안내원 리아',kind:'guide'},{id:'merchant',x:440,name:'잡화상 미나',kind:'merchant'},{id:'smith',x:850,name:'대장장이 토르',kind:'smith'},{id:'guild',x:1280,name:'모험가 길드장',kind:'guild'},{id:'inn',x:1600,name:'여관 주인',kind:'inn'}];
let boss={x:3370,y:GROUND-86,w:62,h:86,hp:420,maxHp:420,alive:true,face:-1,speed:1.05,cd:0,flash:0};
let drops=[],particles=[],texts=[],projectiles=[],started=false,paused=false,last=0,saveTimer=0,toastTimer=0,kills=0,sound=true,audio=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function tone(freq,dur,type,vol){if(!sound)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type||'sine';o.frequency.value=freq||440;g.gain.setValueAtTime(vol||.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+(dur||.08));o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+(dur||.08))}catch(e){}}
function toast(s){ui.toast.textContent=s;ui.toast.classList.add('show');toastTimer=1100}
function save(show){try{localStorage.setItem(SAVE_KEY,JSON.stringify({x:player.x,y:player.y,hp:player.hp,level:player.level,exp:player.exp,nextExp:player.nextExp,attack:player.attack,defense:player.defense,meso:player.meso,potions:player.potions,kills:kills,regionIndex:regionIndex,unlockedRegions:unlockedRegions,regionKills:regionKills,job:job,scene:scene,questAccepted:questAccepted,questClaimed:questClaimed,maxHp:player.maxHp,weaponName:player.weaponName,armorName:player.armorName,weaponBonus:player.weaponBonus,armorBonus:player.armorBonus,bossHp:boss.hp,bossAlive:boss.alive}));if(show!==false)toast('모험 데이터를 저장했습니다.')}catch(e){toast('저장에 실패했습니다.')}updateUI()}
function load(){
 try{
  const d=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(!d)return false;
  regionIndex=clamp(Number.isInteger(d.regionIndex)?d.regionIndex:0,0,regionDefs.length-1);
  unlockedRegions=clamp(+d.unlockedRegions||1,1,regionDefs.length);
  job=d.job||null;player.job=job||'';
  player.level=Math.max(1,+d.level||1);player.exp=Math.max(0,+d.exp||0);player.nextExp=Math.max(100,+d.nextExp||100);
  const bases={warrior:{hp:160,speed:3.5},mage:{hp:112,speed:3.55},archer:{hp:132,speed:4.05}};
  const base=job&&bases[job]?bases[job]:{hp:120,speed:3.65};
  player.maxHp=Math.max(1,+d.maxHp||base.hp+(player.level-1)*18);
  player.hp=clamp(+d.hp||player.maxHp,1,player.maxHp);player.speed=base.speed;
  player.attack=Math.max(18,+d.attack||18);player.defense=Math.max(0,+d.defense||4);player.weaponName=d.weaponName||'초보자의 검';player.armorName=d.armorName||'가죽 조끼';player.weaponBonus=Math.max(0,+d.weaponBonus||0);player.armorBonus=Math.max(0,+d.armorBonus||0);
  player.meso=Math.max(0,+d.meso||0);player.potions=Math.max(0,+d.potions||0);kills=Math.max(0,+d.kills||0);
  const savedRegionKills=Math.max(0,+d.regionKills||0),savedQuestClaimed=!!d.questClaimed,savedQuestAccepted=!!d.questAccepted;
  scene=d.scene==='town'?'town':'field';if(scene==='field')loadRegion(regionIndex,false);else loadTown(false);regionKills=savedRegionKills;questClaimed=savedQuestClaimed;questAccepted=savedQuestAccepted;
  if(typeof d.bossHp==='number')boss.hp=clamp(d.bossHp,0,boss.maxHp);if(d.bossAlive===false)boss.alive=false;
  player.x=clamp(Number.isFinite(+d.x)?+d.x:120,0,WORLD-player.w);
  player.y=clamp(Number.isFinite(+d.y)?+d.y:GROUND-player.h,0,GROUND-player.h);
  player.spawnX=player.x;player.spawnY=player.y;updateUI();return true;
 }catch(e){return false}
}
function updateUI(){ui.level.textContent='Lv. '+player.level+' '+(job?jobDefs[job].name:'모험가');ui.stat.textContent='ATK '+player.attack+' · DEF '+player.defense;ui.hpFill.style.width=(100*player.hp/player.maxHp)+'%';ui.hp.textContent=Math.ceil(player.hp)+' / '+player.maxHp;ui.expFill.style.width=clamp(100*player.exp/player.nextExp,0,100)+'%';ui.exp.textContent=player.exp+' / '+player.nextExp;ui.meso.textContent=player.meso.toLocaleString('ko-KR');ui.sideMeso.textContent=player.meso.toLocaleString('ko-KR');ui.potions.textContent=player.potions+'개';ui.kills.textContent=regionKills;ui.quest.style.width=Math.min(100,regionKills/5*100)+'%';const r=regionDefs[regionIndex];const mapName=$('mapName');if(mapName)mapName.textContent=scene==='town'?'모험가 마을':r.name;const jobName=$('jobName');if(jobName)jobName.textContent=job?jobDefs[job].name:'직업 미선택';const qTitle=document.querySelector('.quest-card h3');if(qTitle)qTitle.textContent=scene==='town'?'모험가 길드 의뢰':r.name+' 의뢰: 몬스터 사냥';const qDesc=document.querySelector('.quest-card>p:not(.card-label)');if(qDesc)qDesc.textContent=scene==='town'?'길드 게시판에서 현재 지역의 토벌 의뢰를 수락하세요.':(questAccepted?r.enemyName+'을(를) 5마리 처치하세요.':'마을 길드에서 사냥 의뢰를 받아오세요.');const qReward=$('questReward');if(qReward)qReward.textContent=questClaimed?'완료 보상 수령':(questAccepted?'진행 '+regionKills+'/5 · 보상 '+(60*(regionIndex+1))+' EXP':'의뢰 미수락');const guildQuestName=$('guildQuestName');if(guildQuestName)guildQuestName.textContent=regionDefs[regionIndex].name+' 토벌 의뢰';const guildQuestText=$('guildQuestText');if(guildQuestText)guildQuestText.textContent=regionDefs[regionIndex].enemyName+' 5마리를 처치하면 '+(60*(regionIndex+1))+' EXP와 '+(120*(regionIndex+1))+' 메소를 받습니다.';const acceptQuestBtn=$('acceptQuestBtn');if(acceptQuestBtn)acceptQuestBtn.textContent=questAccepted&&!questClaimed?'의뢰 진행 중':questClaimed?'완료된 의뢰':'의뢰 수락하기';const bar=$('skillBar');if(bar&&job){bar.querySelectorAll('[data-skill]').forEach(btn=>{const n=Number(btn.dataset.skill),s=jobDefs[job].skills[n];const cd=skillCooldowns[n]||0;btn.innerHTML='<small>'+n+'</small><b>'+s.name+'</b><em>'+(cd>0?cd.toFixed(1)+'s':'준비')+'</em>';btn.disabled=cd>0})}ui.shopMeso.textContent=player.meso.toLocaleString('ko-KR');if(!ui.inventory.classList.contains('hidden'))renderInventory()}
function renderInventory(){ui.inventoryContents.innerHTML='<div class="inventory-entry"><span>🧪 빨간 포션 · HP 45 회복</span><b>'+player.potions+'개</b></div><div class="inventory-entry"><span>🪙 메소</span><b>'+player.meso.toLocaleString('ko-KR')+'</b></div><div class="inventory-entry"><span>⚔️ '+player.weaponName+'</span><b>ATK +'+player.weaponBonus+'</b></div><div class="inventory-entry"><span>🛡️ '+player.armorName+'</span><b>DEF +'+player.armorBonus+'</b></div>'}
function text(x,y,s,color,big){texts.push({x:x,y:y,s:String(s),color:color||'#fff1a4',life:48,big:!!big})}
function burst(x,y,color,n){for(let i=0;i<(n||8);i++){const a=Math.random()*Math.PI*2,v=1+Math.random()*3;particles.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1,life:25,color:color||'#fff',size:2+Math.random()*3})}}
function drop(type,x,y,value){drops.push({type:type,x:x,y:y,value:value,vx:(Math.random()-.5)*3,vy:-5,life:1500,bob:Math.random()*6})}
function addExp(n){player.exp+=n;text(player.x,player.y-16,'+'+n+' EXP','#93e7ff',true);while(player.exp>=player.nextExp){player.exp-=player.nextExp;player.level++;player.nextExp=Math.floor(player.nextExp*1.32);player.maxHp+=18;player.hp=player.maxHp;player.attack+=3;player.defense++;burst(player.x+17,player.y+25,'#ffe18a',22);text(player.x+17,player.y-50,'LEVEL UP! Lv.'+player.level,'#ffe18a',true);tone(720,.18,'triangle',.06);toast('레벨 업! Lv.'+player.level)}updateUI()}
function hurt(n,source){if(player.inv>0||player.dead)return;const d=Math.max(1,n-player.defense*.25);player.hp=Math.max(0,player.hp-d);player.inv=75;player.vx=player.x+player.w/2<source?-5.5:5.5;player.vy=-4.5;text(player.x+17,player.y-8,'-'+Math.ceil(d),'#ff8989',true);burst(player.x+17,player.y+25,'#ff7777',7);tone(150,.12,'sawtooth',.035);updateUI();if(player.hp<=0){player.dead=true;paused=true;ui.over.classList.remove('hidden');save(false)}}
function potion(){if(player.potions<=0){toast('포션이 없습니다. 상점에서 구매하세요.');return}if(player.hp>=player.maxHp){toast('HP가 가득 찼습니다.');return}player.potions--;const h=Math.min(45,player.maxHp-player.hp);player.hp+=h;text(player.x+17,player.y-18,'+'+h+' HP','#98efb4',true);burst(player.x+17,player.y+25,'#8debb0',8);tone(520,.09,'sine',.04);updateUI();save(false)}
function attack(){if(player.attackCd>0||paused||player.dead)return;player.attackTime=13;player.attackCd=25;player.hit.clear();tone(270,.07,'sawtooth',.025)}
function hit(t,isBoss){if(!t.alive||player.hit.has(t))return;const reach=player.skillReach||50;if(scene!=='field')return;const b={x:player.face>0?player.x+player.w-1:player.x-reach,y:player.y+(player.skillWide?-20:8),w:reach,h:player.skillWide?90:42};if(!overlap(b,t))return;player.hit.add(t);const crit=Math.random()<.12,dmg=Math.floor(player.attack*(player.skillPower||1)*(crit?1.8:1));t.hp=Math.max(0,t.hp-dmg);t.flash=12;t.x+=player.face*(isBoss?13:10);text(t.x+t.w/2,t.y-8,crit?'CRIT '+dmg:dmg,crit?'#ffe27a':'#fff',crit);burst(t.x+t.w/2,t.y+t.h/2,crit?'#ffe27a':'#dff7ff',9);tone(crit?610:390,.07,'square',.025);if(t.hp<=0){t.alive=false;if(!isBoss)t.respawnTimer=720;if(isBoss){addExp(240);player.meso+=500;drop('meso',t.x+30,t.y,500);drop('exp',t.x+48,t.y-4,120);drop('potion',t.x+10,t.y,1);drop('weapon',t.x+18,t.y-12,4+regionIndex*3);drop('armor',t.x+42,t.y-12,2+regionIndex*2);text(t.x+30,t.y-60,'BOSS DEFEATED!','#ffe27a',true);burst(t.x+30,t.y+40,'#d5a0ff',35);toast(regionDefs[regionIndex].bossName+'을(를) 쓰러뜨렸습니다!')}else{kills++;if(questAccepted&&!questClaimed)regionKills++;drop('meso',t.x+20,t.y,t.meso);drop('exp',t.x+35,t.y-4,t.exp);if(Math.random()<.24)drop('potion',t.x+10,t.y,1);if(Math.random()<.1)drop(Math.random()<.55?'weapon':'armor',t.x+25,t.y-8,1+regionIndex);burst(t.x+20,t.y+15,'#84e5a3',15);if(regionKills>=5&&!questClaimed&&questAccepted){questClaimed=true;const rewardExp=60*(regionIndex+1),rewardMeso=120*(regionIndex+1);addExp(rewardExp);player.meso+=rewardMeso;updateUI();toast('지역 의뢰 완료! '+rewardExp+' EXP와 '+rewardMeso+' 메소 획득');save(false)}}updateUI();save(false)}}
function smithCosts(){return{weapon:90+player.weaponBonus*34,armor:80+player.armorBonus*42}}
function updateSmithUI(){
 const cost=smithCosts();const w=$('weaponUpgradeCost'),a=$('armorUpgradeCost');
 if(w)w.textContent=cost.weapon.toLocaleString('ko-KR')+' 메소';
 if(a)a.textContent=cost.armor.toLocaleString('ko-KR')+' 메소';
 const bal=$('smithBalance');if(bal)bal.textContent=player.meso.toLocaleString('ko-KR');
}
function buySmithUpgrade(kind){
 const cost=smithCosts()[kind];if(player.meso<cost){toast('메소가 부족합니다. 몬스터를 사냥해 보세요.');return}
 player.meso-=cost;
 if(kind==='weapon'){player.weaponBonus+=5;player.attack+=5;player.weaponName=['숲의 수련검','버섯 군주의 대검','빙결 수정검'][Math.min(regionIndex,2)]+' +'+Math.ceil(player.weaponBonus/5);toast('무기를 강화했습니다! 공격력 +5')}
 else{player.armorBonus+=2;player.defense+=2;player.armorName=['숲 수호자 갑옷','버섯 가죽 갑옷','서리 판금 갑옷'][Math.min(regionIndex,2)]+' +'+Math.ceil(player.armorBonus/2);toast('방어구를 강화했습니다! 방어력 +2')}
 updateUI();updateSmithUI();save(false);tone(620,.12,'triangle',.04);
}
function acceptTownQuest(){
 if(questAccepted&&!questClaimed){toast('이미 의뢰를 진행하고 있습니다.');closeAll();return}
 questAccepted=true;questClaimed=false;regionKills=0;closeAll();updateUI();save(false);
 toast(regionDefs[regionIndex].name+' 토벌 의뢰를 수락했습니다!');
}
function interact(){
 if(scene==='town'){
  const near=townNpcs.map(n=>({n,d:Math.abs(player.x-n.x)})).filter(v=>v.d<105).sort((a,b)=>a.d-b.d)[0];
  if(near){const n=near.n;
   if(n.kind==='merchant'){open(ui.shop);toast('잡화상 미나: 필요한 물품을 골라보세요.');return}
   if(n.kind==='smith'){open(ui.smith);updateSmithUI();return}
   if(n.kind==='guild'){open(ui.questBoard);updateUI();return}
   if(n.kind==='inn'){player.hp=player.maxHp;player.potions=Math.max(player.potions,1);updateUI();save(false);toast('여관에서 쉬었습니다. HP가 모두 회복됐습니다.');return}
   toast('리아: 오른쪽 끝 포털을 통해 초록숲으로 갈 수 있어요.');return
  }
  if(player.x>WORLD-210){loadRegion(regionIndex,false);toast(regionDefs[regionIndex].name+' 사냥터에 입장했습니다.');return}
  toast('가까이 있는 NPC에게 E 키로 말을 걸어보세요.');return
 }
 if(player.x<205){loadTown(true);return}
 toast('왼쪽 입구 포털 근처에서 E 키를 누르면 마을로 돌아갑니다.')
}
function open(m){[ui.inventory,ui.shop,ui.smith,ui.questBoard].filter(Boolean).forEach(v=>v.classList.add('hidden'));m.classList.remove('hidden');paused=true;if(m===ui.inventory)renderInventory()}
function updatePlayer(dt){const f=dt*60;for(const k of [2,3,4])skillCooldowns[k]=Math.max(0,(skillCooldowns[k]||0)-dt);if(player.inv>0)player.inv-=f;if(player.attackCd>0)player.attackCd-=f;if(player.attackTime>0){player.attackTime-=f;if(player.attackTime<8){slimes.forEach(s=>hit(s,false));hit(boss,true)}if(player.attackTime<=0){player.skillReach=50;player.skillPower=1;player.skillWide=false}}const sb=$('skillBar');if(sb&&job)sb.querySelectorAll('[data-skill]').forEach(btn=>{const n=Number(btn.dataset.skill),sk=jobDefs[job].skills[n],cd=skillCooldowns[n]||0;btn.disabled=cd>0;btn.querySelector('em').textContent=cd>0?cd.toFixed(1)+'s':'준비'});const l=down.has('ArrowLeft')||down.has('KeyA'),r=down.has('ArrowRight')||down.has('KeyD');player.vx=l===r?0:(r?player.speed:-player.speed);if(player.vx)player.face=Math.sign(player.vx);if((pressed.has('Space')||pressed.has('ArrowUp')||pressed.has('KeyW'))&&player.grounded){player.vy=-player.jump;player.grounded=false;tone(360,.08,'triangle',.025)}if(pressed.has('KeyJ')||pressed.has('ShiftLeft')||pressed.has('ShiftRight'))attack();if(pressed.has('Digit1'))potion();if(pressed.has('Digit2'))useSkill(2);if(pressed.has('Digit3'))useSkill(3);if(pressed.has('Digit4'))useSkill(4);if(pressed.has('KeyI'))toggle(ui.inventory);if(pressed.has('KeyE'))interact();if(pressed.has('KeyS'))save(true);player.vy=Math.min(13,player.vy+.58*f);player.x=clamp(player.x+player.vx*f,0,WORLD-player.w);if(scene==='town'&&player.x>WORLD-145){player.x=WORLD-150;if(Math.random()<.025)toast('E 키를 눌러 초록숲 사냥터로 입장하세요.')}else if(scene==='field'&&player.x>WORLD-145){if(boss.alive){player.x=WORLD-160;if(Math.random()<.025)toast('보스 처치 후 다음 지역이 열립니다.')}else{usePortal();return}}const py=player.y;player.y+=player.vy*f;player.grounded=false;for(const p of platforms){const h=player.x+player.w>p.x&&player.x<p.x+p.w;if(h&&py+player.h<=p.y+4&&player.y+player.h>=p.y&&player.vy>=0){player.y=p.y-player.h;player.vy=0;player.grounded=true}else if(h&&py>=p.y+p.h&&player.y<p.y+p.h&&player.vy<0){player.y=p.y+p.h;player.vy=1}}if(player.y>H+100)hurt(9999,player.x)}
function updateSlimes(dt){const f=dt*60;for(const s of slimes){if(!s.alive){s.respawnTimer=(s.respawnTimer||720)-f;if(s.respawnTimer<=0){s.alive=true;s.hp=s.maxHp;s.x=s.start;s.flash=0;s.cd=0;burst(s.x+s.w/2,s.y,'#d9ffe2',8)}continue}if(s.flash>0)s.flash-=f;if(s.cd>0)s.cd-=f;s.bob+=.08*f;const dx=player.x+17-(s.x+21),dist=Math.abs(dx);if(dist<220&&Math.abs(player.y-s.y)<95){s.face=dx>=0?1:-1;s.x+=s.face*s.speed*1.12*f}else{s.x+=s.face*s.speed*f;if(s.x<s.start-s.patrol)s.face=1;if(s.x>s.start+s.patrol)s.face=-1}s.x=clamp(s.x,0,WORLD-s.w);if(overlap(player,s)&&s.cd<=0){hurt(8,s.x+21);s.cd=70}}}
function updateBoss(dt){if(!boss.alive)return;const f=dt*60;if(boss.flash>0)boss.flash-=f;if(boss.cd>0)boss.cd-=f;const dx=player.x-boss.x;if(Math.abs(dx)<520){boss.face=dx>=0?1:-1;if(Math.abs(dx)>70)boss.x+=boss.face*boss.speed*f*(boss.hp<150?1.55:1);if(overlap(player,boss)&&boss.cd<=0){hurt(17,boss.x+31);boss.cd=85;camera.shake=8}}boss.x=clamp(boss.x,3150,3650)}
function updateDrops(dt){const f=dt*60;for(const d of drops){d.life-=f;d.bob+=.11*f;d.vy=Math.min(9,d.vy+.36*f);d.x+=d.vx*f;d.y+=d.vy*f;if(d.y+16>GROUND){d.y=GROUND-16;d.vy*=-.25;d.vx*=.75;if(Math.abs(d.vy)<.7)d.vy=0}const dx=player.x+17-d.x,dy=player.y+29-d.y,dist=Math.hypot(dx,dy);if(dist<155){d.x+=dx/Math.max(1,dist)*3.7*f;d.y+=dy/Math.max(1,dist)*3.7*f}if(dist<28){d.collected=true;if(d.type==='meso'){player.meso+=d.value;text(player.x,player.y-20,'+'+d.value+' 메소','#ffe18a');tone(800,.06,'triangle',.03)}if(d.type==='exp')addExp(d.value);if(d.type==='potion'){player.potions++;text(player.x,player.y-22,'+ 포션','#ffb3bd');tone(560,.08,'sine',.03)}if(d.type==='weapon'){player.attack+=d.value;player.weaponBonus+=d.value;player.weaponName=['숲의 수련검','버섯 군주의 대검','빙결 수정검'][regionIndex];text(player.x,player.y-22,'장비 강화! ATK +'+d.value,'#ffe18a',true);tone(680,.12,'triangle',.04)}if(d.type==='armor'){player.defense+=d.value;player.armorBonus+=d.value;player.armorName=['숲 수호자 갑옷','버섯 가죽 갑옷','서리 판금 갑옷'][regionIndex];text(player.x,player.y-22,'장비 획득! DEF +'+d.value,'#a9dbff',true);tone(480,.12,'triangle',.04)}updateUI()}}drops=drops.filter(d=>!d.collected&&d.life>0)}
function updateEffects(dt){const f=dt*60;particles.forEach(p=>{p.x+=p.vx*f;p.y+=p.vy*f;p.vy+=.12*f;p.life-=f});particles=particles.filter(p=>p.life>0);texts.forEach(t=>{t.y-=.8*f;t.life-=f});texts=texts.filter(t=>t.life>0);toastTimer-=dt*1000;if(toastTimer<=0)ui.toast.classList.remove('show');camera.shake*=Math.pow(.84,f)}
function updateCamera(dt){const target=clamp(player.x+17-W*.43,0,WORLD-W);camera.x+=(target-camera.x)*Math.min(1,dt*7)}
function update(dt){if(!started||paused||player.dead)return;updatePlayer(dt);if(scene==='field'){updateSlimes(dt);updateBoss(dt)}updateDrops(dt);updateEffects(dt);updateCamera(dt);saveTimer+=dt;if(saveTimer>=8){save(false);saveTimer=0}}
function background(){const theme=regionDefs[regionIndex];const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,theme.skyTop);g.addColorStop(.62,'#d4f0ed');g.addColorStop(1,theme.skyBottom);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);for(let i=0;i<9;i++){const x=((i*185-camera.x*.18)%(W+220)+W+220)%(W+220)-100,y=55+(i%3)*43;ctx.fillStyle='rgba(255,255,255,.68)';ctx.beginPath();ctx.ellipse(x,y,35,13,0,0,Math.PI*2);ctx.ellipse(x+25,y-5,25,15,0,0,Math.PI*2);ctx.ellipse(x+48,y,27,11,0,0,Math.PI*2);ctx.fill()}for(let k=0;k<3;k++){ctx.fillStyle=['#a4d6a9','#79bb83','#4f986e'][k];ctx.beginPath();ctx.moveTo(0,H);for(let x=-100;x<W+120;x+=80){const wx=x+((-camera.x*(.28+k*.14))%160),y=335+k*45-55*Math.sin((x+k*42)*.009)-18*Math.cos(x*.021+k);ctx.lineTo(wx,y)}ctx.lineTo(W,H);ctx.closePath();ctx.fill()}for(let i=0;i<26;i++){const x=i*62-camera.x*.58%62,y=370+(i%4)*13;ctx.fillStyle=i%2?'#387b61':'#438b67';ctx.fillRect(x+15,y,8,85);ctx.beginPath();ctx.arc(x+19,y-5,27+(i%3)*4,0,Math.PI*2);ctx.fill()}}
function tree(x,sc){const sx=x-camera.x;if(sx< -110||sx>W+110)return;ctx.save();ctx.translate(sx,GROUND);ctx.scale(sc,sc);ctx.fillStyle='#6c4b35';ctx.fillRect(-9,-95,18,95);ctx.fillStyle='#2d7955';ctx.beginPath();ctx.arc(0,-116,42,0,Math.PI*2);ctx.arc(-23,-96,28,0,Math.PI*2);ctx.arc(24,-95,30,0,Math.PI*2);ctx.fill();ctx.fillStyle='#4da46c';ctx.beginPath();ctx.arc(-12,-130,21,0,Math.PI*2);ctx.arc(18,-111,20,0,Math.PI*2);ctx.fill();ctx.restore()}
function ground(){ctx.fillStyle='#93663f';ctx.fillRect(-camera.x,GROUND,WORLD,H-GROUND);ctx.fillStyle='#5eb56d';ctx.fillRect(-camera.x,GROUND,WORLD,13);for(let x=0;x<WORLD;x+=34){ctx.fillStyle='#a1df83';ctx.fillRect(x-camera.x,GROUND+7+(x%3),15,3)}for(const p of platforms.slice(1)){const sx=p.x-camera.x;if(sx+p.w< -50||sx>W+50)continue;ctx.fillStyle='#8b613d';ctx.fillRect(sx,p.y,p.w,p.h+5);ctx.fillStyle='#61b96c';ctx.fillRect(sx,p.y,p.w,7);ctx.fillStyle='#b2e58c';ctx.fillRect(sx+5,p.y+7,p.w-10,2)}}
function drawPlayer(){const x=player.x-camera.x,y=player.y;if(player.inv>0&&Math.floor(player.inv/5)%2===0)ctx.globalAlpha=.42;ctx.fillStyle='rgba(24,54,48,.22)';ctx.beginPath();ctx.ellipse(x+17,y+60,19,5,0,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(x+17,y);ctx.scale(player.face,1);ctx.fillStyle='#4b3e50';ctx.fillRect(-13,47,11,10);ctx.fillRect(3,47,11,10);ctx.fillStyle='#e9f1f4';ctx.fillRect(-13,23,26,26);ctx.fillStyle='#3e84a8';ctx.fillRect(-14,26,28,22);ctx.fillStyle='#f0c95e';ctx.fillRect(-3,26,6,20);ctx.fillStyle='#f3c99c';ctx.fillRect(-19,27,7,18);ctx.fillRect(12,27,7,18);ctx.fillStyle='#f2c99d';ctx.fillRect(-12,5,24,22);ctx.fillStyle='#553b35';ctx.fillRect(-14,1,27,9);ctx.fillRect(-12,-3,22,8);ctx.fillStyle='#242e3b';ctx.fillRect(4,13,3,4);ctx.fillRect(-7,13,3,4);ctx.strokeStyle='#eafaff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(14,38);ctx.lineTo(player.attackTime>0?54:27,player.attackTime>0?16:22);ctx.stroke();ctx.restore();ctx.globalAlpha=1}
function drawSlime(s){if(!s.alive)return;const x=s.x-camera.x,y=s.y+Math.sin(s.bob)*2;ctx.save();if(s.flash>0&&Math.floor(s.flash/2)%2===0)ctx.globalAlpha=.45;ctx.fillStyle='rgba(25,61,47,.2)';ctx.beginPath();ctx.ellipse(x+21,s.y+32,22,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=regionDefs[regionIndex].enemyColor;ctx.beginPath();ctx.moveTo(x+2,y+30);ctx.quadraticCurveTo(x-5,y+12,x+11,y+5);ctx.quadraticCurveTo(x+21,y-2,x+31,y+6);ctx.quadraticCurveTo(x+48,y+13,x+40,y+30);ctx.closePath();ctx.fill();ctx.fillStyle='#9bf2ae';ctx.beginPath();ctx.ellipse(x+14,y+12,7,4,-.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#214a42';ctx.fillRect(x+13,y+17,3,5);ctx.fillRect(x+27,y+17,3,5);ctx.restore();if(s.hp<s.maxHp){ctx.fillStyle='#183044';ctx.fillRect(x+2,y-8,38,4);ctx.fillStyle='#80e19c';ctx.fillRect(x+2,y-8,38*s.hp/s.maxHp,4)}ctx.fillStyle='#1b3b45';ctx.font='bold 9px Nunito';ctx.textAlign='center';ctx.fillText(regionDefs[regionIndex].enemyName,x+21,y-13);ctx.textAlign='left'}
function drawNPC(){if(scene!=='field'||regionIndex!==0)return;const x=npc.x-camera.x,y=npc.y;ctx.fillStyle='#5d3e70';ctx.fillRect(x+4,y+28,24,30);ctx.fillStyle='#e6c18e';ctx.fillRect(x+5,y+5,22,24);ctx.fillStyle='#526c4b';ctx.fillRect(x+2,y+1,28,9);ctx.fillRect(x+7,y-5,18,9);ctx.fillStyle='#2c3340';ctx.fillRect(x+10,y+14,3,4);ctx.fillRect(x+20,y+14,3,4);ctx.fillStyle='#fff';ctx.font='bold 11px Nunito';ctx.textAlign='center';ctx.fillText('초록숲 약초상',x+16,y-13);if(Math.abs(player.x-npc.x)<95){ctx.fillStyle='#18344a';ctx.fillRect(x-10,y-34,52,17);ctx.fillStyle='#d9f8e2';ctx.fillText('[E] 상점',x+16,y-22)}ctx.textAlign='left'}
function drawBoss(){if(!boss.alive)return;const x=boss.x-camera.x,y=boss.y;if(x< -100||x>W+100)return;ctx.save();if(boss.flash>0&&Math.floor(boss.flash/2)%2===0)ctx.globalAlpha=.45;ctx.fillStyle='#8a5c9d';ctx.beginPath();ctx.ellipse(x+31,y+51,30,35,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b87b9c';ctx.beginPath();ctx.arc(x+31,y+28,25,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e6c4a0';ctx.fillRect(x+10,y+18,42,22);ctx.fillStyle='#4a2c53';ctx.fillRect(x+19,y+26,5,7);ctx.fillRect(x+39,y+26,5,7);ctx.fillStyle='#6b3d76';ctx.beginPath();ctx.moveTo(x+13,y+10);ctx.lineTo(x+5,y-4);ctx.lineTo(x+25,y+1);ctx.fill();ctx.beginPath();ctx.moveTo(x+47,y+10);ctx.lineTo(x+57,y-4);ctx.lineTo(x+38,y+1);ctx.fill();ctx.restore();if(Math.abs(player.x-boss.x)<580){const bw=190,bx=W/2-bw/2,by=20;ctx.fillStyle='#172238';ctx.fillRect(bx,by,bw,14);ctx.fillStyle='#d75e78';ctx.fillRect(bx,by,bw*boss.hp/boss.maxHp,14);ctx.strokeStyle='#f4d8e8';ctx.strokeRect(bx,by,bw,14);ctx.fillStyle='#fff';ctx.font='bold 12px Nunito';ctx.textAlign='center';ctx.fillText(regionDefs[regionIndex].bossName,W/2,14);ctx.textAlign='left'}}
function drawDrops(){for(const d of drops){const x=d.x-camera.x,y=d.y+Math.sin(d.bob)*2;if(x< -40||x>W+40)continue;ctx.save();ctx.translate(x,y);ctx.fillStyle=d.type==='meso'?'#ffd66f':d.type==='exp'?'#80ddff':'#ff929b';if(d.type==='meso'){ctx.beginPath();ctx.ellipse(0,0,10,7,-.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff1ba';ctx.fillRect(-2,-4,3,8)}else if(d.type==='weapon'||d.type==='armor'){ctx.fillStyle=d.type==='weapon'?'#f5df91':'#a9d9ef';ctx.font='bold 17px Nunito';ctx.textAlign='center';ctx.fillText(d.type==='weapon'?'⚔':'🛡',0,6)}else if(d.type==='exp'){ctx.rotate(Math.PI/4);ctx.fillRect(-7,-7,14,14);ctx.fillStyle='#e8fbff';ctx.fillRect(-2,-5,4,10)}else{ctx.fillRect(-6,-8,12,17);ctx.fillStyle='#f7d7af';ctx.fillRect(-3,-12,6,4)}ctx.restore()}}
function effects(){particles.forEach(p=>{ctx.globalAlpha=Math.min(1,p.life/12);ctx.fillStyle=p.color;ctx.fillRect(p.x-camera.x,p.y,p.size,p.size)});ctx.globalAlpha=1;ctx.textAlign='center';texts.forEach(t=>{ctx.globalAlpha=Math.min(1,t.life/12);ctx.font=t.big?'900 17px Nunito':'800 13px Nunito';ctx.lineWidth=3;ctx.strokeStyle='#152438';ctx.strokeText(t.s,t.x-camera.x,t.y);ctx.fillStyle=t.color;ctx.fillText(t.s,t.x-camera.x,t.y)});ctx.textAlign='left';ctx.globalAlpha=1}
function render(){ctx.save();ctx.translate((Math.random()-.5)*camera.shake,(Math.random()-.5)*camera.shake);if(scene==='town'){drawTown()}else{background();for(let i=0;i<17;i++)tree(140+i*235,.78+(i%3)*.13);ground();drawReturnPortal();slimes.forEach(drawSlime);drawBoss();drawPortal();ctx.fillStyle='rgba(20,55,64,.72)';ctx.font='800 12px Nunito';ctx.fillText(regionDefs[regionIndex].zone,20,H-20);ctx.textAlign='right';ctx.fillText('WORLD 0'+(regionIndex+1)+' · FIELD',W-20,H-20);ctx.textAlign='left'}drawDrops();drawPlayer();effects();ctx.restore()}

const jobDefs={
 warrior:{name:'전사',role:'근접 전투 · 높은 생존력',skills:{2:{name:'파워 스트라이크',reach:110,power:2.5,wide:false,cd:3.2},3:{name:'회전 베기',reach:155,power:1.7,wide:true,cd:7.5},4:{name:'전사의 결의',type:'guard',cd:14}}},
 mage:{name:'마법사',role:'원거리 마법 · 강력한 범위 공격',skills:{2:{name:'파이어볼',reach:430,power:2.25,wide:false,cd:3.5},3:{name:'번개 폭발',reach:285,power:1.8,wide:true,cd:7.5},4:{name:'메테오',reach:560,power:3.6,wide:true,cd:15}}},
 archer:{name:'궁수',role:'정밀 사격 · 빠른 공격',skills:{2:{name:'정밀 화살',reach:470,power:2.15,wide:false,cd:2.8},3:{name:'연속 사격',reach:510,power:1.65,wide:true,cd:6.5},4:{name:'관통 화살',reach:650,power:3.25,wide:true,cd:13}}}
};
function chooseJob(key){
 if(!jobDefs[key])return;job=key;player.job=key;
 const lv=Math.max(0,player.level-1),base={warrior:{hp:160,atk:23,def:8,speed:3.5},mage:{hp:112,atk:27,def:3,speed:3.55},archer:{hp:132,atk:21,def:5,speed:4.05}}[key];
 player.maxHp=base.hp+lv*18;player.hp=player.maxHp;player.attack=base.atk+lv*3;player.defense=base.def+Math.floor(lv/3);player.speed=base.speed;
 loadTown(false);$('jobSelect').classList.add('hidden');updateUI();save(false);start();
}
function useSkill(slot){
 if(!started||paused||player.dead||!job)return;const s=jobDefs[job].skills[slot];if(!s)return;
 if((skillCooldowns[slot]||0)>0){toast('스킬이 아직 재사용 대기 중입니다.');return}
 skillCooldowns[slot]=s.cd;
 if(s.type==='guard'){const healed=Math.min(32,player.maxHp-player.hp);player.hp+=healed;player.inv=75;text(player.x+17,player.y-18,'전사의 결의','#ffe18a',true);if(healed)text(player.x+17,player.y-36,'+'+healed+' HP','#9cf0b6',true);burst(player.x+17,player.y+25,'#f5d77d',18);tone(620,.16,'triangle',.05)}
 else{player.skillReach=s.reach;player.skillPower=s.power;player.skillWide=!!s.wide;player.attackTime=13;player.hit.clear();text(player.x+17,player.y-25,s.name,'#d8f2ff',true);burst(player.x+17+player.face*28,player.y+28,job==='mage'?'#9bd8ff':job==='archer'?'#b5ec9d':'#ffe19a',12);tone(job==='mage'?720:job==='archer'?540:300,.11,'sawtooth',.04)}
 updateUI();
}
function loadRegion(index,notify){
 const targetIndex=clamp(index,0,regionDefs.length-1),changed=targetIndex!==regionIndex;regionIndex=targetIndex;scene='field';if(changed){regionKills=0;questAccepted=false;questClaimed=false}const r=regionDefs[regionIndex];WORLD=3800;
 platforms=[{x:0,y:GROUND,w:WORLD,h:100},{x:330,y:385,w:190,h:18},{x:690,y:320,w:175,h:18},{x:1060,y:390,w:210,h:18},{x:1460,y:335,w:190,h:18},{x:1880,y:390,w:190,h:18},{x:2280,y:315,w:200,h:18},{x:2740,y:380,w:210,h:18},{x:3190,y:335,w:210,h:18}];
 const xs=[560,900,1360,1840,2380,2850];slimes=xs.map((x,i)=>{const s=slime(x,90+(i%3)*12);s.hp=r.enemyHp;s.maxHp=r.enemyHp;s.exp=r.enemyExp;s.meso=r.enemyMeso+Math.floor(Math.random()*10);s.enemyName=r.enemyName;return s});
 npc={x:1120,y:GROUND-62,w:32,h:62};boss={x:3370,y:GROUND-86,w:62,h:86,hp:r.bossHp,maxHp:r.bossHp,alive:true,face:-1,speed:1.05+regionIndex*.12,cd:0,flash:0};
 player.x=220;player.y=GROUND-player.h;player.vx=player.vy=0;player.grounded=true;player.inv=90;player.spawnX=220;player.spawnY=GROUND-player.h;
 drops=[];particles=[];texts=[];projectiles=[];camera.x=0;camera.shake=0;updateUI();
 if(notify!==false){toast(r.name+' 지역에 도착했습니다!');save(false)}
}
function loadTown(notify){
 scene='town';WORLD=2050;
 platforms=[{x:0,y:GROUND,w:WORLD,h:100}];
 slimes=[];drops=[];projectiles=[];npc=null;
 player.x=clamp(player.x||150,80,WORLD-player.w-100);player.y=GROUND-player.h;player.vx=player.vy=0;player.grounded=true;player.inv=35;
 player.spawnX=150;player.spawnY=GROUND-player.h;camera.x=clamp(player.x-360,0,WORLD-W);camera.shake=0;
 updateUI();if(notify!==false){toast('모험가 마을로 돌아왔습니다.');save(false)}
}
function drawTownBuilding(worldX,width,height,body,roof,sign,accent){
 const x=worldX-camera.x,y=GROUND-height;if(x+width< -80||x>W+80)return;
 ctx.fillStyle='rgba(28,48,54,.18)';ctx.fillRect(x-8,GROUND-4,width+16,9);
 ctx.fillStyle=body;ctx.fillRect(x,y,width,height);
 ctx.fillStyle=roof;ctx.beginPath();ctx.moveTo(x-18,y+8);ctx.lineTo(x+width*.5,y-48);ctx.lineTo(x+width+18,y+8);ctx.closePath();ctx.fill();
 ctx.fillStyle=accent;ctx.fillRect(x+width*.5-25,GROUND-74,50,74);
 ctx.fillStyle='#f6dca1';ctx.fillRect(x+22,y+35,34,34);ctx.fillRect(x+width-56,y+35,34,34);
 ctx.fillStyle='#6a8b99';ctx.fillRect(x+28,y+41,22,22);ctx.fillRect(x+width-50,y+41,22,22);
 ctx.fillStyle='#fff1ce';ctx.fillRect(x+width*.5-35,y+19,70,21);
 ctx.fillStyle='#34465b';ctx.font='bold 11px "Noto Sans KR"';ctx.textAlign='center';ctx.fillText(sign,x+width*.5,y+34);ctx.textAlign='left';
}
function drawTown(){
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#83c9ef');g.addColorStop(.65,'#d8f0e7');g.addColorStop(1,'#f4ebc9');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 for(let i=0;i<7;i++){const x=((i*190-camera.x*.16)%(W+200)+W+200)%(W+200)-80,y=62+(i%3)*35;ctx.fillStyle='rgba(255,255,255,.72)';ctx.beginPath();ctx.ellipse(x,y,35,12,0,0,Math.PI*2);ctx.ellipse(x+27,y-5,27,14,0,0,Math.PI*2);ctx.ellipse(x+48,y,25,10,0,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle='#9ac9ab';ctx.beginPath();ctx.moveTo(0,GROUND);for(let x=0;x<=W;x+=48)ctx.lineTo(x,315+34*Math.sin((x+camera.x*.18)*.008));ctx.lineTo(W,GROUND);ctx.fill();
 drawTownBuilding(230,230,150,'#d8ad76','#945c4e','잡화 상점','#8a5948');
 drawTownBuilding(650,255,175,'#9babb0','#536b78','대장간','#6f8792');
 drawTownBuilding(1080,280,190,'#d9c79c','#7d6989','모험가 길드','#806d8e');
 drawTownBuilding(1490,190,135,'#d5b18b','#85614f','여관','#9b7359');
 ground();drawTownNPCs();drawTownGate();
 ctx.fillStyle='rgba(24,55,64,.7)';ctx.font='900 12px Nunito';ctx.fillText('ADVENTURER TOWN',20,H-20);
}
function drawTownNPCs(){
 for(const n of townNpcs){const x=n.x-camera.x,y=GROUND-59;if(x< -60||x>W+60)continue;
  ctx.fillStyle='rgba(25,49,54,.2)';ctx.beginPath();ctx.ellipse(x+16,GROUND+1,19,5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=n.kind==='smith'?'#9b765b':n.kind==='guild'?'#5f6f9d':n.kind==='merchant'?'#8c598e':n.kind==='inn'?'#9a624d':'#4e8b78';ctx.fillRect(x+3,y+27,26,31);
  ctx.fillStyle='#f0c99e';ctx.fillRect(x+5,y+4,22,25);ctx.fillStyle=n.kind==='smith'?'#4d5965':n.kind==='guild'?'#4f5279':'#6c4a42';ctx.fillRect(x+3,y,27,9);
  ctx.fillStyle='#263444';ctx.fillRect(x+10,y+15,3,4);ctx.fillRect(x+21,y+15,3,4);
  if(n.kind==='smith'){ctx.strokeStyle='#d8e3e5';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+27,y+34);ctx.lineTo(x+39,y+17);ctx.stroke();ctx.fillStyle='#9a704d';ctx.fillRect(x+34,y+11,12,8)}
  ctx.fillStyle='#1b3143';ctx.fillRect(x-35,y-25,102,17);ctx.fillStyle='#f4f7e8';ctx.font='bold 10px "Noto Sans KR"';ctx.textAlign='center';ctx.fillText(n.name,x+16,y-13);
  if(Math.abs(player.x-n.x)<100){ctx.fillStyle='#163149';ctx.fillRect(x-8,y-48,50,17);ctx.fillStyle='#d9f8e2';ctx.fillText('[E] 대화',x+17,y-36)}
 }
 ctx.textAlign='left';
}
function drawTownGate(){
 const x=WORLD-100-camera.x,y=GROUND-112;ctx.fillStyle='#6e8292';ctx.fillRect(x-13,y+22,88,90);ctx.fillStyle='#d6e7ed';ctx.fillRect(x-4,y+31,70,78);
 ctx.strokeStyle='#8be1c0';ctx.lineWidth=7;ctx.beginPath();ctx.arc(x+31,y+26,37,Math.PI,0);ctx.stroke();ctx.fillStyle='#9bdef0';ctx.beginPath();ctx.ellipse(x+31,y+68,25,34,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#213b51';ctx.fillRect(x-36,y-18,136,22);ctx.fillStyle='#fff';ctx.font='bold 11px "Noto Sans KR"';ctx.textAlign='center';ctx.fillText('초록숲 사냥터 입구',x+31,y-3);ctx.textAlign='left';
}
function drawReturnPortal(){
 const x=90-camera.x,y=GROUND-100;ctx.fillStyle='#5d7f9d';ctx.fillRect(x-15,y+28,70,75);ctx.strokeStyle='#b5e2ff';ctx.lineWidth=6;ctx.beginPath();ctx.arc(x+20,y+25,34,Math.PI,0);ctx.stroke();ctx.fillStyle='#8dc8ef';ctx.beginPath();ctx.ellipse(x+20,y+63,22,31,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#fff';ctx.font='bold 10px "Noto Sans KR"';ctx.textAlign='center';ctx.fillText('마을 귀환',x+20,y-13);ctx.textAlign='left';
}
function drawPortal(){
 const x=WORLD-105-camera.x,y=GROUND-104;ctx.save();ctx.globalAlpha=boss.alive?.35:1;
 ctx.fillStyle=boss.alive?'#526879':'#6b8ce0';ctx.fillRect(x-10,y+12,76,92);
 ctx.strokeStyle=boss.alive?'#a0b1c0':'#d2e4ff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x+28,y+16,34,Math.PI,0);ctx.stroke();
 ctx.fillStyle=boss.alive?'#8d9daa':'#8fc8ff';ctx.beginPath();ctx.ellipse(x+28,y+49,24,37,0,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.fillStyle='#fff';ctx.font='bold 11px Nunito';ctx.textAlign='center';ctx.fillText(boss.alive?'보스 처치 필요':'다음 지역 이동',x+28,y-8);ctx.textAlign='left';
}
function usePortal(){
 if(boss.alive){toast('보스를 먼저 처치해야 다음 지역이 열립니다.');return}
 if(regionIndex>=regionDefs.length-1){player.x=WORLD-160;toast('모든 지역을 정복했습니다! 최종 승리!');return}
 unlockedRegions=Math.max(unlockedRegions,regionIndex+2);loadRegion(regionIndex+1,true);
}
function installAdvancedUI(){
 const style=document.createElement('style');style.textContent=`
 #mapHud{position:absolute;top:12px;left:12px;z-index:3;padding:7px 11px;border:1px solid #ffffff55;border-radius:9px;background:#10243bd9;color:#eff8ff;font:800 11px Nunito,sans-serif;pointer-events:none;box-shadow:0 3px 12px #0004}
 #mapHud small{display:block;color:#b9d3e8;font-size:9px;margin-top:3px}
 #skillBar{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:4}
 #skillBar button{width:86px;min-height:48px;border:1px solid #e8f4ff66;border-radius:8px;background:#10243be8;color:#f3f8ff;cursor:pointer;padding:4px;display:grid;grid-template-columns:18px 1fr;grid-template-rows:1fr 13px;align-items:center;text-align:left}
 #skillBar button small{grid-row:1/3;display:grid;place-items:center;background:#42627e;border-radius:5px;height:23px;font-weight:900}
 #skillBar button b{font-size:10px;white-space:nowrap}#skillBar button em{font-style:normal;font-size:9px;color:#9fe5ba}
 #skillBar button:disabled{opacity:.48;cursor:not-allowed}
 #jobSelect{z-index:8;background:#071727d9}
 .job-picks{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:18px}
 .job-pick{border:1px solid #8fc9b366;border-radius:10px;background:#19344a;color:#f2f8ff;padding:12px 6px;cursor:pointer}
 .job-pick:hover{background:#2b5665;border-color:#a4eac2}
 .job-pick b{display:block;font-size:15px;margin-bottom:5px}.job-pick small{font-size:9px;color:#b5d0dc}
 @media(max-width:560px){#skillBar{gap:3px;bottom:7px}#skillBar button{width:74px;min-height:42px;padding:3px}#skillBar button b{font-size:9px}}
 `;document.head.appendChild(style);
 const wrap=document.querySelector('.canvas-wrap');
 const map=document.createElement('div');map.id='mapHud';map.innerHTML='<span id="mapName">초록숲</span><small id="jobName">직업 미선택</small>';wrap.appendChild(map);
 const bar=document.createElement('div');bar.id='skillBar';bar.innerHTML='<button data-skill="2" type="button"><small>2</small><b>스킬 1</b><em>준비</em></button><button data-skill="3" type="button"><small>3</small><b>스킬 2</b><em>준비</em></button><button data-skill="4" type="button"><small>4</small><b>필살기</b><em>준비</em></button>';wrap.appendChild(bar);
 bar.querySelectorAll('[data-skill]').forEach(b=>b.addEventListener('click',()=>useSkill(Number(b.dataset.skill))));
 const modals=document.querySelectorAll('.town-modal');modals.forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeAll()}));
 const overlay=document.createElement('div');overlay.id='jobSelect';overlay.className='screen-overlay hidden';overlay.innerHTML='<div class="overlay-card"><p class="eyebrow">CHOOSE YOUR PATH</p><h2>첫 번째 직업 선택</h2><p>직업에 따라 능력치와 전용 스킬이 달라집니다.</p><div class="job-picks"><button class="job-pick" data-job="warrior"><b>⚔️ 전사</b><small>높은 HP · 근접 공격</small></button><button class="job-pick" data-job="mage"><b>🔮 마법사</b><small>강한 마법 · 원거리</small></button><button class="job-pick" data-job="archer"><b>🏹 궁수</b><small>빠른 사격 · 긴 사거리</small></button></div></div>';wrap.appendChild(overlay);
 overlay.querySelectorAll('[data-job]').forEach(b=>b.addEventListener('click',()=>chooseJob(b.dataset.job)));
}

function loop(t){if(!started)return;const dt=last?Math.min(.033,(t-last)/1000):1/60;last=t;update(dt);render();pressed.clear();requestAnimationFrame(loop)}
function start(){if(started)return;if(!job){$('jobSelect').classList.remove('hidden');return}started=true;paused=false;ui.start.classList.add('hidden');if(audio&&audio.state==='suspended')audio.resume();updateUI();last=0;requestAnimationFrame(loop);toast(scene==='town'?'모험가 마을에 오신 것을 환영합니다!':'사냥을 시작합니다!')}
function toggle(m){const opening=m.classList.contains('hidden');ui.inventory.classList.add('hidden');ui.shop.classList.add('hidden');if(opening){m.classList.remove('hidden');paused=true;if(m===ui.inventory)renderInventory()}else{m.classList.add('hidden');paused=false}}
function closeAll(){[ui.inventory,ui.shop,ui.smith,ui.questBoard].filter(Boolean).forEach(v=>v.classList.add('hidden'));paused=false}
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!down.has(e.code))pressed.add(e.code);down.add(e.code);if(e.code==='Escape')closeAll()});window.addEventListener('keyup',e=>down.delete(e.code));window.addEventListener('blur',()=>down.clear());
$('startBtn').addEventListener('click',start);$('respawnBtn').addEventListener('click',()=>{player.dead=false;player.hp=Math.max(60,Math.floor(player.maxHp*.65));player.x=player.spawnX;player.y=player.spawnY;player.vx=player.vy=0;player.inv=120;paused=false;ui.over.classList.add('hidden');camera.x=clamp(player.x-400,0,WORLD-W);updateUI();save(false);toast('마을에서 다시 출발합니다.')});
$('inventoryBtn').addEventListener('click',()=>{if(!started)start();toggle(ui.inventory)});$('saveBtn').addEventListener('click',()=>save(true));$('usePotionBtn').addEventListener('click',potion);$('buyPotionBtn').addEventListener('click',()=>{if(player.meso<30){toast('메소가 부족합니다.');return}player.meso-=30;player.potions++;tone(780,.08,'triangle',.04);updateUI();save(false);toast('빨간 포션을 구매했습니다.')});
$('buyWeaponUpgradeBtn').addEventListener('click',()=>buySmithUpgrade('weapon'));$('buyArmorUpgradeBtn').addEventListener('click',()=>buySmithUpgrade('armor'));$('acceptQuestBtn').addEventListener('click',acceptTownQuest);
$('soundBtn').addEventListener('click',()=>{sound=!sound;$('soundBtn').textContent=sound?'🔊 사운드':'🔇 음소거';$('soundBtn').setAttribute('aria-pressed',String(sound));if(sound)tone(500,.07,'sine',.03)});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{const m=$(b.dataset.close);m.classList.add('hidden');paused=false}));[ui.inventory,ui.shop].forEach(m=>m.addEventListener('click',e=>{if(e.target===m){m.classList.add('hidden');paused=false}}));
installAdvancedUI();loadTown(false);if(load())toast('저장된 모험 데이터를 불러왔습니다.');updateUI();updateSmithUI();render();
window.MapleAdventure={save:()=>save(true),reset:()=>{localStorage.removeItem(SAVE_KEY);location.reload()},chooseJob:chooseJob,enterRegion:loadRegion,returnToTown:()=>loadTown(true),acceptQuest:acceptTownQuest};
})();