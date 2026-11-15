import {G,C,run} from './lib2.mjs';
const zMax=+process.argv[2]||17; let ok=0, plans=0, nulls=0, simMs=0, sims=0; const t0=Date.now(); const kinds={};
const rng=G.makeRng(123);
for(let i=0;i<300;i++){ const L=G.planMachine(rng,{zMax}); if(!L){ nulls++; continue; } plans++;
  const a=Date.now(); const r=run(L); simMs+=Date.now()-a; sims++; if(r.st==='win'){ ok++; L.forEach(p=>kinds[p.type]=(kinds[p.type]||0)+1); } }
console.log({zMax,nulls,plans,win:ok,rate:(ok/plans).toFixed(2),avgSimMs:(simMs/sims).toFixed(0),total:Date.now()-t0,kinds});
// generateMachine を何回か
let tt=[]; for(let s=1;s<=10;s++){ const a=Date.now(); const g=G.generateMachine(C,s,{zMax}); tt.push(g?`${g.tries}回/${Date.now()-a}ms/${g.layout.length}こ`:'null'); }
console.log(tt.join('  '));
