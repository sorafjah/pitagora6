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

