import { copyFile, mkdir } from 'node:fs/promises'

const routes = [
  'games/friend-match',
  'games/friend-match/result',
  'games/mbti-test',
  'games/draw-and-guess',
]

for (const route of routes) {
  const directory = `dist/${route}`
  await mkdir(directory, { recursive: true })
  await copyFile('dist/index.html', `${directory}/index.html`)
}

console.log(`Prepared ${routes.length} GitHub Pages route entry points.`)
