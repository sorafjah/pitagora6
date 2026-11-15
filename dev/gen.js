// ===== 完成品を ランダムに つくる（「おまかせ」「なおして ゴール」で使う） =====
// でたらめに置くと まず成功しないので、玉の「流れの型」にそって 1だんずつ つなげていく：
//   さか → （かべで まがる／ばねで とばす／ドミノで つなぐ／玉に ぶつける）×何回か → ゴール
// とちゅうの まっすぐな道には てっきんを置くことがある。てっきんが2こ以上なら、ゴールに さくを つけることもある。
// 置き方は「玉の速さと 進む距離」の かんたんな計算で決め、最後に createFloorSim で本当に成功するかを確かめる（だめなら作り直し）。
const GEN = {
  DECEL: 1.35,            // 計算用の ころがり抵抗（じっさいの ROLL_DECEL より少し大きめにして、よゆうを持たせる）
  STEPS: [3, 5],          // さかと ゴールの間に入れる だんの数（最小・最大）
  MIN_ARRIVE: { wall:3.0, spring:1.6, domino:2.4, ball:3.2, goal:0.9 },   // その パーツに着いたときに 最低ほしい速さ
  CHIME_P: 0.55,          // まっすぐな道に てっきんを置く わりあい
  GATE_P: 0.6,            // てっきん2こ以上のとき、ゴールに さくを つける わりあい
  TRIES: 400              // 1回の「つくる」で ためす 回数の上限
};
function makeRng(seed){ let a=seed>>>0; return ()=>{ a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
// 4つの向き（rot は15°きざみ。0＝右、6＝おく、-12＝左、-6＝手前）
const GDIR = [ {rot:0,x:1,z:0}, {rot:6,x:0,z:-1}, {rot:-12,x:-1,z:0}, {rot:-6,x:0,z:1} ];
// 計画を1つ作る（物理はまだ回さない）。うまく置けなければ null
function planMachine(rng, opt){
  opt=opt||{}; const zMax=opt.zMax||BOARD.H-1, xMin=1, xMax=BOARD.W-1, zMin=1;
  const RI=(a,b)=>a+Math.floor(rng()*(b-a+1)), pick=a=>a[Math.floor(rng()*a.length)], sn=v=>Math.round(v*2)/2;
  // 0.5マスの方眼で「使っている場所」をおぼえる（パーツ同士・玉の通り道が かさならないように）
  const GW=BOARD.W*2, GH=BOARD.H*2, occ=new Int16Array(GW*GH); let nid=1;
  function cells(fn){ const out=[]; for(let j=0;j<GH;j++) for(let i=0;i<GW;i++){ const x=(i+0.5)/2, z=(j+0.5)/2; if(fn(x,z)) out.push(j*GW+i); } return out; }
  const inRect=(cx,cz,w,d,a,m)=>(x,z)=>{ const dx=x-cx, dz=z-cz, f=fwd(a), lx=dx*f.x+dz*f.z, lz=dx*-f.z+dz*f.x; return Math.abs(lx)<=w/2+m&&Math.abs(lz)<=d/2+m; };
  const onLeg=(x0,z0,x1,z1,hw)=>(x,z)=>{ const vx=x1-x0, vz=z1-z0, L2=vx*vx+vz*vz||1e-9; let t=((x-x0)*vx+(z-z0)*vz)/L2; t=Math.max(0,Math.min(1,t)); return Math.hypot(x-x0-vx*t,z-z0-vz*t)<=hw; };
  const free=(cs,ok)=>cs.every(c=>occ[c]===0||(ok&&ok.includes(occ[c])));
  const mark=(cs,id)=>{ for(const c of cs) if(occ[c]===0) occ[c]=id; };
  const inside=(x,z,m)=>x-m>=xMin-0.01&&x+m<=xMax+0.01&&z-m>=zMin-0.01&&z+m<=zMax+0.01;
  const L=[]; let balls=0, chimes=0; const notes0=RI(0,3);
  const range=v=>v*v/(2*GEN.DECEL), vAfter=(v,s)=>Math.sqrt(Math.max(0,v*v-2*GEN.DECEL*s));
  // 1. スタートの さか
  const d0=pick(GDIR), o0=RI(0,2);
  const rx=sn(xMin+3+rng()*(xMax-xMin-6)), rz=sn(zMin+2+rng()*(zMax-zMin-4));
  const rc=cells(inRect(rx,rz,PARTS.ramp.w,PARTS.ramp.d,ANG(d0.rot),0.3)); if(!inside(rx,rz,2.3)) return null;
  const rid=nid++; mark(rc,rid); L.push(P('ramp',rx,rz,d0.rot,o0));
  let cx=rx+d0.x*2.1, cz=rz+d0.z*2.1, dir=d0, v=CFG.RAMP_V[o0], last=rid, lastLeg=-1, aligned=true;
  // つぎに進む向きは、先が ひろい ほうを えらびやすくする（ひろさの2じょうに 比例した わりあい）
  const roomy=(ds,x,z)=>{ const w=ds.map(d=>{ const r=d.x>0?xMax-x:d.x<0?x-xMin:d.z>0?zMax-z:z-zMin; return Math.max(0.01,r-2)**2; });
    let u=rng()*w.reduce((a,b)=>a+b,0); for(let i=0;i<ds.length;i++){ u-=w[i]; if(u<=0) return ds[i]; } return ds[ds.length-1]; };
  const nSteps=RI(GEN.STEPS[0],GEN.STEPS[1]); const used=new Set();
  // まっすぐな道（cx,cz から dir へ s だけ）を予約。とちゅうに てっきんを置くこともある
  function leg(s, targetId){
    const ex=cx+dir.x*s, ez=cz+dir.z*s; if(!inside(ex,ez,0.6)) return false;
    const lc=cells(onLeg(cx,cz,ex,ez,0.75)); if(!free(lc,[last,lastLeg,targetId])) return false;   // 入ってきた道とは、曲がり角で かさなってよい
    const id=nid++; mark(lc,id);
    if(s>=3.2&&rng()<GEN.CHIME_P&&L.filter(p=>p.type==='chime').length<4){ const t=sn(1.2+rng()*(s-2.6)), hx=sn(cx+dir.x*t), hz=sn(cz+dir.z*t);
      const crot=((dir.rot+6+12)%24+24)%24-12; L.push(P('chime',hx,hz,crot,(notes0+[0,2,4,7][chimes%4])%8)); chimes++; used.add('chime'); }
    lastLeg=id; return true; }
  for(let step=0; step<=nSteps; step++){
    const final=step===nSteps; let kinds=final?['goal']:['wall','wall','spring','spring','domino','domino','ball'];
    if(!final&&balls>=3) kinds=kinds.filter(k=>k!=='domino'&&k!=='ball');
    if(!aligned) kinds=kinds.filter(k=>k!=='ball');      // 玉どうしを ぶつけるのは、まっすぐ ぴったりの ときだけ（ずれると 向きが くるう）
    let done=false;
    for(let attempt=0; attempt<12&&!done; attempt++){
      const k=pick(kinds), minV=GEN.MIN_ARRIVE[k];
      // 床の はしまでの きょり（パーツの大きさの ぶんを ひく）で、道の長さを おさえる
      const room=(dir.x>0?xMax-cx:dir.x<0?cx-xMin:dir.z>0?zMax-cz:cz-zMin);
      const tail={wall:2.6, spring:1.0, domino:0, ball:0.8, goal:1.4}[k];
      const sets=(k==='domino'&&balls<3&&rng()<0.4)?2:1, span=sets*5-1;
      const sMax=Math.min((v*v-minV*minV)/(2*GEN.DECEL), room-tail-(k==='domino'?span+1.9:0));
      const sMin=k==='goal'?2.5:k==='spring'?1.6:2.0; if(sMax<sMin) continue;
      const s=sMin+rng()*(sMax-sMin), vh=vAfter(v,s), f=dir;
      if(k==='wall'){
        const nd=roomy([GDIR[(GDIR.indexOf(f)+1)%4],GDIR[(GDIR.indexOf(f)+3)%4]], cx+f.x*s, cz+f.z*s);
        const ux=f.x+nd.x, uz=f.z+nd.z, a=Math.atan2(-uz,ux), wr=Math.round(a/(Math.PI/12));
        const wx=sn(cx+f.x*(s+0.92)), wz=sn(cz+f.z*(s+0.92)); if(!inside(wx,wz,1.6)) continue;
        // かべに 玉の中心が ふれる位置（かべの線から 0.65 はなれた線）と、入ってくる道の交わる点 T
        const wf=fwd(ANG(wr)); let nx=-wf.z, nz=wf.x; if(nx*f.x+nz*f.z>0){ nx=-nx; nz=-nz; }   // かべの 玉がわを むく 向き
        const ox=wx+nx*(CFG.BALL_R+0.15), oz=wz+nz*(CFG.BALL_R+0.15);
        const den=f.x*wf.z-f.z*wf.x; if(Math.abs(den)<1e-6) continue;
        const t=((ox-cx)*wf.z-(oz-cz)*wf.x)/den; if(t<1.5) continue;
        const wc=cells(inRect(wx,wz,CFG.WALL_L,0.3,ANG(wr),0.35)), id=nid++;
        const save=occ.slice(); if(!free(wc,[last])){ continue; } mark(wc,id);
        if(!leg(t,id)){ occ.set(save); continue; }
        L.push(P('wall',wx,wz,wr)); used.add('wall');
        cx+=f.x*t; cz+=f.z*t; dir=nd; v=vAfter(v,t)*CFG.WALL_BOUNCE*0.97; last=id; aligned=false; done=true; }
      else if(k==='spring'){
        const sx=sn(cx+f.x*s), sz=sn(cz+f.z*s); if(!inside(sx,sz,1)) continue;
        if(Math.abs((sx-cx)*f.z-(sz-cz)*f.x)>0.3) continue;
        const nd=roomy(GDIR.filter(d=>d!==GDIR[(GDIR.indexOf(f)+2)%4]), sx, sz), so=RI(0,2);
        const sc=cells(inRect(sx,sz,1.6,1.6,0,0.3)), id=nid++, save=occ.slice(); if(!free(sc,[last])) continue; mark(sc,id);
        const ss=Math.abs((sx-cx)*f.x+(sz-cz)*f.z); if(!leg(ss,id)){ occ.set(save); continue; }
        L.push(P('spring',sx,sz,nd.rot,so)); used.add('spring');
        cx=sx+nd.x*0.8; cz=sz+nd.z*0.8; dir=nd; v=CFG.SPRING_V[so]; last=id; aligned=true; done=true; }
      else if(k==='domino'){
        const ex0=cx+f.x*s, ez0=cz+f.z*s;   // 1まいめの ドミノ
        const bx=sn(ex0+f.x*(span+1.3)), bz=sn(ez0+f.z*(span+1.3)); if(!inside(bx,bz,0.6)) continue;
        // ドミノと玉は「道の線」の上に ぴったり置く（横の ずれは 方眼に まるめる）
        const lat=f.x!==0?sn(cz):sn(cx);
        const items=[]; for(let i=0;i<sets;i++){ const c=s+2+i*5; items.push([f.x!==0?sn(cx+f.x*c):lat, f.x!==0?lat:sn(cz+f.z*c)]); }
        const bxx=f.x!==0?sn(cx+f.x*(s+span+1.3)):lat, bzz=f.x!==0?lat:sn(cz+f.z*(s+span+1.3));
        const dc=cells(onLeg(ex0,ez0,bxx,bzz,0.8)), id=nid++, save=occ.slice(); if(!free(dc,[last])) continue; mark(dc,id);
        if(!leg(s,id)){ occ.set(save); continue; }
        for(const it of items) L.push(P('domino5',it[0],it[1],f.rot)); L.push(P('ball',bxx,bzz)); balls++; used.add('domino');
        cx=bxx+f.x*0.5; cz=bzz+f.z*0.5; v=CFG.DOMINO_PUSH_V*0.95; last=id; aligned=true; done=true; }
      else if(k==='ball'){
        const bx=sn(cx+f.x*s), bz=sn(cz+f.z*s); if(!inside(bx,bz,0.6)) continue;
        if(Math.abs((bx-cx)*f.z-(bz-cz)*f.x)>1e-6) continue;
        const bc=cells(onLeg(bx,bz,bx,bz,0.8)), id=nid++, save=occ.slice(); if(!free(bc,[last])) continue; mark(bc,id);
        if(!leg(Math.max(0,s-1),id)){ occ.set(save); continue; }
        L.push(P('ball',bx,bz)); balls++; used.add('ball');
        cx=bx+f.x*0.5; cz=bz+f.z*0.5; v=vh*0.75; last=id; aligned=true; done=true; }
      else if(k==='goal'){
        const gx=sn(cx+f.x*s), gz=sn(cz+f.z*s); if(!inside(gx,gz,1.4)) continue;
        if(Math.abs((gx-cx)*f.z-(gz-cz)*f.x)>0.5) continue;
        const gc=cells(inRect(gx,gz,2.6,2.6,0,0.2)), id=nid++, save=occ.slice(); if(!free(gc,[last])) continue; mark(gc,id);
        if(!leg(Math.abs((gx-cx)*f.x+(gz-cz)*f.z),id)){ occ.set(save); continue; }
        const need=chimes>=2&&rng()<GEN.GATE_P?Math.min(chimes,3):0;
        L.push(P('goal',gx,gz,0,need)); done=true; }
    }
    if(!done) return null;
  }
  if(used.size<2) return null;   // 同じ しかけばかりだと つまらないので、2しゅるい以上
  return L;
}
// 本当に成功するかを物理で確かめる。少し条件をずらしても成功するものだけを合格にする
function verifyMachine(C, L){ for(const eps of [0,0.02]){ const s=createFloorSim(C,L,eps); while(s.status==='run') s.step(); if(s.status!=='win') return false; } return true; }
// 成功する完成品ができるまで 作り直す（tries 回まで）。できなければ null
function generateMachine(C, seed, opt){ const rng=makeRng(seed);
  for(let i=0;i<(opt&&opt.tries||GEN.TRIES);i++){ const L=planMachine(rng,opt); if(L&&verifyMachine(C,L)) return {layout:L, tries:i+1}; }
  return null; }
// 「なおして ゴール」：成功する完成品から いくつかの パーツを ぬいて、手前の「おきば」に ならべる
// 答えが かならず ある（もとの 置き方）。ぬいたままで 成功してしまう ものは つかわない
const TRAY_Z = 16.2;   // おきばの まん中（玉の通り道は zMax=14 までに おさえて作る）
function makePuzzle(C, L, n, rng){
  const cand=L.map((p,i)=>i).filter(i=>['wall','spring','domino5','ball','chime'].includes(L[i].type));
  for(let t=0;t<30;t++){
    const pickI=cand.slice().sort(()=>rng()-0.5).slice(0,n); if(pickI.length<n) return null;
    const puz=L.map(p=>Object.assign({},p,{lock:true})), answer=[];
    const ws=pickI.map(i=>PARTS[L[i].type].w+0.8), tot=ws.reduce((a,b)=>a+b,0); let x=BOARD.W/2-tot/2;
    pickI.forEach((i,k)=>{ const p=puz[i]; answer.push({i,x:p.x,z:p.z,rot:p.rot}); x+=ws[k]/2; p.x=Math.round(x*2)/2; p.z=TRAY_Z; p.rot=0; p.lock=false; p.tray=true; x+=ws[k]/2; });
    const s=createFloorSim(C,puz,0); while(s.status==='run') s.step(); if(s.status==='win') continue;
    return {layout:puz, answer}; }
  return null; }
