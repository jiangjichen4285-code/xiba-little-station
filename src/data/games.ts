export type Game = { slug: string; emoji: string; title: string; description: string; status: 'available' | 'coming' }
export const games: Game[] = [
  { slug: 'friend-match', emoji: '💞', title: '你和谁最契合？', description: '10 道轻松情境题，测出八人里和你最同频的人。', status: 'available' },
  { slug: 'mbti-test', emoji: '🪞', title: '你的性格底色', description: '16 个生活小场景，看看哪种性格画像最像现在的你。', status: 'available' },
  { slug: 'draw-and-guess', emoji: '🎨', title: '你画我猜 · 异步版', description: '每人抽到不同的词，各自画一幅；有空时来猜朋友的画。', status: 'available' },
]
