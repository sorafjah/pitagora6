// ===== 見た目・操作の設定 =====
// EL を大きくすると真上から、小さくすると横から見る角度になります（ラジアン）
const VIEW = { AZ: 0, EL: 0.95, EL_MIN: 0.45, EL_MAX: 1.45, AZ_MAX: 0.9, NEAR_DIST: 24, SEL_ROOM: 60, SLOW: 0.3, REC_EVERY: 2 };
const $ = id => document.getElementById(id);
const clone = a => a.map(p=>Object.assign({},p));

const state = { mode:'edit', level:0, sel:-1, paused:true, slow:false, camFar:true, camFree:false,
  frames:0, elapsed:0, status:'', viewT:0, cleared:[false,false,false,false] };
const layouts = LEVELS.map(l=>clone(l.free?SAMPLE:l.parts));
const BL = () => LEVELS[state.level];
const layout = () => layouts[state.level];
let sim=null, rec=[], recInfo={win:-1}, acc=0;

// ---------- three.js ----------
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(); scene.background=new THREE.Color(0xbfe3f5);
const camera=new THREE.PerspectiveCamera(40,1,0.5,500);
scene.add(new THREE.HemisphereLight(0xffffff,0xb9a58a,1.5));
const sun=new THREE.DirectionalLight(0xffffff,1.9); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-24,right:24,top:20,bottom:-20,near:1,far:120}); sun.shadow.bias=-0.0006;
scene.add(sun, sun.target);
const cam={x:BOARD.W/2,z:BOARD.H/2,dist:50,az:VIEW.AZ,el:VIEW.EL};

function canvasTex(w,h,draw){ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
const TEX={
  wood:canvasTex(256,64,(g,w,h)=>{ g.fillStyle='#e2b377'; g.fillRect(0,0,w,h); for(let i=0;i<26;i++){ g.strokeStyle=`rgba(120,70,20,${0.08+0.12*((i*37)%10)/10})`; g.lineWidth=1+(i%3);
    g.beginPath(); const y=(i*53)%h; g.moveTo(0,y); g.bezierCurveTo(w*.3,y+4,w*.6,y-4,w,y+2); g.stroke(); } }),
  // 床：1マス＝玉2こ分の方眼（向きや距離の目安になる）
  board:canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#fbf3df'; g.fillRect(0,0,w,h); g.strokeStyle='#e6d8b6'; g.lineWidth=3; g.strokeRect(0,0,w,h);
    g.lineWidth=1; g.beginPath(); g.moveTo(64,0); g.lineTo(64,h); g.moveTo(0,64); g.lineTo(w,64); g.stroke(); }),
  floor:canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#9ccc7a'; g.fillRect(0,0,w,h); g.fillStyle='#8fc06c'; g.fillRect(0,0,64,64); g.fillRect(64,64,64,64); }),
  goal:canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#fff'; g.fillRect(0,0,w,h); g.fillStyle='#ffd54a'; for(let x=0;x<4;x++)for(let y=0;y<4;y++) if((x+y)%2) g.fillRect(x*32,y*32,32,32); }),
  ballA:canvasTex(128,64,(g,w,h)=>{ g.fillStyle='#e03131'; g.fillRect(0,0,w,h); g.fillStyle='#fff'; g.fillRect(0,22,w,20); }),
  ballB:canvasTex(128,64,(g,w,h)=>{ g.fillStyle='#1c7ed6'; g.fillRect(0,0,w,h); g.fillStyle='#ffe066'; for(let i=0;i<4;i++){ g.beginPath(); g.arc(16+i*32,32,9,0,7); g.fill(); } }),
  ballC:canvasTex(128,64,(g,w,h)=>{ g.fillStyle='#2e9e5b'; g.fillRect(0,0,w,h); g.fillStyle='#fff'; for(let i=0;i<4;i++) g.fillRect(i*32,0,14,h); }),
  coil:canvasTex(32,128,(g,w,h)=>{ g.fillStyle='#888'; g.fillRect(0,0,w,h); g.fillStyle='#ddd'; for(let i=0;i<8;i++) g.fillRect(0,i*16,w,7); })
};
TEX.board.wrapS=TEX.board.wrapT=TEX.floor.wrapS=TEX.floor.wrapT=THREE.RepeatWrapping;
TEX.board.repeat.set(BOARD.W/2,BOARD.H/2); TEX.floor.repeat.set((BOARD.W+30)/4,(BOARD.H+30)/4);
const std=(o)=>new THREE.MeshStandardMaterial(Object.assign({roughness:0.75,metalness:0},o));
const BAR_COL=[0xe03131,0xf08c00,0xf2c200,0x2e9e5b,0x1c7ed6], DOM_COL=[0xf08c00,0x2e9e5b,0x1c7ed6,0xae3ec9,0xe03131,0x0ca678];
const BAR8=[0xe03131,0xf08c00,0xf2c200,0x2e9e5b,0x0ca6a6,0x1c7ed6,0xae3ec9,0xf06595];
const MAT={
  wood:std({map:TEX.wood}), locked:std({map:TEX.wood,color:0x9a8f86}), frame:std({map:TEX.wood,color:0xb98a55}), rail:std({color:0x1c7ed6,roughness:0.5}), wedge:std({map:TEX.wood,color:0xd9b38c}),
  goal:std({color:0xf2c200,roughness:0.4}), goalDisc:std({map:TEX.goal,roughness:0.9}),
  bars8:BAR8.map(c=>std({color:c,roughness:0.3,metalness:0.35})), doms:DOM_COL.map(c=>std({color:c,roughness:0.5})),
  ballA:std({map:TEX.ballA,roughness:0.3}), ballB:std({map:TEX.ballB,roughness:0.3}), ballC:std({map:TEX.ballC,roughness:0.3}), metal:std({color:0x555c66,roughness:0.3,metalness:0.6}),
  spring:std({color:0xf08c00,roughness:0.4}), springbase:std({color:0xc76a00,roughness:0.5}), coil:std({map:TEX.coil,metalness:0.4,roughness:0.4}),
  gate:std({color:0x868e96,roughness:0.4,metalness:0.4}), dash:new THREE.MeshBasicMaterial({color:0x1c7ed6,transparent:true,opacity:0.7}), arrow:std({color:0xffe066,roughness:0.4}),
  guide:new THREE.MeshBasicMaterial({color:0xf2c200,transparent:true,opacity:0.75}),
  board:std({map:TEX.board,roughness:1}), floor:std({map:TEX.floor,roughness:1}), pole:std({color:0x666666}),
  hi:new THREE.MeshBasicMaterial({color:0xffe600,transparent:true,opacity:0.35,depthTest:false}),
  conf:BAR_COL.map(c=>new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide}))
};
const labelCache={};
function wideLabel(text,bg,fg){ const key='w'+text+bg; if(!labelCache[key]) labelCache[key]=new THREE.SpriteMaterial({map:canvasTex(320,96,(g,w,h)=>{
    g.fillStyle=bg; g.beginPath(); g.roundRect(4,4,w-8,h-8,40); g.fill(); g.strokeStyle='#f2c200'; g.lineWidth=6; g.stroke();
    g.fillStyle=fg; g.font='700 52px "BIZ UDPGothic",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text,w/2,h/2+3); }),depthTest:false});
  const s=new THREE.Sprite(labelCache[key]); s.scale.set(3.3,1.0,1); s.renderOrder=5; return s; }
function label(text,bg,fg,scale){ const key=text+bg; if(!labelCache[key]) labelCache[key]=new THREE.SpriteMaterial({map:canvasTex(128,128,(g)=>{
    g.fillStyle=bg; g.beginPath(); g.arc(64,64,58,0,7); g.fill(); g.fillStyle=fg; g.font=`700 ${text.length>1?52:78}px "BIZ UDPGothic",sans-serif`; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text,64,70); }),depthTest:false});
  const s=new THREE.Sprite(labelCache[key]); s.scale.setScalar(scale); s.renderOrder=5; return s; }
// 形は使い回す（動かすたびに作り直すため）
const geoCache={};
const GEO_SPH=new THREE.SphereGeometry(CFG.BALL_R,32,20);
const boxGeo=(w,h,d)=>{ const k='b'+[w,h,d].map(v=>v.toFixed(3)).join(); return geoCache[k]||(geoCache[k]=new THREE.BoxGeometry(w,h,d)); };
const cylGeo=(r,h,n)=>{ const k='c'+[r,h,n].join(); return geoCache[k]||(geoCache[k]=new THREE.CylinderGeometry(r,r,h,n)); };
const planeGeo=(w,h)=>{ const k='p'+[w,h].join(); return geoCache[k]||(geoCache[k]=new THREE.PlaneGeometry(w,h)); };
// 坂の下をうめる三角の台
const wedgeGeo=h=>{ const k='w'+h; if(geoCache[k]) return geoCache[k]; const L=CFG.RAMP_L, d=CFG.RAMP_W-0.34, s=new THREE.Shape();
  s.moveTo(-L/2,0); s.lineTo(L/2-0.3,0); s.lineTo(-L/2,h-0.08); s.closePath(); const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false}); g.translate(0,0,-d/2); return geoCache[k]=g; };
// 床にかく矢印（+x 向き、長さ len）
const arrowGeo=(len,wd)=>{ const k='a'+[len,wd].join(); if(geoCache[k]) return geoCache[k]; const s=new THREE.Shape(), t=wd*0.4, hd=Math.min(len*0.5,wd);
  s.moveTo(0,-t/2); s.lineTo(len-hd,-t/2); s.lineTo(len-hd,-wd/2); s.lineTo(len,0); s.lineTo(len-hd,wd/2); s.lineTo(len-hd,t/2); s.lineTo(0,t/2); s.closePath();
  const g=new THREE.ShapeGeometry(s); g.rotateX(-Math.PI/2); return geoCache[k]=g; };
const GEO_DASH=new THREE.PlaneGeometry(0.45,0.14); GEO_DASH.rotateX(-Math.PI/2);
const GEO_STOP=new THREE.RingGeometry(0.28,0.45,24); GEO_STOP.rotateX(-Math.PI/2);
const GEO_RING=new THREE.TorusGeometry(CFG.GOAL_R,0.13,10,40); GEO_RING.rotateX(Math.PI/2);
const GEO_DISC=new THREE.CircleGeometry(CFG.GOAL_R,40); GEO_DISC.rotateX(-Math.PI/2);

let group=null, dynMesh=[], springsV=[], gateV=[], chimeV=[], counter=null, flag=null, confetti=[], follow=-1, pickables=[];
function add(geo,mat,x,y,z,parent,sh){ const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z); m.castShadow=sh!==false; m.receiveShadow=true; (parent||group).add(m); return m; }
// さわって えらべるように、メッシュに部品番号をつける
function tag(o,pi){ if(pi<0||pi===undefined) return o; o.traverse(c=>c.userData.pi=pi); pickables.push(o); return o; }
function buildWorld(){
  if(group) scene.remove(group);
  group=new THREE.Group(); scene.add(group); dynMesh=[]; confetti=[]; springsV=[]; gateV=[]; chimeV=[]; counter=null; flag=null; pickables=[];
  sim=createFloorSim(CANNON,layout(),0);
  rec=[]; recInfo={win:-1}; acc=0; state.viewT=0; follow=-1;
  const L=layout();
  for(const p of sim.parts){
    if(p.look==='hidden') continue;
    if(p.look==='ground'){ add(boxGeo(p.sx,p.sy,p.sz),MAT.floor,p.body.position.x,p.body.position.y,p.body.position.z,null,false);
      const b=add(planeGeo(BOARD.W,BOARD.H),MAT.board,BOARD.W/2,0.01,BOARD.H/2,null,false); b.rotation.x=-Math.PI/2; continue; }
    const m=add(boxGeo(p.sx,p.sy,p.sz),MAT[p.look]||MAT.wood,0,0,0); m.position.copy(p.body.position); m.quaternion.copy(p.body.quaternion); tag(m,p.pi);
    if(p.gate){ m.position.y=0.5; gateV.push(m); }   // さくの はしらは、ひらく前の 高さで つくる
  }
  for(const d of sim.dyn){ let m; const k=d.kind, D=CFG.DOMINO;
    if(k==='ball') m=add(GEO_SPH,[MAT.ballA,MAT.ballB,MAT.ballC][d.n%3],0,0,0);
    else if(k==='domino') m=add(boxGeo(D.t,D.h,D.w),MAT.doms[d.i%6],0,0,0);
    tag(m,d.pi); dynMesh.push(m); }
  for(const d of sim.deco){
    const g=new THREE.Group(); g.position.set(d.x,0,d.z); g.rotation.y=d.a||0; group.add(g);
    if(d.k==='ramp'){ add(wedgeGeo(d.h),MAT.wedge,0,0,0,g);
      add(arrowGeo(2.2,1.0),MAT.guide,CFG.RAMP_L/2+0.4,0.03,0,g,false);            // 玉が出ていく向き
      if(d.lock===true){ const s=label('🔒','#ffffff','#333',0.9); s.position.set(-CFG.RAMP_L/2,d.h+2.2,0); g.add(s); } }
    else if(d.k==='spring'){ add(boxGeo(1.6,0.1,1.6),MAT.springbase,0,0.05,0,g);
      for(let i=0;i<=d.o;i++) add(arrowGeo(0.5,0.9),MAT.arrow,-0.35+i*0.38,0.11,0,g,false);   // やじるしの数＝つよさ
      const c=add(cylGeo(0.22,1,12),MAT.coil,-0.75,0.32,0,g); c.rotation.z=Math.PI/2; const plate=add(boxGeo(0.12,0.55,1.3),MAT.spring,-0.7,0.33,0,g);
      springsV.push({pi:d.pi,coil:c,plate}); }
    else if(d.k==='chime'){ chimeV.push({pi:d.pi,m:add(boxGeo(1.8,0.08,0.5),MAT.bars8[d.o],0,0.04,0,g)});
      const s=label(NOTE_NAMES[d.o],'#ffffff','#333',0.8); s.position.set(0,0.75,0); g.add(s); }
    else if(d.k==='goal'){ add(GEO_DISC,MAT.goalDisc,0,0.02,0,g,false); add(GEO_RING,MAT.goal,0,0.08,0,g); addFlag(d.x,d.z);
      // さくつきの ゴールには「♪ 0/2」の かずを 出す（なった かずの ぶんだけ よういして、見せる ものを きりかえる）
      if(d.need>0){ counter=[]; for(let n=0;n<=d.need;n++){ const s=wideLabel(n>=d.need?'♪ ひらいた！':`♪ ${n} / ${d.need}`, n>=d.need?'#2e9e5b':'#ffffff', n>=d.need?'#fff':'#333'); s.position.set(d.x,2.6,d.z); s.visible=n===0; group.add(s); counter.push(s); } } }
    tag(g,d.pi);
  }
  // えらんでいるパーツを黄色く光らせる
  if(state.mode==='edit'&&state.sel>=0&&L[state.sel]){ const h=hitBox(state.sel); const m=add(boxGeo(h.w+0.5,0.05,h.d+0.5),MAT.hi,h.x,0.04,h.z,null,false); m.rotation.y=h.a; m.renderOrder=4; }
  syncBodies(); updateExtras();
}
function addFlag(gx,gz){ const px=gx, pz=gz-CFG.GOAL_R-0.1, top=3.4;
  add(cylGeo(0.08,top+0.8,8),MAT.pole,px,(top+0.8)/2,pz);
  flag=add(planeGeo(3.6,1.5),MAT.flag,px+1.85,0.8,pz+0.05,null,false); flag.userData={y0:0.8,y1:top}; flag.visible=false;
  for(let i=0;i<90;i++){ const m=add(planeGeo(0.3,0.3),MAT.conf[i%5],0,0,0,null,false); m.visible=false;
    const a=(i*2.399)%6.283, sp=3+(i*7%10)*0.7; m.userData={vx:Math.cos(a)*sp,vy:9+(i*3%7),vz:Math.sin(a)*sp,x:gx,z:gz,r:i}; confetti.push(m); } }
function hitBox(i){ const p=layout()[i], sp=PARTS[p.type]; return { x:p.x, z:p.z, w:sp.w, d:sp.d, a:ANG(p.rot) }; }
function syncBodies(){ sim.dyn.forEach((d,i)=>{ dynMesh[i].position.copy(d.body.position); dynMesh[i].quaternion.copy(d.body.quaternion); }); }
// まきもどし用の記録：物体ごとに 位置3つ＋回転4つ
function record(){ const f=new Float32Array(sim.dyn.length*7); sim.dyn.forEach((d,i)=>{ const p=d.body.position,q=d.body.quaternion; f.set([p.x,p.y,p.z,q.x,q.y,q.z,q.w],i*7); }); rec.push(f); }
function applyFrame(n){ const f=rec[Math.max(0,Math.min(rec.length-1,n))]; if(!f) return;
  dynMesh.forEach((m,i)=>{ const o=i*7; m.position.set(f[o],f[o+1],f[o+2]); m.quaternion.set(f[o+3],f[o+4],f[o+5],f[o+6]); }); }
// ばね・旗・紙ふぶきは「発射からの時間」「ゴールからの時間」だけで決まるので、まきもどしても正しく表示されます
function updateExtras(){
  const T=state.viewT, tWin=recInfo.win>=0&&T>=recInfo.win?T-recInfo.win:-1;
  const kick=u=>u<0?0:u<0.07?u/0.07:Math.max(0,1-(u-0.07)/0.5);
  for(const s of springsV){ let tf=-1; for(const f of sim.fires) if(f.pi===s.pi&&f.t<=T) tf=f.t;
    const e=1.0*kick(tf<0?-1:T-tf); s.plate.position.x=-0.7+e; s.coil.scale.y=0.1+e; s.coil.position.x=-0.8+(0.1+e)/2; }
  const nRung=sim.rings.filter(r=>r.t<=T).length;
  if(counter) counter.forEach((s,n)=>s.visible=n===Math.min(nRung,counter.length-1));
  const go=sim.gateOpenT>=0&&T>=sim.gateOpenT?Math.min(1,(T-sim.gateOpenT)/0.5):0;
  for(const m of gateV) m.position.y=0.5-1.1*go;   // さくが 床に しずんで ひらく
  for(const c of chimeV){ let tf=-1; for(const r of sim.rings) if(r.pi===c.pi&&r.t<=T) tf=r.t; const k=tf<0?0:Math.max(0,1-(T-tf)/0.35); c.m.scale.set(1+0.15*k,1+5*k,1+0.3*k); }
  if(flag){ const won=tWin>=0; flag.visible=won; if(won){ const u=Math.min(1,tWin/0.9); flag.position.y=flag.userData.y0+(flag.userData.y1-flag.userData.y0)*(1-(1-u)*(1-u)); }
    for(const m of confetti){ const d=m.userData; m.visible=won&&tWin<4; if(m.visible){ m.position.set(d.x+d.vx*tWin,Math.max(0.05,0.5+d.vy*tWin-6*tWin*tWin),d.z+d.vz*tWin); m.rotation.set(tWin*5+d.r,tWin*7+d.r,0); } } }
}

// ---------- 音（Web Audio で合成） ----------
let AC=null, lastTok=0, lastKnock=0;
function audioOn(){ try{ if(!AC) AC=new (window.AudioContext||window.webkitAudioContext)(); if(AC.state==='suspended') AC.resume(); }catch(e){} }
function tone(f,dur,type,vol,f2,delay){ if(!AC||AC.state!=='running') return; const t=AC.currentTime+(delay||0), o=AC.createOscillator(), g=AC.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol||0.2,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur); o.connect(g).connect(AC.destination); o.start(t); o.stop(t+dur+0.02); }
const NOTES8=[523.25,587.33,659.25,698.46,783.99,880,987.77,1046.5];
function playEvent(e){
  const n=performance.now();
  if(e.k==='tok'){ if(n-lastTok>45){ lastTok=n; tone(900+Math.random()*300,0.05,'square',0.07); } }
  else if(e.k==='knock'){ if(n-lastKnock>80){ lastKnock=n; tone(150,0.07,'sine',0.2,70); } }
  else if(e.k==='clack') tone(260,0.12,'triangle',0.3,120);
  else if(e.k==='spring'){ tone(140,0.3,'sawtooth',0.18,1100); tone(90,0.15,'square',0.15,50); }
  else if(e.k==='bar'){ const f=NOTES8[e.i]; tone(f,0.9,'sine',0.3); tone(f*2,0.4,'triangle',0.1); }
  else if(e.k==='gate'){ [784,988,1175].forEach((f,i)=>tone(f,0.25,'triangle',0.2,0,i*0.09)); }
  else if(e.k==='win'){ [523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,0.3,'triangle',0.22,0,0.25+i*0.13)); }
  else if(e.k==='fail'){ tone(330,0.25,'triangle',0.2,250,0.2); tone(250,0.45,'triangle',0.2,150,0.45); }
}
const drain=()=>{ while(sim.events.length) playEvent(sim.events.shift()); };

// ---------- 進行 ----------
function setMode(m){ state.mode=m; const go=$('go');
  go.innerHTML=m==='edit'?'▶<br>スタート':m==='run'?'■<br>とめる':'↺<br>もどす'; go.classList.toggle('stop',m!=='edit');
  const tr=$('time'); tr.disabled=m!=='done'; if(m!=='done'){ tr.max=0; tr.value=0; }
  if(m!=='done') $('banner').style.display='none'; }
function toEdit(){ state.status=''; setMode('edit'); buildWorld(); refreshUI(); }
function start(){ if(state.mode!=='edit') toEdit(); state.sel=-1; setMode('run'); buildWorld(); audioOn(); record(); refreshUI(); }   // よそく線は つくっている間だけ（先に run にしてから 作りなおす）
function finish(){ state.status=sim.status; setMode('done');
  const tr=$('time'); tr.max=rec.length-1; tr.value=rec.length-1;
  const b=$('banner'), bb=$('bannerBtn'); b.style.display='flex'; b.className=sim.status;
  if(sim.status==='win'){ state.cleared[state.level]=true; $('bannerTxt').innerHTML='🎉 だいせいこう！';
    if(BL().free){ bb.innerHTML='つづける'; bb.onclick=toEdit; }
    else { const nx=state.level+1; bb.innerHTML=LEVELS[nx].free?'じゆうに つくる':'つぎの レベルへ'; bb.onclick=()=>setLevel(nx); }
  } else { const got=sim.rung.size, need=sim.info.gateNeed;
    $('bannerTxt').innerHTML= sim.failWhy==='gate' ? `ざんねん！ てっきんが ${got}こ しか ならなかったので、さくが ひらかなかったよ`
      : 'ざんねん！ ゴールに <ruby>入<rt>はい</rt></ruby>らなかったよ'; bb.innerHTML='なおす'; bb.onclick=toEdit; }
  refreshUI(); }
function setLevel(l){ state.camFree=false; state.level=l; state.sel=layouts[l].findIndex(p=>p.lock==='pos'); state.camFar=true; cam.az=VIEW.AZ; cam.el=VIEW.EL; buildPalette(); toEdit(); resize(); }
function advance(dt){
  state.frames++; state.elapsed+=dt;
  if(state.mode==='run'&&!state.paused){
    acc+=dt*(state.slow?VIEW.SLOW:1); const H=CFG.H;
    while(acc>=H&&sim.status==='run'){ sim.step(); acc-=H; if(sim.steps%VIEW.REC_EVERY===0) record(); drain(); }
    state.viewT=sim.t; syncBodies();
    if(sim.status!=='run'){ record(); if(sim.status==='win') recInfo.win=sim.t; drain(); finish(); }
  }
  if(state.mode==='done'){ const n=+$('time').value, end=rec.length-1;
    // 最後まで見ているときは時間を進めて、旗と紙ふぶきを動かす
    if(n>=end) state.viewT+=dt; else state.viewT=n*CFG.H*VIEW.REC_EVERY; applyFrame(n); }
  if(sim) updateExtras();
  updateCamera(dt);
}
let freeTop=60, freeBot=180;
function placeCam(x,z,dist){ const ce=Math.cos(cam.el);
  camera.position.set(x+dist*Math.sin(cam.az)*ce, dist*Math.sin(cam.el), z+dist*Math.cos(cam.az)*ce); camera.lookAt(x,0,z); camera.updateMatrixWorld(); }
// 床ぜんたいが、上のバーと下のパネルの間にちょうど入る距離を、実際に映してみて探す
const _v=new THREE.Vector3();
const FIT_PTS=[]; for(const x of [-1.2,BOARD.W+1.2]) for(const z of [-1.2,BOARD.H+1.2]) for(const y of [0,1.2]) FIT_PTS.push([x,y,z]);
function boardFits(dist){ placeCam(BOARD.W/2,BOARD.H/2,dist); const Hh=window.innerHeight, yT=1-2*freeTop/Hh, yB=-(1-2*(freeBot+VIEW.SEL_ROOM)/Hh);   // 下は、えらんだときに出るボタンの分もあけておく
  for(const p of FIT_PTS){ _v.set(p[0],p[1],p[2]).project(camera); if(Math.abs(_v.x)>0.985||_v.y>yT||_v.y<yB) return false; } return true; }
function fitDist(){ let lo=8, hi=260; for(let i=0;i<14;i++){ const m=(lo+hi)/2; if(boardFits(m)) hi=m; else lo=m; } return hi; }
function followTarget(){ // いちばん大きく動いた玉を追いかける
  if(follow<0||state.frames%20===0){ let best=-1,bd=-1; const f0=rec[0]; sim.dyn.forEach((d,i)=>{ if(d.kind!=='ball') return; const p=dynMesh[i].position, dd=f0?Math.hypot(p.x-f0[i*7],p.z-f0[i*7+2]):0; if(dd>bd){ bd=dd; best=i; } }); follow=best; }
  return follow>=0?dynMesh[follow].position:null; }
function updateCamera(dt){
  let tx,tz,td; const p=(!state.camFar&&state.mode!=='edit')?followTarget():null;
  if(p){ tx=p.x; tz=p.z; td=VIEW.NEAR_DIST; } else { tx=BOARD.W/2; tz=BOARD.H/2; td=fitDist(); }
  const k=1-Math.exp(-dt*(state.mode==='run'?5:4)); cam.x+=(tx-cam.x)*k; cam.z+=(tz-cam.z)*k; cam.dist+=(td-cam.dist)*k;
  placeCam(cam.x,cam.z,cam.dist);
  sun.target.position.set(cam.x,0,cam.z); sun.position.set(cam.x+9,32,cam.z+12);
}
function resize(){ const w=window.innerWidth,h=window.innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h;
  const ms=$('mission'), bn=$('banner'); freeTop=(ms.style.display==='none'?bn:ms).getBoundingClientRect().bottom+4; if(!(freeTop>20)) freeTop=100; freeBot=$('panel').offsetHeight;
  // 見たい所が、上のバーと下のパネルの間のまん中に来るように、画面全体をずらす
  camera.setViewOffset(w,h,0,(freeBot-freeTop)/2,w,h); camera.updateProjectionMatrix();
  $('selbar').style.bottom=(freeBot+8)+'px'; $('tip').style.bottom=(freeBot+8+64)+'px'; }
window.addEventListener('resize',resize);

// ---------- UI ----------
const ICON={
  ramp:'<path d="M6 8 L6 28 L42 28 Z" fill="#e2b377" stroke="#b07a3a" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="7" r="6" fill="#e03131"/>',
  ball:'<circle cx="24" cy="17" r="11" fill="#1c7ed6"/><circle cx="19" cy="17" r="3" fill="#ffe066"/><circle cx="29" cy="17" r="3" fill="#ffe066"/>',
  wall:'<line x1="6" y1="28" x2="42" y2="6" stroke="#b07a3a" stroke-width="7" stroke-linecap="round"/><circle cx="10" cy="10" r="5" fill="#e03131"/>',
  domino:'<rect x="21" y="5" width="6" height="25" fill="#f08c00"/>',
  domino5:'<rect x="5" y="5" width="5" height="25" fill="#f08c00"/><rect x="13" y="5" width="5" height="25" fill="#2e9e5b"/><rect x="21" y="5" width="5" height="25" fill="#1c7ed6"/><rect x="29" y="5" width="5" height="25" fill="#ae3ec9"/><rect x="37" y="5" width="5" height="25" fill="#e03131"/>',
  spring:'<rect x="10" y="4" width="28" height="26" rx="3" fill="#c76a00"/><path d="M15 13 h10 v-5 l11 9 l-11 9 v-5 h-10z" fill="#ffe066"/>',
  chime:'<rect x="6" y="14" width="26" height="7" rx="3" fill="#1c7ed6"/><text x="35" y="16" font-size="16" fill="#333">♪</text>'
};
function buildPalette(){ const el=$('palette'); el.innerHTML='';
  BL().allow.forEach(t=>{ const b=document.createElement('button'); b.className='pbtn'; b.dataset.t=t;
    const nw=(BL().new||[]).includes(t); b.classList.toggle('isnew',nw);
    b.innerHTML=`<svg viewBox="0 0 48 34">${ICON[t]}</svg>${PARTS[t].name}${nw?'<span class="nw">NEW</span>':''}`; b.addEventListener('click',()=>{ audioOn(); addPart(t); }); el.appendChild(b); }); }
let toastT=0;
function toast(msg){ const t=$('toast'); t.innerHTML=msg; t.style.display='block'; clearTimeout(toastT); toastT=setTimeout(()=>t.style.display='none',1600); }
function refreshUI(){
  document.querySelectorAll('.lv').forEach(b=>{ const l=+b.dataset.lv; b.classList.toggle('on',l===state.level); b.textContent=(state.cleared[l]?'⭐':'')+(LEVELS[l].free?'じゆう':'レベル'+LEVELS[l].tab); });
  $('slowBtn').classList.toggle('on',state.slow); $('viewBtn').classList.toggle('on',state.camFree); $('camBtn').classList.toggle('on',!state.camFar);
  $('mission').innerHTML=BL().mission; $('mission').style.display=state.mode==='done'?'none':'block';
  const cb=$('clearBtn'); if(!cb.classList.contains('warn')) cb.textContent=BL().free?'🧹 ぜんぶ けす':'↩ さいしょから';
  const sb=$('selbar'), p=state.mode==='edit'&&state.sel>=0?layout()[state.sel]:null;
  sb.style.display=p?'flex':'none';
  if(p){ const sp=PARTS[p.type]; $('selName').textContent=sp.name;
    $('rotL').style.display=$('rotR').style.display=sp.rot&&!p.lock?'':'none'; $('delBtn').style.display=p.lock?'none':'';
    $('optBtn').style.display=sp.opt?'':'none'; if(sp.opt) $('optBtn').textContent=sp.opt.label+'：'+sp.opt.names[p.opt||0]; }
  const tp=$('tip'); if(p&&PARTS[p.type].tip){ tp.innerHTML=PARTS[p.type].tip; tp.style.display='block'; } else tp.style.display='none';
}
// ---------- パーツの編集 ----------
const snap=v=>Math.round(v/CFG.GRID)*CFG.GRID;
function changed(){ buildWorld(); refreshUI(); }
function addPart(type){
  if(state.mode!=='edit') toEdit();
  const L=layout(), sp=PARTS[type];
  if(L.length>=CFG.MAX_PARTS){ toast('これ <ruby>以上<rt>いじょう</rt></ruby>は おけないよ'); return -1; }
  if(sp.max&&L.filter(p=>p.type===type).length>=sp.max){ toast(`${sp.name}は ${sp.max}こ まで`); return -1; }
  if(sp.dom&&L.reduce((n,p)=>n+(PARTS[p.type].dom||0),0)+sp.dom>CFG.MAX_DOMINO){ toast(`ドミノは ${CFG.MAX_DOMINO}まい まで`); return -1; }
  // ほかの パーツと かさならない、まん中に ちかい 空いた ばしょに 出す
  const rad=t=>Math.hypot(PARTS[t].w,PARTS[t].d)/2, r0=rad(type); let x=BOARD.W/2, z=BOARD.H/2, best=1e9;
  for(let gz=1.5;gz<=BOARD.H-1.5;gz+=0.5) for(let gx=2.5;gx<=BOARD.W-2.5;gx+=0.5){
    if(L.some(p=>Math.hypot(p.x-gx,p.z-gz)<r0+rad(p.type)+0.4)) continue;
    const d=Math.hypot(gx-BOARD.W/2,(gz-BOARD.H/2)*1.3); if(d<best){ best=d; x=gx; z=gz; } }
  L.push(P(type,x,z,0,sp.opt0||0)); state.sel=L.length-1; changed();
  return state.sel; }
function movePart(i,x,z){ const p=layout()[i]; if(!p||p.lock) return;
  x=Math.max(0.5,Math.min(BOARD.W-0.5,snap(x))); z=Math.max(0.5,Math.min(BOARD.H-0.5,snap(z)));
  if(x!==p.x||z!==p.z){ p.x=x; p.z=z; changed(); } }
function rotatePart(d){ const p=layout()[state.sel]; if(!p||p.lock) return; if(!PARTS[p.type].rot) return;
  p.rot=((p.rot+d+12)%24+24)%24-12; changed(); }
function cycleOpt(){ const p=layout()[state.sel]; if(!p||p.lock===true) return; const sp=PARTS[p.type]; if(!sp.opt) return;
  p.opt=((p.opt||0)+1)%sp.opt.names.length; if(p.type==='chime') playEvent({k:'bar',i:p.opt}); changed(); }
function deletePart(){ const L=layout(), p=L[state.sel]; if(!p||p.lock) return;
  if(p.type==='goal'){ toast('ゴールは けせないよ'); return; }
  if(p.type==='ramp'&&L.filter(q=>q.type==='ramp').length<=1){ toast('スタートの さかは 1こ いるよ'); return; }
  L.splice(state.sel,1); state.sel=-1; changed(); }
function resetLayout(){ layouts[state.level]=clone(BL().free?FREE_EMPTY:BL().parts); state.sel=-1; toEdit(); }
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2(), floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
function setRay(e){ const r=canvas.getBoundingClientRect(); ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1); ray.setFromCamera(ndc,camera); }
function floorPoint(){ return ray.ray.intersectPlane(floorPlane,new THREE.Vector3()); }
// まず立体に直接さわったかを調べ、だめなら床の上の位置（少し広め）で探す
function pick(pt){ const hit=ray.intersectObjects(pickables,true)[0]; if(hit&&hit.object.userData.pi>=0) return hit.object.userData.pi;
  if(!pt) return -1; let best=-1,bd=1e9; const pad=0.5;
  layout().forEach((p,i)=>{ const h=hitBox(i), dx=pt.x-h.x, dz=pt.z-h.z, lx=dx*Math.cos(h.a)-dz*Math.sin(h.a), lz=dx*Math.sin(h.a)+dz*Math.cos(h.a);
    const u=Math.abs(lx)/(h.w/2+pad), v=Math.abs(lz)/(h.d/2+pad); if(u<=1&&v<=1){ const d=Math.max(u,v)+h.w*h.d*0.01; if(d<bd){ bd=d; best=i; } } });
  return best; }
let drag=null;
canvas.addEventListener('pointerdown',e=>{ try{ canvas.setPointerCapture(e.pointerId); }catch(_){}
  if(state.mode==='edit'){ setRay(e); const pt=floorPoint(), i=pick(pt);
    if(i>=0){ const p=layout()[i]; if(p.lock===true){ toast('🔒 これは うごかせないよ'); return; }
      if(p.lock==='pos'){ state.sel=i; drag=null; changed(); toast('📌 これは ばしょが きまっているよ。せっていだけ かえられる'); return; }
      state.sel=i; drag=pt?{part:i,ox:p.x-pt.x,oz:p.z-pt.z}:null; changed(); return; }
    if(state.sel>=0){ state.sel=-1; changed(); } }
  if(!state.camFree){ drag=null; return; }   // ふだんは視点を うごかさない（「視点」ボタンで ゆるす）
  drag={x:e.clientX,y:e.clientY,az:cam.az,el:cam.el}; });
canvas.addEventListener('pointermove',e=>{ if(!drag) return;
  if(drag.part!==undefined){ setRay(e); const pt=floorPoint(); if(pt) movePart(drag.part,pt.x+drag.ox,pt.z+drag.oz); return; }
  cam.az=Math.max(-VIEW.AZ_MAX,Math.min(VIEW.AZ_MAX,drag.az-(e.clientX-drag.x)*0.006)); cam.el=Math.max(VIEW.EL_MIN,Math.min(VIEW.EL_MAX,drag.el+(e.clientY-drag.y)*0.005)); });
['pointerup','pointercancel'].forEach(n=>canvas.addEventListener(n,()=>drag=null));

$('go').addEventListener('click',()=>{ audioOn(); if(state.mode==='edit') start(); else toEdit(); });
$('slowBtn').addEventListener('click',()=>{ state.slow=!state.slow; refreshUI(); });
$('viewBtn').addEventListener('click',()=>{ state.camFree=!state.camFree; if(state.camFree) toast('ゆびで なぞって、<ruby>見<rt>み</rt></ruby>る むきを かえよう'); else { cam.az=VIEW.AZ; cam.el=VIEW.EL; } refreshUI(); });
$('camBtn').addEventListener('click',()=>{ state.camFar=!state.camFar; cam.az=VIEW.AZ; cam.el=VIEW.EL; refreshUI(); });
$('rotL').addEventListener('click',()=>rotatePart(1)); $('rotR').addEventListener('click',()=>rotatePart(-1));
$('optBtn').addEventListener('click',()=>{ audioOn(); cycleOpt(); }); $('delBtn').addEventListener('click',deletePart);
let clearT=0;
$('clearBtn').addEventListener('click',()=>{ const b=$('clearBtn');   // 2回おして実行（まちがい防止）
  if(b.classList.contains('warn')){ clearTimeout(clearT); b.classList.remove('warn'); resetLayout(); }
  else { b.classList.add('warn'); b.textContent='もう1かい おすと けす'; clearT=setTimeout(()=>{ b.classList.remove('warn'); refreshUI(); },2500); } });
document.querySelectorAll('.lv').forEach(b=>b.addEventListener('click',()=>{ audioOn(); setLevel(+b.dataset.lv); }));
$('helpBtn').addEventListener('click',()=>{ $('help').classList.add('open'); state.paused=true; });
$('startBtn').addEventListener('click',()=>{ audioOn(); $('help').classList.remove('open'); state.paused=false; });

// ---------- iPad対策（拡大・スクロール防止） ----------
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('touchmove',e=>{ if(!e.target.closest('input[type=range],.box,#palette')) e.preventDefault(); },{passive:false});
let lastTouch=0;
document.addEventListener('touchend',e=>{ const n=Date.now(); if(n-lastTouch<300&&!e.target.closest('input[type=range]')) e.preventDefault(); lastTouch=n; },{passive:false});

// ---------- テスト用フック ----------
// 動く物体は cannon-es の body.position / quaternion で動かし、メッシュは毎フレームそこから写しています（まきもどし中は rec[] の記録から写します）
// 配置は layouts[level]（{type,x,z,rot,opt,lock} の配列。x＝左右、z＝おく・手前）が元データで、変更のたびに sim とメッシュを作り直します
// てっきん・ばね・ゴールは物体ではなく、sim.step() の中で玉の位置を見て判定しています
window.__game={ state, camera, cam, CFG, PARTS, BOARD, LEVELS, SAMPLE, layouts, get sim(){return sim;}, get rec(){return rec;}, get bodies(){return sim.dyn;},
  api:{ tick(n,dt){ for(let i=0;i<(n||1);i++) advance(dt||1/60); renderer.render(scene,camera); return this.getState(); },
    getState(){ return {mode:state.mode,level:state.level,sel:state.sel,status:state.status,t:sim.t,frames:state.frames,parts:layout().length,
      balls:sim.dyn.filter(d=>d.kind==='ball').map(d=>({x:d.body.position.x,y:d.body.position.y,z:d.body.position.z}))}; },
    setLevel, start(){ state.paused=false; $('help').classList.remove('open'); start(); }, reset(){ toEdit(); },
    getLayout(){ return clone(layout()); }, setLayout(a){ layouts[state.level]=clone(a); state.sel=-1; toEdit(); },
    addPart, movePart, select(i){ state.sel=i; changed(); }, rotate:rotatePart, cycleOpt, deletePart, resetLayout,
    scrub(n){ $('time').value=n; },
    screenOf(x,z,y){ const v=new THREE.Vector3(x,y||0,z).project(camera); return {x:(v.x+1)/2*window.innerWidth,y:(1-v.y)/2*window.innerHeight}; },
    simulate(a){ const s=createFloorSim(CANNON,a,0); while(s.status==='run') s.step(); return {status:s.status,t:s.t}; } } };

// ---------- 起動 ----------
function boot(){
  TEX.flag=canvasTex(512,212,(g,w,h)=>{ g.fillStyle='#ffd54a'; g.fillRect(0,0,w,h); g.strokeStyle='#e8590c'; g.lineWidth=14; g.strokeRect(7,7,w-14,h-14);
    g.fillStyle='#333'; g.font='700 96px "BIZ UDPGothic",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('ピタゴラ６',w/2,h/2+6); });
  MAT.flag=new THREE.MeshBasicMaterial({map:TEX.flag,side:THREE.DoubleSide});
  setLevel(0); cam.dist=fitDist();
  let last=performance.now();
  renderer.setAnimationLoop(now=>{ const dt=Math.min((now-last)/1000,1/30); last=now; advance(dt); renderer.render(scene,camera); });
}
let booted=false; const once=()=>{ if(!booted){ booted=true; boot(); } };
(document.fonts&&document.fonts.load?document.fonts.load('700 40px "BIZ UDPGothic"','ピタゴラ６１２３'):Promise.resolve()).then(once,once); setTimeout(once,1500);

</script>
</body>
</html>
