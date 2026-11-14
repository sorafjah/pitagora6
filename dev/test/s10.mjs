import base from './s9.mjs';
export default async function(pg,out){
  const orig=pg.click.bind(pg);
  pg.click=async(sel)=>{ try{ await orig(sel,{timeout:20000}); }catch(e){ out.err=(out.err||'')+` [click ${sel} @lv${await pg.evaluate(()=>__game.state.level+':'+__game.state.mode+':'+__game.state.status)}]`; throw e; } };
  try{ await base(pg,out); }catch(e){}
}
