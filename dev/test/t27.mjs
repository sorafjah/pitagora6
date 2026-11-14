import {G,run} from './lib.mjs'; const {P}=G;
for(const [gx,gz] of [[13.5,5],[14,5],[13.5,5.5]]){ const goal=P('goal',gx,gz,0,0,true);
  const res={}; for(const o of [0,1,2]){ const w=[]; for(let x=11;x<=17;x+=0.5) for(const z of [12,12.5,13,13.5,14]) for(const r of [2,3,4]) if(run([P('ramp',4,13,0,o,'pos'),goal,P('wall',x,z,r)]).st==='win') w.push(`${x},${z},r${r}`); res[o]=w; }
  console.log('goal',gx,gz,'| ひくい',res[0].length,'ふつう',res[1].length,'たかい',res[2].length,'| r3 at z13:',res[2].filter(s=>s.endsWith(',13,r3')).map(s=>s.split(',')[0]).join(' '), '| nothing', [0,1,2].map(o=>run([P('ramp',4,13,0,o,'pos'),goal]).st).join(','));
  if(gx===13.5&&gz===5) console.log('ふつう wins:',res[1].join(' ')); }
