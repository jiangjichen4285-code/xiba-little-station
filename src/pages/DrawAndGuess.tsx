import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { friends } from '../data/friends'

type Artwork = { id: string; image: string; keyword: string | null; hint_length: number; created_at: string; revealed: boolean; is_mine: boolean; artist: string | null; attempts: number; correct: number; gave_up: number; likes: number; dislikes: number; my_guess: string | null; my_correct: boolean; my_reaction: number }
const playerKey = 'xiba-draw-player'

function getPlayerId() { let id = localStorage.getItem(playerKey); if (!id) { id = crypto.randomUUID(); localStorage.setItem(playerKey, id) } return id }
const apiBase = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY
async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  if (!apiBase || !apiKey) throw new Error('共享游戏后端尚未配置，请稍后再试。')
  const response = await fetch(`${apiBase}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error(`游戏服务暂时不可用（${response.status}），请稍后重试。`)
  return response.json() as Promise<T>
}

function DrawingBoard({ onSubmit, busy, prompt }: { onSubmit: (image: string, author: string) => Promise<boolean>; busy: boolean; prompt: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [color, setColor] = useState('#33342d')
  const [width, setWidth] = useState(8)
  const [eraser, setEraser] = useState(false)
  const [hasInk, setHasInk] = useState(false)
  const [author, setAuthor] = useState('')
  const colors = ['#33342d', '#e76f51', '#e9b949', '#4b9b70', '#5386d8', '#9a6ac5', '#f2a8b9']
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - rect.left) * event.currentTarget.width / rect.width, y: (event.clientY - rect.top) * event.currentTarget.height / rect.height } }
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => { const canvas = canvasRef.current; if (!canvas) return; canvas.setPointerCapture(event.pointerId); const ctx = canvas.getContext('2d')!; const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = width; ctx.strokeStyle = eraser ? '#fffdf8' : color; ctx.lineTo(p.x + .1, p.y + .1); ctx.stroke(); setHasInk(true) }
  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!event.buttons) return; const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; const p = point(event); ctx.lineTo(p.x, p.y); ctx.stroke() }
  const clear = () => { const c = canvasRef.current; if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height); setHasInk(false) }
  const submit = async () => { const canvas = canvasRef.current; if (!canvas || !author) return; const output = document.createElement('canvas'); output.width = 960; output.height = 600; const ctx = output.getContext('2d')!; ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, output.width, output.height); ctx.drawImage(canvas, 0, 0, output.width, output.height); if (await onSubmit(output.toDataURL('image/jpeg', .78), author)) { clear(); setAuthor('') } }
  return <div className="dg-drawbox"><p className="dg-prompt">你的关键词：<strong>{prompt || '正在抽取…'}</strong></p><div className="dg-tools"><div className="dg-palette">{colors.map(c => <button type="button" key={c} className={`dg-color ${color === c && !eraser ? 'selected' : ''}`} style={{ '--swatch': c } as React.CSSProperties} aria-label={`选择${c}画笔`} onClick={() => { setColor(c); setEraser(false) }} />)}</div><label className="dg-size">笔迹 <input type="range" min="3" max="22" value={width} onChange={e => setWidth(Number(e.target.value))} /></label><button className={`dg-tool ${eraser ? 'active' : ''}`} onClick={() => setEraser(v => !v)} type="button">橡皮擦</button><button className="dg-tool" onClick={clear} type="button">清空</button></div><canvas ref={canvasRef} className="dg-canvas" width={960} height={600} onPointerDown={start} onPointerMove={draw} aria-label="画板" /><div className="dg-author-row"><label className="dg-name-label">选出画者<select value={author} onChange={e => setAuthor(e.target.value)}><option value="">我是……</option>{friends.map(friend => <option key={friend.id} value={friend.name}>{friend.name}</option>)}</select></label><button className="primary-button dg-submit" type="button" disabled={!hasInk || !author || busy || !prompt} onClick={() => void submit()}>{busy ? '提交中…' : '确认作者并发布'} <span>↗</span></button></div></div>
}

export function DrawAndGuess() {
  const [keyword, setKeyword] = useState('')
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [guess, setGuess] = useState<Record<string, string>>({})
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const playerId = useRef(getPlayerId())
  const refresh = useCallback(async () => {
    try { const [feed, prompt] = await Promise.all([rpc<Artwork[]>('get_global_drawing_feed', { p_player_id: playerId.current }), rpc<string>('get_global_drawing_prompt', { p_player_id: playerId.current })]); setArtworks(feed ?? []); setKeyword(prompt ?? ''); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : '读取广场失败') }
  }, [])
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 12000); return () => window.clearInterval(timer) }, [refresh])
  const run = async (action: () => Promise<unknown>) => { setBusy(true); setError(''); try { await action(); await refresh(); return true } catch (e) { setError(e instanceof Error ? e.message : '操作失败，请再试一次'); return false } finally { setBusy(false) } }
  const submitDrawing = (image: string, author: string) => run(() => rpc('submit_global_drawing', { p_player_id: playerId.current, p_author_name: author, p_image: image }))
  const share = async () => { try { await navigator.clipboard.writeText(`${location.origin}${location.pathname}`); setError('广场链接已复制，发给大家就能一起玩。') } catch { setError('复制失败，请直接复制浏览器地址栏里的广场链接。') } }
  const submitGuess = (art: Artwork, giveUp: boolean) => run(() => rpc('submit_global_drawing_guess', { p_artwork_id: art.id, p_player_id: playerId.current, p_player_name: '朋友', p_guess: guess[art.id] ?? '', p_give_up: giveUp }))
  const react = (art: Artwork, value: number) => run(() => rpc('react_to_global_drawing', { p_artwork_id: art.id, p_player_id: playerId.current, p_reaction: art.my_reaction === value ? 0 : value }))
  const selectedArtwork = artworks.find(art => art.id === selectedArtworkId) ?? null

  return <main className="dg-shell"><nav className="topbar"><Link className="brand" to="/"><span className="brand-mark">西</span><span>西八小站<span className="brand-dot">.</span></span></Link><Link className="back-home" to="/">← 回到小站</Link></nav><header className="dg-hero"><p className="eyebrow"><span>✳</span> ONE PLAZA, EIGHT FRIENDS</p><h1>你画我猜，<em>全员同场。</em></h1><p>所有画作都在同一个广场。随时进来画一幅，<br className="dg-desktop" />猜中或放弃后，再揭晓是谁画的。</p></header>
    <section className="dg-roombar"><div><p className="eyebrow"><span>八人共用的画画广场</span></p><h2>{keyword ? `轮到你画：${keyword}` : '正在连接广场…'}</h2><p>不需要昵称。画好后从八位朋友中选出作者，再发布作品。</p></div><button type="button" className="share-button" onClick={() => void share()}>邀请朋友 ↗</button></section>
    <section className="dg-paint-section"><div className="dg-section-title"><div><p className="eyebrow"><span>01</span> DRAW IT YOUR WAY</p><h2>来画一幅</h2></div><span>选好作者后匿名发布</span></div><DrawingBoard key={keyword} busy={busy} prompt={keyword} onSubmit={submitDrawing} /></section>
    <section className="dg-gallery"><div className="dg-section-title"><div><p className="eyebrow"><span>02</span> THE SHARED PLAZA</p><h2>大家的画 <i>{artworks.length}</i></h2></div><button className="dg-refresh" onClick={() => void refresh()}>↻ 刷新</button></div>{artworks.length === 0 ? <p className="dg-empty">广场还没有作品，来画下第一笔吧！</p> : <div className="dg-art-grid">{artworks.map(art => <button type="button" className="dg-art-card dg-art-open" key={art.id} onClick={() => setSelectedArtworkId(art.id)} aria-label={`打开匿名画作，提示${art.hint_length}个字`}><img src={art.image} alt="匿名画作" /><span className="dg-art-info"><span className="dg-anon">匿名作品 · {art.hint_length} 个字</span><span className="dg-open-hint">点开输入答案 <b>↗</b></span></span></button>)}</div>}</section>
    {selectedArtwork && <div className="dg-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelectedArtworkId(null) }}><section className="dg-art-modal" role="dialog" aria-modal="true" aria-labelledby="dg-modal-title"><button type="button" className="dg-modal-close" onClick={() => setSelectedArtworkId(null)} aria-label="关闭">×</button><p className="eyebrow"><span>ANONYMOUS ARTWORK</span></p><h2 id="dg-modal-title">这幅画是什么？</h2><img className="dg-modal-image" src={selectedArtwork.image} alt="等待猜测的画作"/><p className="dg-modal-hint">答案是 <strong>{selectedArtwork.hint_length}</strong> 个字</p>{selectedArtwork.my_guess !== null ? <><div className="dg-modal-result">{selectedArtwork.my_correct ? '🎉 猜中了！' : selectedArtwork.my_guess === '' ? '你选择了放弃。' : `你的答案「${selectedArtwork.my_guess}」不正确。`}<p>答案：<strong>{selectedArtwork.keyword}</strong></p><p>作者：<strong>{selectedArtwork.artist ?? '作者待确认'}</strong></p></div><div className="dg-rating"><span>猜中 {selectedArtwork.correct} · 放弃 {selectedArtwork.gave_up}</span>{!selectedArtwork.is_mine && <div><button className={selectedArtwork.my_reaction === 1 ? 'picked' : ''} onClick={() => void react(selectedArtwork, 1)} aria-label="点赞">👍 {selectedArtwork.likes}</button><button className={selectedArtwork.my_reaction === -1 ? 'picked' : ''} onClick={() => void react(selectedArtwork, -1)} aria-label="踩">👎 {selectedArtwork.dislikes}</button></div>}</div></> : selectedArtwork.is_mine ? <div className="dg-modal-result">这是你画的作品。答案：<strong>{selectedArtwork.keyword}</strong><p>作者：<strong>{selectedArtwork.artist ?? '你'}</strong></p></div> : <><div className="dg-modal-guess"><input autoFocus maxLength={40} placeholder={`输入${selectedArtwork.hint_length}个字的答案`} value={guess[selectedArtwork.id] ?? ''} onChange={e => setGuess(v => ({ ...v, [selectedArtwork.id]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && guess[selectedArtwork.id]?.trim() && !busy) void submitGuess(selectedArtwork, false) }} /><span>{Array.from(guess[selectedArtwork.id] ?? '').length}/{selectedArtwork.hint_length} 字</span></div><div className="dg-modal-actions"><button className="primary-button" disabled={!guess[selectedArtwork.id]?.trim() || busy} onClick={() => void submitGuess(selectedArtwork, false)}>{busy ? '提交中…' : '提交答案'} <span>↗</span></button><button className="dg-giveup-button" disabled={busy} onClick={() => void submitGuess(selectedArtwork, true)}>猜不出，放弃并揭晓</button></div></>}{error && <p className="dg-modal-error">{error}</p>}</section></div>}
    {error && <div className={`dg-message ${error.includes('已复制') ? 'success' : ''}`}>{error}<button onClick={() => setError('')} aria-label="关闭">×</button></div>}<footer className="dg-footer">猜中或放弃后才能揭晓作者 · 每幅画每位朋友最多猜一次 · 有空再回来继续 <span>✳</span></footer></main>
}
