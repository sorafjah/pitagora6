export default async function(pg,out){
  const sizes=[[667,311,'pl'],[375,553,'pp'],[820,1180,'ip'],[1180,820,'il']];
  for(const [w,h,n] of sizes){ await pg.setViewportSize({width:w,height:h}); await pg.evaluate(()=>__game.api.home()); await pg.waitForTimeout(300); await pg.screenshot({path:`v_${n}_home.png`});
    await pg.evaluate(()=>__game.api.enter('lesson',0)); await pg.waitForTimeout(200); await pg.screenshot({path:`v_${n}_help.png`}); await pg.evaluate(()=>{ __game.api.closeHelp(); __game.api.tick(90); }); await pg.screenshot({path:`v_${n}_l1.png`});
    out[n]=await pg.evaluate(()=>{ const r=id=>document.getElementById(id).getBoundingClientRect(); return {mission:[r('mission').left|0,r('mission').bottom|0], top:r('top').right|0, cardsH:document.querySelector('.cards').getBoundingClientRect().height|0}; }); }
}
