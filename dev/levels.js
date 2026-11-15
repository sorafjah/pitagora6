// レベル1〜3は「パーツのチュートリアル」。どのレベルも、新しいパーツを使わないと ゴールに とどかない ように おいてある
// new＝このレベルで はじめて出てくるパーツ（NEWの印がつく）
const LEVELS = [
  { tab:'1', mission:'<ruby>新<rt>あたら</rt></ruby>しい パーツ：<b>さか</b>と<b>かべ</b>。さかの たかさを かえて、かべで <ruby>玉<rt>たま</rt></ruby>の <ruby>向<rt>む</rt></ruby>きを かえよう',
    allow:['wall'], new:['wall'], newFixed:['ramp'],
    parts:[ P('ramp',4,13,0,0,'pos'), P('goal',13.5,5,0,0,true) ] },
  { tab:'2', mission:'<ruby>新<rt>あたら</rt></ruby>しい パーツ：<b>ドミノ</b>と<b>たま</b>。<ruby>赤<rt>あか</rt></ruby>い <ruby>玉<rt>たま</rt></ruby>は とちゅうで とまるよ。ドミノで つないで、<ruby>玉<rt>たま</rt></ruby>を おして ゴールへ',
    allow:['domino5','domino','ball'], new:['domino5','domino','ball'],
    parts:[ P('ramp',3,9,0,0,true), P('goal',22.5,9,0,0,true) ] },
  { tab:'3', mission:'<ruby>新<rt>あたら</rt></ruby>しい パーツ：<b>ばね</b>と<b>てっきん</b>。てっきんを 2こ ならすと ゴールの さくが ひらくよ。ばねで ゴールへ とばそう',
    allow:['chime','spring'], new:['chime','spring'],
    parts:[ P('ramp',3,4,0,0,true), P('goal',20,14,0,2,true) ] },
  { tab:'じゆう', free:true, mission:'すきな そうちを つくろう', allow:['ramp','ball','wall','domino','domino5','spring','chime'],
    parts:[] }
];
// じゆうモードの最初に置いてある「みほん」
const SAMPLE = [ P('ramp',3,13,0,1), P('domino5',9.5,13), P('domino5',14.5,13), P('ball',17.8,13), P('spring',19.5,13,6,1),
  P('chime',19.5,10,0,0), P('chime',19.5,8,0,2), P('chime',19.5,6,0,4), P('spring',19.5,3,12,1), P('chime',16,3,6,5), P('chime',13.5,3,6,7), P('goal',9,3) ];
const FREE_EMPTY = [ P('ramp',4,9,0,1), P('goal',22,9) ];

// 「みる」モードの 完成品（どれも 計算で成功を たしかめてある。test/t39.mjs）
const r2_=v=>Math.round(v*100)/100;
const SHOWCASE = [
  { name:'ドミノ だいこうしん', desc:'ドミノが カーブを まがって、さいごに <ruby>玉<rt>たま</rt></ruby>を おすよ',
    parts:(()=>{ const L=[P('ramp',2.5,15,0,0), P('domino5',8,15,0)];
      for(let th=0;th<=90;th+=15){ const a=th*Math.PI/180; L.push(P('domino',r2_(11+3*Math.sin(a)),r2_(12+3*Math.cos(a)),th/15)); }   // 1まいずつ 円の上に
      L.push(P('domino5',14,9,6));
      for(let ph=0;ph<=90;ph+=15){ const a=ph*Math.PI/180; L.push(P('domino',r2_(17-3*Math.cos(a)),r2_(6-3*Math.sin(a)),6-ph/15)); }
      L.push(P('domino5',20,3,0), P('ball',23.5,3), P('goal',26,3)); return L; })() },
  { name:'かえるの うた', desc:'ばねで とんだ <ruby>玉<rt>たま</rt></ruby>が てっきんの <ruby>上<rt>うえ</rt></ruby>を とおって、<ruby>曲<rt>きょく</rt></ruby>を ひくよ',
    // 玉の速さが だんだん おそくなるので、同じ リズムに なるように てっきんの 間を だんだん せまくしてある
    parts:[P('ramp',2.5,4,-6,0), P('spring',2.5,9,0,2), P('chime',5.5,9,6,0), P('chime',8,9,6,1), P('chime',10.5,9,6,2), P('chime',13,9,6,3),
      P('chime',15.5,9,6,2), P('chime',17.5,9,6,1), P('chime',19.5,9,6,0), P('goal',24,9)] },
  { name:'ばね ぐるぐる', desc:'ばねで しかくく まわって、てっきんを 3こ ならすと ゴールの さくが ひらくよ',
    parts:[P('ramp',3,15,0,0), P('spring',9,15,6,1), P('chime',9,11,0,0), P('spring',9,4,0,1), P('chime',14,4,6,2), P('spring',20,4,-6,1), P('chime',20,8,0,4), P('goal',20,13,0,3)] },
  { name:'かべと ばね', desc:'かべで まがって、ばねで いきおいを つけて、また かべで まがるよ',
    parts:[P('ramp',3,15,0,2), P('wall',10,15,3), P('chime',9,12.5,0,2), P('wall',9,8,3), P('spring',14,9,-6,1), P('wall',14,15.5,-3), P('chime',18,14.5,6,4), P('goal',23,14.5)] },
  { name:'ぜんぶ のせ', desc:'さか・ドミノ・<ruby>玉<rt>たま</rt></ruby>・ばね・てっきんを ぜんぶ つかった そうち', parts:SAMPLE }
];
// 「みる」「なおして ゴール」も 同じ しくみ（layouts[番号]）で うごかすための わく。中身は あとから 入れる
const LV_FREE = 3, LV_WATCH = 4, LV_FIX = 5;
LEVELS.push({ tab:'みる', watch:true, mission:'', allow:[], parts:SHOWCASE[0].parts },
            { tab:'なおして ゴール', fix:true, mission:'', allow:[], parts:[] });
