import {G,C} from './lib2.mjs'; const P=G.P; const r2=v=>Math.round(v*100)/100;
export function det(L,label){ const out=[]; let T=0; for(const e of [0,0.02,-0.02,0.04,-0.04]){ const q=G.createFloorSim(C,L,e); while(q.status==='run') q.step(); out.push(q.status==='win'?'○':'×'+q.failWhy); if(!e) T=q.t; } console.log(label,out.join(''),'t='+T.toFixed(1),'parts',L.length); }
// ドミノ だいこうしん
const dom=[P('ramp',2.5,15,0,0), P('domino5',8,15,0)];
for(let th=0;th<=90;th+=15){ const a=th*Math.PI/180; dom.push(P('domino',r2(11+3*Math.sin(a)),r2(12+3*Math.cos(a)),th/15)); }
dom.push(P('domino5',14,9,6));
for(let ph=0;ph<=90;ph+=15){ const a=ph*Math.PI/180; dom.push(P('domino',r2(17-3*Math.cos(a)),r2(6-3*Math.sin(a)),6-ph/15)); }
dom.push(P('domino5',20,3,0), P('ball',23.5,3), P('goal',26,3));
det(dom,'domino'); console.log(JSON.stringify(dom.map(p=>[p.type,p.x,p.z,p.rot,p.opt])));
// ばね ぐるぐる：四角く まわって てっきん3こ → さくつきゴール
const spr=[P('ramp',3,15,0,0), P('spring',9,15,6,1), P('chime',9,11,0,0), P('spring',9,4,0,1), P('chime',14,4,6,2), P('spring',20,4,-6,1), P('chime',20,8,0,4), P('goal',20,13,0,3)];
det(spr,'spring');
// かべ ジグザグ
const zig=[P('ramp',3,15,0,2), P('wall',11,15.4,3), P('wall',11,4,-3), P('wall',19,4,3), P('wall',19,14.5,-3), P('goal',25,14.5)];
det(zig,'zigzag');
