// ===== 設定（数値だけ直せば調整できます） =====
const CFG = {
  G: 25,                    // 重力
  H: 1/120,                 // 物理の1ステップ（秒）
  BALL_R: 0.5,              // 玉の半径（玉の直径＝1 がすべての基準）
  RAMP_L: 4, RAMP_W: 1.6,   // スタートの坂：長さと幅
  RAMP_H: [1, 2, 3],        // スタートの坂の高さ（ひくい・ふつう・たかい）
  RAMP_V: [4.6, 6.1, 7.4],  // 坂を下りきったときの玉の速さ（進む距離＝速さ×速さ÷(2×ROLL_DECEL)）
  ROLL_DECEL: 1.25,         // 床を転がる玉が遅くなる強さ（大きいほど早く止まる）
  WALL_L: 4, WALL_H: 0.9,   // かべの長さと高さ
  WALL_BOUNCE: 0.95,        // かべで はね返ったあとの速さの わりあい（0〜1）
  DOMINO: { h:1.8, t:0.24, w:1.0, m:0.4, step:1.0 },   // ドミノ：高さ・厚さ・幅・重さ・5まいセットの間隔
  DOMINO_PUSH_V: 3.5,       // たおれた ドミノに おされた玉の速さ
  SPRING_V: [5.5, 7.5, 9.5],    // ばねの強さ（よわい・ふつう・つよい）
  SPRING_HIT: 0.65,         // ばねの台のまん中から、この距離に入った玉を打ち出す
  CHIME_HIT: 0.7,           // てっきんの まん中の線から、この距離までの玉で鳴る
  GOAL_R: 1.15,             // ゴールの半径（この中に入った玉は吸いよせて止める）
  GATE_R: 1.55,             // ゴールの とびら（さく）の半径
  TIME_LIMIT: 25, MAX_PARTS: 40, MAX_DOMINO: 40, GRID: 0.5
};
// 床の大きさ。x＝左右（0〜W）、z＝おく・手前（0がおく、Hが手前）、y＝高さ
const BOARD = { W: 28, H: 18 };
const NOTE_NAMES = ['ド','レ','ミ','ファ','ソ','ラ','シ','ド'];
// w＝向いている方向の長さ、d＝横幅（えらぶときの当たり判定） rot＝15°きざみで回せる（24で1周） tip＝えらんだときに出る説明
const PARTS = {
  ramp:   { name:'さか', w:4.2, d:1.6, rot:24, max:3, opt:{ label:'たかさ', names:['ひくい','ふつう','たかい'] }, opt0:1,
            tip:'さかが <ruby>高<rt>たか</rt></ruby>いほど、<ruby>玉<rt>たま</rt></ruby>は とおくまで いくよ' },
  ball:   { name:'たま', w:1, d:1, max:3, tip:'おいた <ruby>玉<rt>たま</rt></ruby>は じっと している。ドミノや <ruby>玉<rt>たま</rt></ruby>が ぶつかると ころがりだすよ' },
  wall:   { name:'かべ', w:4, d:0.3, rot:24, tip:'かべに あたった <ruby>玉<rt>たま</rt></ruby>は はねかえるよ。↺ ↻ で ななめに すると、<ruby>玉<rt>たま</rt></ruby>の <ruby>向<rt>む</rt></ruby>きが かわる' },
  domino: { name:'ドミノ', w:0.24, d:1.0, rot:24, dom:1, tip:'ドミノは たおれて、つぎの ドミノや <ruby>玉<rt>たま</rt></ruby>を おすよ' },
  domino5:{ name:'ドミノ 5まい', w:4.24, d:1.0, rot:24, dom:5, tip:'ドミノ 5まいの セット。つなげて ならべると、とおくまで つたわるよ' },
  spring: { name:'ばね', w:1.6, d:1.6, rot:24, opt:{ label:'つよさ', names:['よわい','ふつう','つよい'] }, opt0:1,
            tip:'のった <ruby>玉<rt>たま</rt></ruby>を やじるしの <ruby>向<rt>む</rt></ruby>きに とばすよ。やじるしの かずが つよさ' },
  chime:  { name:'てっきん', w:1.8, d:0.5, rot:24, opt:{ label:'おと', names:NOTE_NAMES }, tip:'うえを <ruby>玉<rt>たま</rt></ruby>が とおると おとが なるよ。ボタンで おとを かえられる' },
  goal:   { name:'ゴール', w:2.6, d:2.6, max:1, tip:'ここに <ruby>玉<rt>たま</rt></ruby>が <ruby>入<rt>はい</rt></ruby>れば せいこう！' }
};
const ANG = k => (k||0)*Math.PI/12;
// 向き a のときの「前」は (cos a, 0, -sin a)。a=0 で右、a=90°で おく（画面の上）
const fwd = a => ({ x:Math.cos(a), z:-Math.sin(a) });
// 物理シミュレーション本体（Node.js でも同じコードで検証できるよう、描画と分けています）
// 床バージョンは完全な3Dの物理です（壁バージョンのような z 固定はしていません）
function createFloorSim(C, layout, eps){
  eps=eps||0; const R=CFG.BALL_R, H=CFG.H;
  const world=new C.World(); world.gravity.set(0,-CFG.G*(1+eps),0); world.solver.iterations=20; world.allowSleep=false;
  const M={}; ['ball','st','wall','dom','bar'].forEach(k=>M[k]=new C.Material(k));
  const cm=(a,b,f,r)=>world.addContactMaterial(new C.ContactMaterial(M[a],M[b],{friction:f,restitution:r}));
  cm('ball','st',0.5,0.1); cm('ball','wall',0.1,CFG.WALL_BOUNCE); cm('ball','dom',0,0.1); cm('dom','dom',0,0); cm('dom','st',0.6,0);
  cm('dom','wall',0.3,0); cm('ball','bar',0.1,0.7); cm('ball','ball',0.1,0.6); cm('dom','bar',0.3,0);
  const parts=[], dyn=[], events=[], deco=[], fires=[], rings=[], Y=new C.Vec3(0,1,0), Zax=new C.Vec3(0,0,1);
  const qy=a=>{ const q=new C.Quaternion(); q.setFromAxisAngle(Y,a); return q; };
  // 動かない箱。sx,sy,sz＝大きさ（全長）
  function box(x,y,z,sx,sy,sz,q,o){ o=o||{};
    const b=new C.Body({mass:0, material:M[o.mat||'st']}); b.addShape(new C.Box(new C.Vec3(sx/2,sy/2,sz/2))); b.position.set(x,y,z); if(q) b.quaternion.copy(q);
    world.addBody(b); parts.push({body:b,sx,sy,sz,look:o.look||'wood',idx:o.idx||0,pi:o.pi===undefined?-1:o.pi,gate:!!o.gate}); return b; }
  function addDyn(b,kind,extra){ world.addBody(b); dyn.push(Object.assign({body:b,kind},extra||{})); return b; }
  box(BOARD.W/2,-0.5,BOARD.H/2,BOARD.W+30,1,BOARD.H+30,null,{look:'ground'});
  // まわりの わく（玉が外に出ないように）
  const FT=0.6, FH=1.0;
  box(BOARD.W/2,FH/2,-FT/2,BOARD.W+FT*2,FH,FT,null,{look:'frame',mat:'wall'}); box(BOARD.W/2,FH/2,BOARD.H+FT/2,BOARD.W+FT*2,FH,FT,null,{look:'frame',mat:'wall'});
  box(-FT/2,FH/2,BOARD.H/2,FT,FH,BOARD.H,null,{look:'frame',mat:'wall'}); box(BOARD.W+FT/2,FH/2,BOARD.H/2,FT,FH,BOARD.H,null,{look:'frame',mat:'wall'});
  const balls=[], went=[], springs=[], ramps=[], chimes=[], gate=[]; let goal=null, nDom=0, gateNeed=0;
  const s={ world, parts, dyn, events, deco, fires, rings, t:0, steps:0, status:'run', failWhy:'', gateOpenT:-1, info:{} };
  const rung=new Set(), pushes=[], bounces=[], prevV=[];   // 鳴らした てっきん（ゴールの とびらを ひらくのに使う）
  function addBall(x,y,z,pi){ const b=new C.Body({mass:1,material:M.ball}); b.addShape(new C.Sphere(R)); b.position.set(x,y,z); b.linearDamping=0.02; b.angularDamping=0.02;
    b.addEventListener('collide',e=>{ const v=Math.abs(e.contact.getImpactVelocityAlongNormal());
      if(e.body.material===M.ball&&v>0.8) events.push({k:'clack'}); else if(e.body.material===M.wall&&v>1.5) events.push({k:'knock'}); });
    addDyn(b,'ball',{pi,n:balls.length}); balls.push(b); went.push(false); }
  function addDomino(x,z,a,pi){ const d=CFG.DOMINO, b=new C.Body({mass:d.m,material:M.dom}); b.addShape(new C.Box(new C.Vec3(d.t/2,d.h/2,d.w/2)));
    b.position.set(x,d.h/2+0.002,z); b.quaternion.copy(qy(a)); b.linearDamping=0.05; b.angularDamping=0.05;
    b.addEventListener('collide',e=>{ if(e.body.material!==M.st&&Math.abs(e.contact.getImpactVelocityAlongNormal())>1.2) events.push({k:'tok'});
      if(e.body.material===M.ball) pushes.push({dom:b,ball:e.body}); }); addDyn(b,'domino',{pi,i:nDom++}); }
  layout.forEach((p,pi)=>{ const a=ANG(p.rot), x=p.x, z=p.z, o=p.opt||0, f=fwd(a), wood=p.lock===true?'locked':'wood';
    // 部品の中の位置 (lx,ly,lz) → 世界の位置
    const W=(lx,ly,lz)=>[x+lx*f.x+lz*Math.sin(a), ly, z+lx*f.z+lz*Math.cos(a)];
    if(p.type==='ball') addBall(x+eps*0.5,R+0.003,z,pi);
    else if(p.type==='ramp'){ const L=CFG.RAMP_L, Wd=CFG.RAMP_W, h=CFG.RAMP_H[o], th=Math.atan(h/L), sn=Math.sin(th), cs=Math.cos(th), SL=Math.hypot(L,h), T=0.3;
      const q=qy(a).mult((()=>{ const t=new C.Quaternion(); t.setFromAxisAngle(Zax,-th); return t; })());
      box(...W(-sn*T/2,h/2-cs*T/2,0),SL,T,Wd,q,{look:wood,pi});                                      // すべる面
      for(const sd of [-1,1]) box(...W(sn*0.3,h/2+cs*0.3,sd*(Wd/2-0.075)),SL,1.0,0.15,q,{look:'rail',pi});   // 左右のガード
      box(...W(-L/2-0.1,(h+1)/2,0),0.2,h+1,Wd,qy(a),{look:'rail',pi});                               // うしろの かべ
      const ub=Math.max(0.1,h/2-0.35); box(...W(-L/4,ub/2,0),L/2,ub,Wd,qy(a),{look:'hidden',pi});      // 坂の下に玉がもぐらないように
      const xc=-L/2+0.55, ys=h*(L/2-xc)/L; const bp=W(xc+R*sn,ys+R*cs+0.003,0); addBall(bp[0]+eps*0.3*f.x,bp[1],bp[2]+eps*0.3*f.z,pi);
      ramps.push({ball:balls[balls.length-1],x,z,f,v:CFG.RAMP_V[o],done:false});
      deco.push({k:'ramp',x,z,a,h,pi,lock:p.lock}); }
    else if(p.type==='wall'){ const wb=box(x,CFG.WALL_H/2,z,CFG.WALL_L,CFG.WALL_H,0.3,qy(a),{look:wood,mat:'wall',pi});
      wb.addEventListener('collide',e=>{ const bi=balls.indexOf(e.body); if(bi>=0) bounces.push({bi,nx:-f.z,nz:f.x,wx:x,wz:z,ends:false}); }); }
    else if(p.type==='domino') addDomino(x,z,a,pi);
    else if(p.type==='domino5'){ for(let i=0;i<5;i++){ const w=W((i-2)*CFG.DOMINO.step,0,0); addDomino(w[0],w[2],a,pi); } }
    else if(p.type==='spring'){ springs.push({pi,x,z,f,v:CFG.SPRING_V[o],last:-1}); deco.push({k:'spring',x,z,a,o,pi}); }   // ばねは床の台。玉が乗ると矢印の向きに打ち出す
    else if(p.type==='chime'){ chimes.push({pi,x,z,f,o,last:-1}); deco.push({k:'chime',x,z,a,o,pi}); }   // てっきんは床にはった板。玉が上を通ると鳴る（当たり判定はなし）
    else if(p.type==='goal'){ goal={x,z}; gateNeed=o; deco.push({k:'goal',x,z,pi,lock:p.lock,need:o});
      // opt＞0 のゴールは「とびら」つき：てっきんを opt こ 鳴らすまで、まわりの さくが 玉を通さない
      if(o>0) for(let i=0;i<12;i++){ const t=i/12*Math.PI*2; gate.push(box(x+Math.cos(t)*CFG.GATE_R,0.5,z+Math.sin(t)*CFG.GATE_R,0.25,1.0,0.25,null,{look:'gate',mat:'wall',pi,gate:true})); } }
  });
  s.info={goal, balls:balls.length, gateNeed}; s.rung=rung;
  const movers=dyn.filter(d=>d.kind==='ball'||d.kind==='domino');
  let winT=0, stallT=0;
  s.step=function(){
    if(s.status!=='run') return;
    balls.forEach((b,i)=>{ prevV[i]=[b.velocity.x,b.velocity.z]; });
    world.step(H); s.t+=H; s.steps++;
    // かべ：玉を 鏡のように きれいに はねかえす（まさつで 向きや 速さが くるわないように するチート）
    while(bounces.length){ const q=bounces.shift(), b=balls[q.bi], pv=prevV[q.bi]; if(!pv) continue; let nx=q.nx, nz=q.nz;
      if((b.position.x-q.wx)*nx+(b.position.z-q.wz)*nz<0){ nx=-nx; nz=-nz; }   // かべの 玉がわを むく 向き
      const vn=pv[0]*nx+pv[1]*nz; if(vn>-0.3) continue;                      // かべに むかって いない／かべの はしに かすった
      const k=CFG.WALL_BOUNCE, ox=pv[0]-2*vn*nx, oz=pv[1]-2*vn*nz; b.velocity.set(ox*k,0,oz*k);
      b.angularVelocity.set(oz*k/R,0,-ox*k/R); }
    // ばね：どの向きから乗っても、玉を台のまん中に置き直してから矢印の向きに打ち出す（毎回同じ飛び方にするためのチート）
    for(const f of springs){ if(s.t-f.last<0.4) continue;
      for(const b of balls){ const bp=b.position; if(bp.y>R+0.3||Math.abs(bp.x-f.x)>CFG.SPRING_HIT||Math.abs(bp.z-f.z)>CFG.SPRING_HIT) continue;
        f.last=s.t; bp.set(f.x,R+0.003,f.z); b.velocity.set(f.f.x*f.v,0,f.f.z*f.v); b.angularVelocity.set(f.f.z*f.v/R,0,-f.f.x*f.v/R);
        fires.push({pi:f.pi,t:s.t}); events.push({k:'spring'}); break; } }
    // たおれてきた ドミノが 玉に あたったら、玉を ドミノの たおれる向きに 決まった速さで ころがす（毎回同じ動きにするチート）
    while(pushes.length){ const {dom,ball}=pushes.shift(); const w=dom.angularVelocity, bv=ball.velocity;
      if(Math.hypot(w.x,w.z)<1.0||Math.hypot(bv.x,bv.z)>2) continue;   // 立っている ドミノに 玉が ぶつかった ときは なにもしない
      const n=dom.quaternion.vmult(new C.Vec3(1,0,0)); let nx=n.x, nz=n.z; const l=Math.hypot(nx,nz)||1; nx/=l; nz/=l;
      // ドミノの あたまが うごく向き（＝たおれる向き）。その先に ある玉だけを おす（うしろの 玉は おさない）
      const tv=w.cross(new C.Vec3(0,1,0)); if(tv.x*nx+tv.z*nz<0){ nx=-nx; nz=-nz; }
      if((ball.position.x-dom.position.x)*nx+(ball.position.z-dom.position.z)*nz<0) continue;
      const V=CFG.DOMINO_PUSH_V; bv.set(nx*V,0,nz*V); ball.angularVelocity.set(nz*V/R,0,-nx*V/R); }
    // 坂を下りきった玉は、決まった速さにそろえる（毎回同じ距離を進むようにするチート）
    for(const r of ramps){ if(r.done) continue; const p=r.ball.position, v=r.ball.velocity;
      if(p.y<CFG.BALL_R+0.12&&(p.x-r.x)*r.f.x+(p.z-r.z)*r.f.z>CFG.RAMP_L/2-0.1){ r.done=true;
        if(v.x*r.f.x+v.z*r.f.z>1){ v.set(r.f.x*r.v,0,r.f.z*r.v); r.ball.angularVelocity.set(r.f.z*r.v/R,0,-r.f.x*r.v/R); } } }
    let inGoal=false; const open=gateNeed===0||s.gateOpenT>=0;
    balls.forEach((b,bi)=>{ const p=b.position, v=b.velocity;
      if(p.y<R+0.3) for(const c of chimes){ const dx=p.x-c.x, dz=p.z-c.z;
        if(Math.abs(dx*c.f.x+dz*c.f.z)<0.9&&Math.abs(dx*c.f.z-dz*c.f.x)<CFG.CHIME_HIT&&s.t-c.last>0.4){ c.last=s.t; rung.add(c.pi); rings.push({pi:c.pi,t:s.t,n:rung.size}); events.push({k:'bar',i:c.o}); } }
      if(p.y<R+0.08){ const sp=Math.hypot(v.x,v.z); if(sp>1e-6){ const k=Math.max(0,sp-CFG.ROLL_DECEL*H)/sp; v.x*=k; v.z*=k; b.angularVelocity.scale(k,b.angularVelocity); } }   // 床の ころがり抵抗
      // ゴールは玉を吸いよせる（チート）。いちども ころがって いない玉（ゴールに おいただけの玉）は かぞえない
      if(Math.hypot(v.x,v.z)>1.5) went[bi]=true;
      if(goal&&open&&went[bi]&&p.y<R+0.5){ const dx=goal.x-p.x, dz=goal.z-p.z;
        if(Math.hypot(dx,dz)<CFG.GOAL_R){ inGoal=true; v.x=v.x*0.9+dx*0.3; v.z=v.z*0.9+dz*0.3; b.angularVelocity.scale(0.9,b.angularVelocity); } } });
    // てっきんが そろったら とびらを ひらく（さくを 床の下へ）
    if(gateNeed>0&&s.gateOpenT<0&&rung.size>=gateNeed){ s.gateOpenT=s.t; for(const g of gate){ g.position.y=-50; g.aabbNeedsUpdate=true; } events.push({k:'gate'}); }
    winT=inGoal?winT+H:0;
    if(winT>0.4){ s.status='win'; events.push({k:'win'}); return; }
    let mx=0; for(const d of movers){ if(d.body.position.y<-3) continue; const v=d.body.velocity.length()+d.body.angularVelocity.length()*0.3; if(v>mx) mx=v; }
    stallT=(mx<0.25&&s.t>1)?stallT+H:0;
    if(stallT>1.5||s.t>CFG.TIME_LIMIT){ s.status='fail'; s.failWhy=(gateNeed>0&&s.gateOpenT<0)?'gate':'goal'; events.push({k:'fail'}); }
  };
  return s;
}
// お題（lock：true＝動かせない、'pos'＝場所と向きは そのままで せってい（たかさ など）だけ かえられる）
const P=(type,x,z,rot,opt,lock)=>({type,x,z,rot:rot||0,opt:opt||0,lock:lock||false});
