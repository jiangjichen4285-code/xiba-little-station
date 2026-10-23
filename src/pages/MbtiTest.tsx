import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProgressBar } from '../components/ProgressBar'
import { usePlayerAccount } from '../context/PlayerAccount'

type Axis = 'EI' | 'SN' | 'TF' | 'JP'
type Question = { prompt: string; a: string; b: string; axis: Axis; left: string; right: string }

const questions: Question[] = [
  { axis: 'EI', left: 'E', right: 'I', prompt: '忙碌的一周结束了，怎样休息最能让你回血？', a: '约上朋友见面，聊到尽兴再回家', b: '留一段独处时间，慢慢恢复自己的节奏' },
  { axis: 'SN', left: 'S', right: 'N', prompt: '第一次走进一座新城市，你更容易注意到什么？', a: '街道、店铺和眼前真实发生的细节', b: '这座城市的氛围，以及它可能藏着的故事' },
  { axis: 'TF', left: 'T', right: 'F', prompt: '朋友来找你倾诉烦恼，你通常会先？', a: '一起理清问题，看看接下来能怎么做', b: '先陪着对方感受，让 TA 知道你在' },
  { axis: 'JP', left: 'J', right: 'P', prompt: '期待已久的周末旅行，你比较喜欢？', a: '提前安排好交通、餐馆和大致行程', b: '只定个目的地，到了再看心情决定' },
  { axis: 'EI', left: 'E', right: 'I', prompt: '在一场不太熟悉的聚会上，你更像？', a: '主动加入聊天，很快认识新朋友', b: '先观察一会儿，和聊得来的人慢慢熟悉' },
  { axis: 'SN', left: 'S', right: 'N', prompt: '学一个新东西时，哪种方式更对你的胃口？', a: '先看清楚步骤和实例，跟着练一遍', b: '先理解整体概念，再自由探索可能性' },
  { axis: 'TF', left: 'T', right: 'F', prompt: '团队意见不一样时，你更在意？', a: '哪种方案更合理、真正解决问题', b: '大家是否都被倾听，之后还相处得舒服' },
  { axis: 'JP', left: 'J', right: 'P', prompt: '面对一项还没定下来的计划，你会？', a: '尽早敲定，好安心安排其他事情', b: '先留点空间，说不定会出现更好的选择' },
  { axis: 'EI', left: 'E', right: 'I', prompt: '有个特别开心的消息，你第一反应是？', a: '想马上找人分享，一起开心起来', b: '先自己回味一下，想好再告诉亲近的人' },
  { axis: 'SN', left: 'S', right: 'N', prompt: '回想一段印象深刻的经历，你最先想起？', a: '当时看见、听见或做过的具体细节', b: '那段经历带给你的意义和新的联想' },
  { axis: 'TF', left: 'T', right: 'F', prompt: '要给朋友一个重要建议时，你更倾向于？', a: '坦诚讲出自己的判断，尽量客观清楚', b: '想好对方此刻需要什么样的表达方式' },
  { axis: 'JP', left: 'J', right: 'P', prompt: '临近截止日期时，哪种状态更像你？', a: '早早分段完成，临近时检查收尾', b: '边做边调整，最后阶段灵感和效率都来了' },
  { axis: 'EI', left: 'E', right: 'I', prompt: '一个有趣的新点子冒出来，你更喜欢？', a: '先说出来，在交流里越聊越有灵感', b: '先在心里琢磨清楚，再挑合适时机分享' },
  { axis: 'SN', left: 'S', right: 'N', prompt: '朋友讲一件刚发生的事，你通常会追问？', a: '后来具体怎么了？当时是什么情况？', b: '你觉得这件事说明了什么？之后会怎样？' },
  { axis: 'TF', left: 'T', right: 'F', prompt: '做一个影响大家的决定时，你会优先考虑？', a: '标准是否一致，结果是否经得起推敲', b: '这个决定会怎样影响到每一个人' },
  { axis: 'JP', left: 'J', right: 'P', prompt: '收拾书桌或房间，你更常用的方式是？', a: '每样东西有固定位置，收好就很清爽', b: '大致顺手就好，需要时我知道去哪里找' },
]

const profiles: Record<string, { title: string; name: string; description: string; glyph: string; color: string }> = {
  ISTJ: { title: '认真可靠的守序者', name: '把每件小事都放在心上', description: '你踏实、细致，答应的事情会认真做好。熟悉的节奏让你安心，而身边人也常常因为你的可靠而更有底气。', glyph: '▤', color: '#9a8766' },
  ISFJ: { title: '温柔细心的守护者', name: '安静地照亮身边的人', description: '你很会留意别人的需要，也记得那些不起眼的小细节。温柔不是退让，而是你认真对待每段关系的方式。', glyph: '❀', color: '#ba8d83' },
  INFJ: { title: '心思深远的理想主义者', name: '在安静里看见很远', description: '你敏锐、内省，也很在意事情背后的意义。你愿意理解别人，同时也需要属于自己的空间，把想法慢慢沉淀。', glyph: '✧', color: '#8d7da6' },
  INTJ: { title: '独立笃定的构想者', name: '总能看见下一步', description: '你喜欢弄清结构、找到方向，再按自己的方式推进。独立思考是你的力量，偶尔给意外留点位置，也会有新发现。', glyph: '⌘', color: '#747f9b' },
  ISTP: { title: '冷静灵活的实践者', name: '先看看，再动手解决', description: '遇到问题时你通常不慌，喜欢亲自试试什么方法管用。你重视自由，也擅长在变化里找到直接有效的路。', glyph: '⌁', color: '#6f9994' },
  ISFP: { title: '温和自在的感受者', name: '按自己的步调发光', description: '你真诚、敏感，懂得欣赏日常里细小的美好。比起被催着定义自己，你更喜欢用行动和选择慢慢表达。', glyph: '❋', color: '#ad8f85' },
  INFP: { title: '柔软坚定的理想家', name: '心里有片自己的花园', description: '你珍惜真诚与想象，也会认真守护在意的东西。看起来随和的你，心里其实有很清楚的价值和边界。', glyph: '☼', color: '#9b83ab' },
  INTP: { title: '好奇专注的思考者', name: '问题越奇怪越想弄懂', description: '你喜欢追问原因、连接新点子，在脑海里把事情拆开又重新组合。你的好奇心总能把普通话题带去有趣的地方。', glyph: '∞', color: '#788aa2' },
  ESTP: { title: '爽快大胆的行动派', name: '此刻就出发看看', description: '你反应快、适应力强，遇到新鲜事往往愿意先体验。现场感是你的优势，临场发挥常常比纸上计划更精彩。', glyph: '↗', color: '#c18b65' },
  ESFP: { title: '明亮热情的生活家', name: '快乐是可以分享的', description: '你很容易捕捉当下的乐趣，也会把好心情带给周围的人。真实、热情的你，让平常的一天也多了值得记住的瞬间。', glyph: '✹', color: '#d29078' },
  ENFP: { title: '灵感满满的探索者', name: '每个转弯都有新故事', description: '你热情、好奇，脑海里总有新的可能。和人交流会点亮你的灵感，而你也很擅长让别人重新看见生活的有趣。', glyph: '✳', color: '#b58a72' },
  ENTP: { title: '机敏好奇的点子玩家', name: '最爱把可能性翻个面', description: '你喜欢探索不同观点，也享受把熟悉的东西重新组合。反应敏捷又有幽默感，聊天经常不知不觉拐进新奇方向。', glyph: '⤨', color: '#8a8eaa' },
  ESTJ: { title: '果断务实的组织者', name: '让想法一步步落地', description: '你讲效率、有担当，擅长把事情安排清楚并推动完成。清晰的目标能带来安全感，偶尔放松标准也能让过程更轻盈。', glyph: '▦', color: '#8e936c' },
  ESFJ: { title: '热心周到的连接者', name: '让大家都感到被欢迎', description: '你重视人与人之间的温度，也愿意主动照顾集体里的气氛。你的细心让相聚更有归属感，真诚回应也是你最好的能量来源。', glyph: '♡', color: '#bb8a8b' },
  ENFJ: { title: '温暖坚定的鼓舞者', name: '总能发现彼此的闪光', description: '你善于理解人，也愿意鼓励大家朝更好的方向走。你的热情会感染身边的人，记得也给自己留一份同样温柔的照顾。', glyph: '✺', color: '#a78086' },
  ENTJ: { title: '清晰有力的开拓者', name: '把远方变成行动计划', description: '你目标感强，喜欢找到方向后大步向前。面对挑战时的果断是你的长处，听听不同节奏的声音会让团队走得更远。', glyph: '△', color: '#7c887a' },
}

const axisNames: Record<Axis, [string, string]> = { EI: ['外向 E', '内向 I'], SN: ['实感 S', '直觉 N'], TF: ['思考 T', '情感 F'], JP: ['判断 J', '感知 P'] }

export function MbtiTest() {
  const { awardGameCoin } = usePlayerAccount()
  const playId = useRef(crypto.randomUUID())
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(-1))
  const [result, setResult] = useState<string | null>(null)
  const reset = () => { playId.current = crypto.randomUUID(); setCurrent(0); setAnswers(Array(questions.length).fill(-1)); setResult(null); setStarted(false) }
  const choose = async (choice: number) => {
    const next = [...answers]; next[current] = choice; setAnswers(next)
    if (current < questions.length - 1) { setCurrent(current + 1); return }
    const tally: Record<Axis, number> = { EI: 0, SN: 0, TF: 0, JP: 0 }
    next.forEach((answer, i) => { const q = questions[i]; tally[q.axis] += answer === 0 ? 1 : -1 })
    const type = (['EI', 'SN', 'TF', 'JP'] as Axis[]).map(axis => tally[axis] >= 0 ? axisNames[axis][0].slice(-1) : axisNames[axis][1].slice(-1)).join('')
    setResult(type)
    try { await awardGameCoin('mbti-test', playId.current) } catch { /* Keep the result available if the reward service is temporarily offline. */ }
  }
  const profile = result ? profiles[result] : null
  if (profile && result) return <main className="quiz-shell mbti-shell"><nav className="quiz-nav"><Link className="brand" to="/"><span className="brand-mark">西</span><span>西八小站<span className="brand-dot">.</span></span></Link><button className="quiet-button" onClick={reset}>再测一次 ↻</button></nav><section className="mbti-result" style={{ '--profile-color': profile.color } as React.CSSProperties}><p className="eyebrow"><span>YOUR LITTLE PORTRAIT</span></p><span className="mbti-result-glyph">{profile.glyph}</span><p className="mbti-type">{result}</p><h1>{profile.title}</h1><h2>{profile.name}</h2><p className="mbti-description">{profile.description}</p><div className="mbti-dimensions">{(['EI', 'SN', 'TF', 'JP'] as Axis[]).map((axis, i) => <span key={axis}><i>0{i + 1}</i>{axisNames[axis][result[i] === axisNames[axis][0].slice(-1) ? 0 : 1]}</span>)}</div><p className="mbti-disclaimer">这是根据几道日常偏好题生成的轻松画像，仅供娱乐与自我观察，不是专业心理评估。</p><div className="result-actions"><button className="primary-button" onClick={reset}>重新认识自己 <span>↻</span></button><Link className="share-button" to="/">回到小站 ↗</Link></div></section><div className="quiz-bottom-note">A SMALL MIRROR, JUST FOR FUN <span>✳</span></div></main>
  if (!started) return <main className="quiz-shell"><nav className="quiz-nav"><Link className="brand" to="/"><span className="brand-mark">西</span><span>西八小站<span className="brand-dot">.</span></span></Link><Link to="/" className="back-home">回到小站 ↗</Link></nav><section className="quiz-intro"><span className="intro-sticker">A SMALL<br/>SELF PORTRAIT<br/>✳</span><div className="intro-emoji">🪞</div><p className="eyebrow"><span>A LITTLE MBTI TEST</span></p><h1>认识你的<br/><em>性格底色。</em></h1><p className="intro-copy">16 个生活小场景，选更自然的那个你。<br/>看看哪种性格画像最像现在的自己。</p><button className="primary-button" onClick={() => setStarted(true)}>开始认识自己 <span>→</span></button><div className="quiz-meta"><span>01 — 16 QUESTIONS</span><span>约 2 分钟 · 仅供娱乐</span></div></section><div className="quiz-decoration deco-one">✳</div><div className="quiz-decoration deco-two">✳</div></main>
  const question = questions[current]
  return <main className="quiz-shell"><nav className="quiz-nav"><Link className="brand" to="/"><span className="brand-mark">西</span><span>西八小站<span className="brand-dot">.</span></span></Link><button className="quiet-button" onClick={reset}>重新开始 ↻</button></nav><section className="question-wrap"><div className="question-meta"><span className="eyebrow"><span>A LITTLE MBTI TEST</span></span><span className="question-number">{String(current + 1).padStart(2, '0')} <i>/</i> 16</span></div><ProgressBar current={current + 1} total={questions.length}/><div className="question-content" key={current}><p className="question-kicker">选更自然、更常发生的那个你 <span>✳</span></p><h1>{question.prompt}</h1><div className="options-list"><button className={`option-button mbti-option ${answers[current] === 0 ? 'selected' : ''}`} onClick={() => choose(0)}><span className="option-letter">{question.left}</span><span>{question.a}</span><span className="option-check">↗</span></button><button className={`option-button mbti-option ${answers[current] === 1 ? 'selected' : ''}`} onClick={() => choose(1)}><span className="option-letter">{question.right}</span><span>{question.b}</span><span className="option-check">↗</span></button></div></div><div className="question-footer"><button className="quiet-button" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>← 上一题</button><span>答案只留在这次测试里</span></div></section><div className="quiz-bottom-note">A SMALL MIRROR, JUST FOR FUN <span>✳</span></div></main>
}
