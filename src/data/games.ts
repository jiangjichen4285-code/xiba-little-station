export type Game = { slug: string; emoji: string; title: string; description: string; status: 'available' | 'coming' }
export const games: Game[] = [
  { slug: 'friend-match', emoji: '💞', title: '你和谁最契合？', description: '10 道轻松情境题，测出八人里和你最同频的人。', status: 'available' },
  { slug: 'coming-soon-1', emoji: '🎧', title: '我们的默契歌单', description: '敬请期待，一起发现下一首合唱曲目。', status: 'coming' },
  { slug: 'coming-soon-2', emoji: '🪄', title: '周末盲盒计划', description: '敬请期待，把“随便”变成真的好玩。', status: 'coming' },
]
