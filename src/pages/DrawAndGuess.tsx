import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

type Artwork = { id: string; image: string; keyword: string | null; hint_length: number; created_at: string; revealed: boolean; is_mine: boolean; artist: string | null; attempts: number; correct: number; gave_up: number; likes: number; dislikes: number; my_guess: string | null; my_correct: boolean; my_reaction: number }
type Room = { id: string; created_at: string }
const playerKey = 'xiba-draw-player'

function getPlayerId() { let id = localStorage.getItem(playerKey); if (!id) { id = crypto.randomUUID(); localStorage.setItem(playerKey, id) } return id }
const apiBase = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY
async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  if (!apiBase || !apiKey) throw new Error('共享游戏后端尚未配置。请先设置 Supabase 项目，再邀请朋友加入。')
  const response = await fetch(`${apiBase}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) { const detail = await response.text(); throw new Error(detail.includes('fetch') ? '连接共享游戏服务失败，请稍后重试。' : `游戏服务暂时不可用（${response.status}），请检查后端配置。`) }
  return response.json() as Promise<T>
}

function DrawingBoard({ onSubmit, busy }: { onSubmit: (image: string) => Promise<void>; busy: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [color, setColor] = useState('#33342d')
  const [width, setWidth] = useState(8)
  const [eraser, setEraser] = useState(false)
  const [hasInk, setHasInk] = useState(false)
  const colors = ['#33342d', '#e76f51', '#e9b949', '#4b9b70', '#5386d8', '#9a6ac5', '#f2a8b9']
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - rect.left) * event.currentTarget.width / rect.width, y: (event.clientY - rect.top) * event.currentTarget.height / rect.height } }
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => { const canvas = canvasRef.current; if (!canvas) return; canvas.setPointerCapture(event.pointerId); const ctx = canvas.getContext('2d')!; const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = width; ctx.strokeStyle = eraser ? '#fffdf8' : color; ctx.lineTo(p.x + .1, p.y + .1); ctx.stroke(); setHasInk(true) }
  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!event.buttons) return; const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; const p = point(event); ctx.lineTo(p.x, p.y); ctx.stroke() }
  const clear = () => { const c = canvasRef.current; if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height); setHasInk(false) }
  const submit = async () => { const canvas = canvasRef.current; if (!canvas) return; const output = document.createElement('canvas'); output.width = 960; output.height = 600; const ctx = output.getContext('2d')!; ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, output.width, output.height); ctx.drawImage(canvas, 0, 0, output.width, output.height); await onSubmit(output.toDataURL('image/jpeg', .78)) }
  return <div className="dg-drawbox"><div className="dg-tools"><div className="dg-palette">{colors.map(c => <button type="button" key={c} className={`dg-color ${color === c && !eraser ? 'selected' : ''}`} style={{ '--swatch': c } as React.CSSProperties} aria-label={`选择${c}画笔`} onClick={() => { setColor(c); setEraser(false) }} />)}</div><label className="dg-size">笔迹 <input type="range" min="3" max="22" value={width} onChange={e => setWidth(Number(e.target.value))} /></label><button className={`dg-tool ${eraser ? 'active' : ''}`} onClick={() => setEraser(v => !v)} type="button">橡皮擦</button><button className="dg-tool" onClick={clear} type="button">清空</button></div><canvas ref={canvasRef} className="dg-canvas" width={960} height={600} onPointerDown={start} onPointerMove={draw} aria-label="画板" /><button className="primary-button dg-submit" type="button" disabled={!hasInk || busy} onClick={() => void submit()}>{busy ? '提交中…' : '画好了，匿名发布'} <span>↗</span></button></div>
}

export function DrawAndGuess() {
  const [params, setParams] = useSearchParams()
  const [room, setRoom] = useState<Room | null>(null)
  const [myKeyword, setMyKeyword] = useState('')
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [name, setName] = useState(() => localStorage.getItem('xiba-draw-name') ?? '')
  const [inputName, setInputName] = useState(name)
  const [guess, setGuess] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const playerId = useRef(getPlayerId())
  const roomId = params.get('room')
  const refresh = useCallback(async (id: string) => {
    try { const [r, feed, prompt] = await Promise.all([rpc<Room>('get_drawing_room', { p_room_id: id }), rpc<Artwork[]>('get_drawing_feed', { p_room_id: id, p_player_id: playerId.current }), name ? rpc<string>('get_own_drawing_prompt', { p_room_id: id, p_player_id: playerId.current }) : Promise.resolve('')]); setRoom(r); setArtworks(feed ?? []); setMyKeyword(prompt ?? ''); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : '读取游戏失败') }
  }, [name])
  useEffect(() => { if (roomId) { void refresh(roomId); const timer = window.setInterval(() => void refresh(roomId), 12000); return () => window.clearInterval(timer) } }, [roomId, refresh])
  const run = async (action: () => Promise<unknown>) => { setBusy(true); setError(''); try { await action(); if (roomId) await refresh(roomId) } catch (e) { setError(e instanceof Error ? e.message : '操作失败，请再试一次') } finally { setBusy(false) } }
  const makeRoom = async () => { const playerName = inputName.trim(); if (!playerName) { setError('先写下你的昵称吧'); return } setBusy(true); setError(''); try { const r = await rpc<string>('create_drawing_room', { p_player_name: playerName }); localStorage.setItem('xiba-draw-name', playerName); setName(playerName); setParams({ room: r }); } catch (e) { setError(e instanceof Error ? e.message : '创建失败') } finally { setBusy(false) } }
  const joinRoom = () => { const playerName = inputName.trim(); if (!playerName) { setError('先写下你的昵称吧'); return } localStorage.setItem('xiba-draw-name', playerName); setName(playerName); setError(''); if (!roomId) setError('请打开朋友分享的游戏链接') }
  const share = async () => { await navigator.clipboard?.writeText(location.href); setError('邀请链接已复制，发到你们的群聊就好。') }
  const submitGuess = (art: Artwork, giveUp: boolean) => run(() => rpc('submit_drawing_guess', { p_artwork_id: art.id, p_player_id: playerId.current, p_player_name: name, p_guess: guess[art.id] ?? '', p_give_up: giveUp }))
  const react = (art: Artwork, value: number) => run(() => rpc('react_to_drawing', { p_artwork_id: art.id, p_player_id: playerId.current, p_reaction: art.my_reaction === value ? 0 : value }))

  return <main className="dg-shell"><nav className="topbar"><Link className="brand" to="/"><span className="brand-mark">西</span><span>西八小站<span className="brand-dot">.</span></span></Link><Link className="back-home" to="/">← 回到小站</Link></nav><header className="dg-hero"><p className="eyebrow"><span>✳</span> EVERYONE CAN JOIN, ANYTIME</p><h1>你画我猜，<em>慢慢玩。</em></h1><p>各自画一幅，有空就来猜。画作和猜测都会留在这轮里，<br className="dg-desktop" />不用凑齐八个人，也不用同时在线。</p></header>
    {!roomId ? <section className="dg-entry"><div className="dg-entry-icon">🖍️</div><h2>开一轮新的画画接龙</h2><p>每个人进入时都会抽到自己的关键词。开局后把链接发进群里，大家有空就来画、来猜。</p><label className="dg-name-label">你的昵称<input value={inputName} maxLength={16} onChange={e => setInputName(e.target.value)} placeholder="怎么称呼你？" /></label><button className="primary-button" disabled={busy} onClick={() => void makeRoom()}>{busy ? '正在开局…' : '开始这一轮，抽我的词'} <span>↗</span></button></section> : <>
      <section className="dg-roombar"><div><p className="eyebrow"><span>{room?.id ? '你的专属关键词' : '正在连接这一轮'}</span></p><h2>{artworks.some(art => art.is_mine) ? '画作已提交 ✨' : myKeyword || '正在抽取关键词…'}</h2><p>每个人抽到的词不同；猜画只显示字数，猜中或放弃后才揭晓。</p></div><button type="button" className="share-button" onClick={() => void share()}>邀请朋友 ↗</button></section>
      {!name ? <section className="dg-join"><label className="dg-name-label">留下你的昵称<input value={inputName} maxLength={16} onChange={e => setInputName(e.target.value)} placeholder="怎么称呼你？" /></label><button className="primary-button" onClick={joinRoom}>进入这一轮 <span>→</span></button></section> : <>
        <section className="dg-paint-section"><div className="dg-section-title"><div><p className="eyebrow"><span>01</span> DRAW IT YOUR WAY</p><h2>先来画一幅</h2></div><span>画完匿名发布，朋友们来猜</span></div>{artworks.some(art => art.is_mine) ? <p className="dg-empty">你的作品已经匿名发布啦。看看朋友们画了什么，猜对或放弃后还能给作品点赞、踩哦。</p> : myKeyword ? <DrawingBoard busy={busy} onSubmit={image => run(() => rpc('submit_drawing', { p_room_id: roomId, p_player_id: playerId.current, p_player_name: name, p_image: image }))} /> : <p className="dg-empty">正在为你准备一个新关键词…</p>}</section>
        <section className="dg-gallery"><div className="dg-section-title"><div><p className="eyebrow"><span>02</span> TAKE A GUESS</p><h2>看看大家画了什么 <i>{artworks.length}</i></h2></div><button className="dg-refresh" onClick={() => void refresh(roomId)}>↻ 刷新</button></div>{artworks.length === 0 ? <p className="dg-empty">还没有画作，画下第一笔吧！</p> : <div className="dg-art-grid">{artworks.map(art => <article className="dg-art-card" key={art.id}><img src={art.image} alt={art.revealed ? `${art.artist}画的作品` : '朋友的匿名画作'} /><div className="dg-art-info">{art.revealed ? <><p className="dg-reveal">由 <strong>{art.artist}</strong> 创作 · 答案「{art.keyword}」</p><div className="dg-rating"><span>猜中 {art.correct} · 放弃 {art.gave_up}</span>{!art.is_mine && <div><button className={art.my_reaction === 1 ? 'picked' : ''} onClick={() => void react(art, 1)} aria-label="点赞">👍 {art.likes}</button><button className={art.my_reaction === -1 ? 'picked' : ''} onClick={() => void react(art, -1)} aria-label="踩">👎 {art.dislikes}</button></div>}</div></> : <><p className="dg-anon">匿名画作 · {art.hint_length} 个字</p>{art.my_guess !== null ? <div className="dg-result">{art.my_correct ? '🎉 猜中了！' : art.my_guess === '' ? '你放弃了这一题' : `你的答案「${art.my_guess}」不太对` }<button onClick={() => void submitGuess(art, true)}>揭晓画者 →</button></div> : <div className="dg-guess"><input maxLength={40} placeholder="你觉得画的是什么？" value={guess[art.id] ?? ''} onChange={e => setGuess(v => ({ ...v, [art.id]: e.target.value }))} /><button disabled={!guess[art.id]?.trim() || busy} onClick={() => void submitGuess(art, false)}>猜</button><button className="dg-giveup" disabled={busy} onClick={() => void submitGuess(art, true)}>放弃</button></div>}</>}</div></article>)}</div>}</section>
      </>}
    </>}{error && <div className={`dg-message ${error.includes('复制') ? 'success' : ''}`}>{error}<button onClick={() => setError('')} aria-label="关闭">×</button></div>}<footer className="dg-footer">猜中或放弃后才能揭晓作者 · 每幅画最多猜一次 · 有空再回来继续 <span>✳</span></footer></main>
}
