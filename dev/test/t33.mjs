import {G,C,run} from './lib2.mjs';
const res={1:[0,0],2:[0,0],3:[0,0]}; let ms=[];
for(let seed=1;seed<=40;seed++){ const a=Date.now(); const g=G.generateMachine(C,seed,{zMax:14}); if(!g) { console.log('gen null',seed); continue; }
  for(const n of [1,2,3]){ const pz=G.makePuzzle(C,g.layout,n,G.makeRng(seed*7+n)); res[n][1]++; if(pz){ res[n][0]++;
      // 答えどおりに もどせば成功するか
      const L=pz.layout.map(p=>Object.assign({},p)); for(const an of pz.answer){ Object.assign(L[an.i],{x:an.x,z:an.z,rot:an.rot}); } if(run(L).st!=='win') console.log('answer fails!',seed,n);
      // おきばの パーツが z>=15 に あり、ほかは z<=14 か
      if(pz.layout.some(p=>!p.tray&&p.z>14.6)) console.log('overlap tray', seed); } }
  ms.push(Date.now()-a); }
console.log(res, 'avg ms', (ms.reduce((a,b)=>a+b)/ms.length).toFixed(0), 'max', Math.max(...ms));
