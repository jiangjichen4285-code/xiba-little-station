import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { OptionButton } from '../components/OptionButton'
import { ProgressBar } from '../components/ProgressBar'
import { questions } from '../data/friendMatchQuiz'
import { calculateMatch } from '../lib/match'
import { dimensionKeys, type Dimensions } from '../types'

const emptyScores = (): Dimensions => Object.fromEntries(dimensionKeys.map(key => [key, 0])) as Dimensions
export function FriendMatchQuiz() {
  const [started, setStarted] = useState(false); const [current, setCurrent] = useState(0); const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(-1)); const navigate = useNavigate()
  const restart = () => { sessionStorage.removeItem('xiba-friend-match-result'); setCurrent(0); setAnswers(Array(questions.length).fill(-1)); setStarted(false) }
  const choose = (choice: number) => {
    const nextAnswers = [...answers]; nextAnswers[current] = choice; setAnswers(nextAnswers)
    if (current === questions.length - 1) {
      const scores = emptyScores()
      nextAnswers.forEach((answer, questionIndex) => { const option = questions[questionIndex].options[answer]; if (option) Object.entries(option.scores).forEach(([key, value]) => { scores[key as keyof Dimensions] += value }) })
      sessionStorage.setItem('xiba-friend-match-result', JSON.stringify(calculateMatch(scores))); navigate('/games/friend-match/result')
    } else setCurrent(current + 1)
  }
  if (!started) return <main className="quiz-shell"><nav className="quiz-nav"><Link className="brand" to="/"><span className="brand-mark">西</span><span>西八小站<span className="brand-dot">.</span></span></Link><Link to="/" className="back-home">回到小站 ↗</Link></nav><section className="quiz-intro"><span className="intro-sticker">A TINY<br />PERSONALITY<br />CHECK ✳</span><div className="intro-emoji">💞</div><p className="eyebrow"><span>THE FRIENDSHIP TEST</span></p><h1>你和谁<br /><em>最契合？</em></h1><p className="intro-copy">10 道题，凭第一感觉选。<br />测出西八小站里和你最同频的人。</p><button className="primary-button" onClick={() => setStarted(true)}>开始测试 <span>→</span></button><div className="quiz-meta"><span>01 — 10 QUESTIONS</span><span>约 1 分钟 · 仅供娱乐</span></div></section><div className="quiz-decoration deco-one">✳</div><div className="quiz-decoration deco-two">✳</div></main>
  const item = questions[current]
  return <main className="quiz-shell"><nav className="quiz-nav"><Link className="brand" to="/"><span className="brand-mark">西</span><span>西八小站<span className="brand-dot">.</span></span></Link><button className="quiet-button" onClick={restart}>重新开始 ↻</button></nav><section className="question-wrap"><div className="question-meta"><span className="eyebrow"><span>THE FRIENDSHIP TEST</span></span><span className="question-number">{String(current + 1).padStart(2, '0')} <i>/</i> {String(questions.length).padStart(2, '0')}</span></div><ProgressBar current={current + 1} total={questions.length} /><div className="question-content" key={current}><p className="question-kicker">凭第一感觉，不用想太久 <span>✳</span></p><h1>{item.question}</h1><div className="options-list">{item.options.map((option, index) => <OptionButton key={option.text} label={String.fromCharCode(65 + index)} text={option.text} selected={answers[current] === index} onClick={() => choose(index)} />)}</div></div><div className="question-footer"><button className="quiet-button" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>← 上一题</button><span>你的答案只留在这次测试里</span></div></section><div className="quiz-bottom-note">A SMALL TEST FOR A BIG FRIENDSHIP <span>♥</span></div></main>
}
