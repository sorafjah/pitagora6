import {G,run} from './lib.mjs'; const {P}=G;
for(const gx of [22.5,22]){
const B=[P('ramp',3,9,0,0,true),P('goal',gx,9,0,0,true)];
let bo=0; for(let x=12;x<=gx;x+=0.5) if(run([...B,P('ball',x,9)]).st==='win') bo++;
let w=0,t=0; const fails=[];
for(const a of [10,11,12,13]) for(const gap of [4.5,5,5.5,6]) for(const bx of [0.5,1,1.5,2,2.5]) { const ball=a+gap+2+bx; if(ball>gx+0.5) continue; t++; const r=run([...B,P('domino5',a,9),P('domino5',a+gap,9),P('ball',ball,9)]); if(r.st==='win') w++; else fails.push(`${a},${gap},${bx}->${r.balls[1][0]}`); }
// 3セット
let w3=0,t3=0; for(const a of [8,9]) for(const gap of [4.5,5]) { const c=a+2*gap; for(const bx of [0.5,1,1.5]){ const ball=c+2+bx; if(ball>gx+0.5) continue; t3++; if(run([...B,P('domino5',a,9),P('domino5',a+gap,9),P('domino5',c,9),P('ball',ball,9)]).st==='win') w3++; } }
// ずれ（z方向に0.5ずれたドミノ）
const r=run([...B,P('domino5',12,9.5),P('domino5',17,9),P('ball',20,9)]).st;
console.log('goal',gx,'ballOnly',bo,'2sets',w,'/',t,'3sets',w3,'/',t3,'zshift',r,'| fails',fails.join(' '));
}
