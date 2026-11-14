const scr=(pg,x,z,y)=>pg.evaluate(([x,z,y])=>__game.api.screenOf(x,z,y),[x,z,y||0]);
async function dragTo(pg,from,to){ await pg.mouse.move(from.x,from.y); await pg.mouse.down(); await pg.mouse.move((from.x+to.x)/2,(from.y+to.y)/2,{steps:3}); await pg.mouse.move(to.x,to.y,{steps:3}); await pg.mouse.up(); }
const run=pg=>pg.evaluate(()=>{ const a=__game.api; let s; for(let i=0;i<300;i++){ s=a.tick(10,1/60); if(s.mode==='done') break; } return s.status; });
const banner=pg=>pg.evaluate(()=>document.getElementById('bannerTxt').textContent);
async function place(pg,type,x,z,rotClicks){ await pg.click(`.pbtn[data-t=${type}]`); for(let i=0;i<Math.abs(rotClicks||0);i++) await pg.click(rotClicks>0?'#rotL':'#rotR');
  const L=await pg.evaluate(()=>__game.api.getLayout()), p=L[L.length-1]; await dragTo(pg,await scr(pg,p.x,p.z,0.2),await scr(pg,x,z,0.2));
  return (await pg.evaluate(()=>__game.api.getLayout())).pop(); }
export default async function(pg,out){
  await pg.click('#startBtn'); await pg.evaluate(()=>__game.api.tick(90));
  out.l1sel=await pg.evaluate(()=>__game.state.sel); out.l1tip=(await pg.textContent('#tip')).slice(0,20);
  await pg.screenshot({path:'p_l1.png'});
  // さかは ドラッグしても うごかない
  await dragTo(pg,await scr(pg,4,13,1),await scr(pg,8,8,1)); out.rampAfterDrag=(await pg.evaluate(()=>__game.api.getLayout()))[0];
  await pg.click('#go'); out.l1fail=[await run(pg),await banner(pg)]; await pg.click('#bannerBtn');
  await pg.evaluate(()=>__game.api.select(0)); await pg.click('#optBtn'); await pg.click('#optBtn'); out.h=await pg.evaluate(()=>__game.api.getLayout()[0].opt);
  out.wall=await place(pg,'wall',14.5,13,3); await pg.evaluate(()=>__game.api.tick(20)); await pg.screenshot({path:'q_l1b.png'});
  await pg.click('#go'); out.l1=await run(pg); await pg.click('#bannerBtn'); await pg.evaluate(()=>__game.api.tick(60));
  // L2
  out.d1=await place(pg,'domino5',12,9); out.d2=await place(pg,'domino5',17,9); out.b=await place(pg,'ball',20,9);
  await pg.evaluate(()=>__game.api.tick(20)); await pg.screenshot({path:'r_l2.png'});
  await pg.click('#go'); out.l2=await run(pg); await pg.click('#bannerBtn'); await pg.evaluate(()=>__game.api.tick(60));
  // L3 まず ばねだけ（さくで はじかれる）
  out.s=await place(pg,'spring',10,4,-3);
  await pg.click('#go'); out.l3fail=[await run(pg),await banner(pg)]; await pg.evaluate(()=>{ __game.api.scrub(Math.floor(__game.rec.length*0.6)); __game.api.tick(2); }); await pg.screenshot({path:'s_l3fail.png'}); await pg.click('#bannerBtn');
  out.c1=await place(pg,'chime',6.5,4); out.c2=await place(pg,'chime',8,4);
  await pg.evaluate(()=>__game.api.tick(20)); await pg.screenshot({path:'t_l3.png'});
  await pg.click('#go'); out.l3=await run(pg); await pg.evaluate(()=>__game.api.tick(30)); await pg.screenshot({path:'u_l3win.png'}); await pg.click('#bannerBtn');
  out.free=await pg.evaluate(()=>{ const a=__game.api; a.tick(30); a.start(); let s; for(let i=0;i<300;i++){ s=a.tick(10,1/60); if(s.mode==='done') break; } return s.status; });
  out.palette=await pg.evaluate(()=>[...document.querySelectorAll('.pbtn')].map(b=>b.dataset.t).join(','));
}
