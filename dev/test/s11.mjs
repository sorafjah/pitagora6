const scr=(pg,x,z,y)=>pg.evaluate(([x,z,y])=>__game.api.screenOf(x,z,y),[x,z,y||0]);
async function dragTo(pg,from,to){ await pg.mouse.move(from.x,from.y); await pg.mouse.down(); await pg.mouse.move((from.x+to.x)/2,(from.y+to.y)/2,{steps:3}); await pg.mouse.move(to.x,to.y,{steps:3}); await pg.mouse.up(); }
const run=pg=>pg.evaluate(()=>{ const a=__game.api; let s; for(let i=0;i<300;i++){ s=a.tick(10,1/60); if(s.mode==='done') break; } return s.status; });
const banner=pg=>pg.evaluate(()=>document.getElementById('bannerTxt').textContent);
const waitGen=pg=>pg.waitForFunction(()=>!__game.api.busy,null,{timeout:60000});
const C=async(pg,sel)=>pg.click(sel,{timeout:20000});
export default async function(pg,out){
  await pg.waitForTimeout(500); await pg.screenshot({path:'h_home.png'});
  out.homeVisible=await pg.isVisible('#home');
  // れんしゅう レベル1
  await C(pg,'#home [data-go=lesson][data-n="0"]'); out.helpSub=await pg.textContent('#helpSub'); await pg.screenshot({path:'h_l1help.png'});
  await C(pg,'#startBtn'); await pg.evaluate(()=>__game.api.tick(60)); await pg.screenshot({path:'h_l1.png'});
  out.lvl=await pg.evaluate(()=>__game.state.level);
  // 🏠 → みる
  await C(pg,'#homeBtn'); out.homeAgain=await pg.isVisible('#home');
  await C(pg,'#home [data-go=watch]'); await C(pg,'#startBtn'); await pg.evaluate(()=>__game.api.tick(60)); await pg.screenshot({path:'h_watch0.png'});
  const res=[]; for(let i=0;i<5;i++){ await C(pg,'#go'); res.push(await run(pg)); if(i===1){ await pg.evaluate(()=>__game.api.tick(40)); await pg.screenshot({path:'h_watch_win.png'}); }
    await C(pg,'#bannerBtn'); await pg.evaluate(()=>__game.api.tick(5)); }
  out.watch=res.join(','); out.watchI=await pg.evaluate(()=>__game.state.watchI);
  // ドミノの パターンで タップしても えらべない
  await pg.evaluate(()=>{ __game.api.showWatch(0); __game.api.tick(30); }); const p=await scr(pg,8,15,0.5); await pg.mouse.click(p.x,p.y); out.watchSel=await pg.evaluate(()=>__game.state.sel);
  // おまかせ
  const rnd=[]; for(let i=0;i<3;i++){ await pg.click('.wbtn >> text=おまかせ'); await waitGen(pg); await pg.evaluate(()=>__game.api.tick(30)); if(i===0) await pg.screenshot({path:'h_random.png'}); await C(pg,'#go'); rnd.push(await run(pg)); await C(pg,'#bannerBtn'); }
  out.random=rnd.join(',');
  // つくるで かえる
  await pg.click('.wbtn >> text=つくるで かえる'); out.afterEdit=await pg.evaluate(()=>[__game.state.level,__game.api.getLayout().length]);
  // なおして ゴール
  for(const n of [1,2,3]){
    await C(pg,'#homeBtn'); await C(pg,`#home [data-go=fix][data-n="${n}"]`); await waitGen(pg); await C(pg,'#startBtn'); await pg.evaluate(()=>__game.api.tick(60));
    if(n===2) await pg.screenshot({path:'h_fix.png'});
    await C(pg,'#go'); const f=await run(pg); await C(pg,'#bannerBtn');
    // 1こだけ じっさいの ドラッグと ↺↻ で もどし、のこりは 答えで もどす
    const fx=await pg.evaluate(()=>__game.api.fix()); const an=fx.answer[0]; const L=await pg.evaluate(()=>__game.api.getLayout()); const part=L[an.i];
    await dragTo(pg,await scr(pg,part.x,part.z,0.2),await scr(pg,an.x,an.z,0.2));
    let rot=(await pg.evaluate(()=>__game.api.getLayout()))[an.i].rot, guard=0;
    while(rot!==an.rot&&guard++<24){ await C(pg,'#rotL'); rot=(await pg.evaluate(i=>__game.api.getLayout()[i].rot,an.i)); }
    const moved=(await pg.evaluate(()=>__game.api.getLayout()))[an.i];
    if(n===2){ await pg.click('#hintBtn'); await pg.evaluate(()=>__game.api.tick(20)); await pg.screenshot({path:'h_fixhint.png'}); }
    let one='-'; if(n===1){ await C(pg,'#go'); one=await run(pg); await C(pg,'#bannerBtn'); }
    await pg.evaluate(()=>__game.api.solveFix()); await C(pg,'#go'); const w=await run(pg); const bt=await banner(pg);
    out['fix'+n]={unsolved:f, dragged:[moved.x===an.x&&moved.z===an.z, moved.rot===an.rot, moved.type], oneDragRun:one, solved:w, banner:bt};
    if(n===1){ await pg.evaluate(()=>__game.api.tick(40)); await pg.screenshot({path:'h_fixwin.png'}); }
  }
  await C(pg,'#homeBtn'); await C(pg,'#homeHelp'); await pg.screenshot({path:'h_homehelp.png'}); await C(pg,'#startBtn');
  out.homeStars=await pg.evaluate(()=>[...document.querySelectorAll('#home [data-go=lesson]')].map(b=>b.textContent).join('|'));
}
