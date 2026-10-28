const keywords = [
  ['Toilet', ['拉屎', '如厕', '厕所', '便便', 'トイレ', '화장실', 'toilet', 'bathroom', 'restroom']],
  ['PackUp', ['下班', '收拾', '回家', '仕事終了', '退勤', '帰宅', '퇴근', 'go home', 'finish work', 'home']],
  ['WorkStart', ['上班', '开工', '开始工作', '仕事開始', '出勤', '업무 시작', '출근', 'start work', 'work']],
  ['Walking', ['走走', '散步', '活动', '走动', '出去', '散歩', '산책', 'walk', 'walking']],
  ['Stretch', ['伸懒腰', '拉伸', '伸展', 'ストレッチ', '스트레칭', 'stretch', 'stretching']],
  ['Eating', ['吃饭', '用餐', '早餐', '午饭', '晚饭', '食事', 'ご飯', '식사', 'eat', 'lunch', 'dinner', 'breakfast']],
  ['Water', ['喝水', '饮水', '补水', '水分補給', '水を飲', '물 마시', '수분', 'water']],
  ['Window', ['透气', '通风', '窗', '換気', '환기', 'fresh air', 'ventilate']],
];
function selectScene(message) {
  const normalized = message.toLowerCase();
  return keywords.find(([, words]) => words.some(word => /^[a-z ]+$/.test(word) ? new RegExp(`\\b${word}\\b`).test(normalized) : normalized.includes(word)))?.[0] || 'General';
}
function lastFrame(scene, width) {
  if (scene === 'Walking') {
    let x = -150, frame = 0;
    do { x = Math.fround(x + Math.fround(3.2)); frame++; } while (x <= width + 210);
    return frame - 1;
  }
  return ({ Toilet: 285, WorkStart: 330, Eating: 330, PackUp: 290 })[scene] || 360;
}
module.exports = { keywords, selectScene, lastFrame, interval: 33 };
