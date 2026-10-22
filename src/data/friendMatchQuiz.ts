import type { Question } from '../types'
export const questions: Question[] = [
  { question: '周末突然空出一天，你最想怎么过？', options: [{ text: '约人出门逛逛，哪怕没目的', scores: { social: 2, adventure: 1 } }, { text: '在家看剧打游戏，谁也别安排我', scores: { social: -2, spontaneity: 1 } }, { text: '把拖了很久的计划清掉', scores: { logic: 2, spontaneity: -1 } }] },
  { question: '朋友临时改约，你第一反应？', options: [{ text: '行啊，那就跟着变', scores: { spontaneity: 2, warmth: 1 } }, { text: '有点烦，但会配合重新安排', scores: { logic: 1, spontaneity: -1 } }, { text: '先问清楚原因，再决定还去不去', scores: { logic: 2, social: 1 } }] },
  { question: '群里有人起争执，你通常会？', options: [{ text: '出来打圆场，别伤和气', scores: { warmth: 2, social: 1 } }, { text: '不掺和，但私下关心在意的人', scores: { warmth: 1, sensitivity: 1, social: -1 } }, { text: '理性分析谁对谁错', scores: { logic: 2, warmth: -1, sensitivity: -1 } }] },
  { question: '面对一家新开的奇怪小店，你会？', options: [{ text: '立刻冲，越怪越想去', scores: { adventure: 2, spontaneity: 1 } }, { text: '先看评价和菜单，再决定', scores: { logic: 1, adventure: -1 } }, { text: '等朋友组织，一起去才好玩', scores: { social: 1, adventure: -1, warmth: 1 } }] },
  { question: '做重要决定时，你更依赖？', options: [{ text: '第一感觉，想太多会累', scores: { logic: -2, spontaneity: 1 } }, { text: '列利弊、查信息、做对比', scores: { logic: 2, adventure: -1 } }, { text: '问问信任的人，听完再定', scores: { warmth: 1, social: 1, logic: -1 } }] },
  { question: '朋友难过时，你更像？', options: [{ text: '陪着聊，先接住情绪', scores: { warmth: 2, sensitivity: 1 } }, { text: '帮 TA 分析问题、找解决办法', scores: { logic: 2, warmth: 1 } }, { text: '讲个笑话或拉去吃点好的', scores: { warmth: 1, social: 1, sensitivity: -1 } }] },
  { question: '你的旅行风格更接近？', options: [{ text: '说走就走，迷路也是风景', scores: { spontaneity: 2, adventure: 2 } }, { text: '攻略做满，时间线要清楚', scores: { logic: 2, spontaneity: -1 } }, { text: '跟着朋友走，去哪都行', scores: { social: 1, warmth: 1, spontaneity: 1 } }] },
  { question: '被误解时，你更可能？', options: [{ text: '算了不争，懂的人自然懂', scores: { spontaneity: 1, warmth: 1, sensitivity: 1 } }, { text: '当场解释清楚，把逻辑讲明白', scores: { logic: 2, social: 1 } }, { text: '表面没事，心里反复想很久', scores: { sensitivity: 2, warmth: 1, social: -1 } }] },
  { question: '你理想的聚会是？', options: [{ text: '热闹一点，人多才好玩', scores: { social: 2, adventure: 1, sensitivity: -1 } }, { text: '三五个人的小局，能深聊', scores: { warmth: 2, sensitivity: 1, social: -1 } }, { text: '各玩各的也行，安静不尴尬', scores: { social: -2, spontaneity: 1 } }] },
  { question: '你更怕哪种状态？', options: [{ text: '每天重复、没有新鲜感', scores: { adventure: 2, spontaneity: 1 } }, { text: '事情失控、计划全乱', scores: { logic: 2, spontaneity: -2 } }, { text: '被忽略、没人真正理解你', scores: { sensitivity: 2, warmth: 1, social: -1 } }] },
]
