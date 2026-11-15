import * as C from 'cannon-es'; import fs from 'fs';
const rd=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
export const G=new Function('C',rd('sim.js')+rd('levels.js')+rd('gen.js')+';return {SHOWCASE,CFG,GEN,BOARD,PARTS,createFloorSim,P,LEVELS,SAMPLE,planMachine,verifyMachine,generateMachine,makePuzzle,makeRng}')(C);
export {C};
export const run=(l,eps)=>{ const s=G.createFloorSim(C,l,eps||0); while(s.status==='run') s.step(); return {st:s.status,why:s.failWhy,t:+s.t.toFixed(2),rung:s.rung.size}; };
