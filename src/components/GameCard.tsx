import { Link } from 'react-router-dom'
import type { Game } from '../data/games'
export function GameCard({ game, index }: { game: Game; index: number }) {
  const content = <><div className="game-card-top"><span className={`game-emoji ${game.status === 'coming' ? 'muted' : ''}`}>{game.emoji}</span><span className={game.status === 'available' ? 'status-live' : 'status-soon'}>{game.status === 'available' ? <><i /> NOW PLAYING</> : 'COMING SOON'}</span></div><div className="game-card-copy"><h3>{game.title}</h3><p>{game.description}</p></div><div className="game-card-bottom"><span>{game.status === 'available' ? '现在开始' : '新游戏正在路上'}</span><span className="card-arrow">↗</span></div></>
  return game.status === 'available' ? <Link className="game-card game-card-active" to={`/games/${game.slug}`} style={{ animationDelay: `${index * 90}ms` }}>{content}</Link> : <article className="game-card game-card-soon" style={{ animationDelay: `${index * 90}ms` }}>{content}</article>
}
