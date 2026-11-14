import * as C from 'cannon-es'; import fs from 'fs';
const src=fs.readFileSync(new URL('../sim.js',import.meta.url),'utf8')+fs.readFileSync(new URL('../levels.js',import.meta.url),'utf8');
export const G=new Function('C',src+';return {CFG,createFloorSim,P,LEVELS,SAMPLE}')(C);
export const run=(l,eps)=>{ const s=G.createFloorSim(C,l,eps||0); while(s.status==='run') s.step(); return {st:s.status,why:s.failWhy,t:+s.t.toFixed(2),rung:s.rung.size,balls:s.dyn.filter(d=>d.kind==='ball').map(d=>[+d.body.position.x.toFixed(2),+d.body.position.z.toFixed(2)])}; };
