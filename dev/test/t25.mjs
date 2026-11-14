import {G,run} from './lib.mjs'; const {P,LEVELS}=G;
const B=LEVELS[2].parts;
console.log('nothing',run(B).st,run(B).why);
console.log('chimes only',JSON.stringify(run([...B,P('chime',7,4),P('chime',10,4,0,2)])));
const sp=[]; for(let x=7;x<=13;x+=0.5) for(const z of [3.5,4,4.5]) for(const r of [-2,-3,-4]) for(const o of [0,1,2]) { const res=run([...B,P('spring',x,z,r,o)]); if(res.st==='win') sp.push('BUG'); if(res.why==='goal') {} }
console.log('spring only wins (must be 0):',sp.length);
const w=[]; for(let x=7;x<=13;x+=0.5) for(const z of [3.5,4,4.5]) for(const r of [-2,-3,-4]) for(const o of [0,1,2]) { const res=run([...B,P('chime',6.5,4),P('chime',8,4,0,2),P('spring',x,z,r,o)]); if(res.st==='win') w.push(`${x},${z},r${r},o${o}`); }
console.log('chimes+spring wins',w.length,w.join(' '));
// てっきんの おき方：線から ずれた場合
for(const cz of [3.5,4,4.5,5]) console.log('chime z',cz,run([...B,P('chime',6.5,cz),P('chime',8,cz,0,2),P('spring',10,4,-3,1)]).st);
// ばねの あとの ななめの みちに てっきん
console.log('chimes on diagonal',run([...B,P('spring',10,4,-3,1),P('chime',13,7,-3),P('chime',16,10,-3,2)]).st);
// ドミノの セットが かさなった時（爆発しないか）
console.log('overlap',JSON.stringify(run([...LEVELS[1].parts,P('domino5',12,9),P('domino5',15.5,9),P('ball',20,9)])));
