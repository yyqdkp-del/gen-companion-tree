'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const WELCOME_MESSAGE = `嗨，我是木棉。今晚，这里只有你和我。
不管你想说什么，哪怕是说不出口的话，
我都在，我都接着。`

function TreeIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 40V24" stroke="#f8d6a0" strokeWidth="3" strokeLinecap="round" />
      <path d="M15 39h18" stroke="#f8d6a0" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M24 7c-6 0-10 5-10 10 0 2 .8 4 2.1 5.6C11.8 23.8 9 27 9 31c0 5 4.7 9 10.5 9 2.2 0 4.2-.6 5.8-1.6 1.5 1 3.5 1.6 5.7 1.6C36.8 40 41 36 41 31c0-4-2.8-7.2-7.1-8.4A8.8 8.8 0 0 0 36 17c0-5-4.5-10-12-10Z"
        fill="rgba(248, 214, 160, 0.2)"
        stroke="#f8d6a0"
        strokeWidth="2"
      />
    </svg>
  )
}

export default function KapokTreeholePage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: WELCOME_MESSAGE },
  ])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const content = input.trim()
    if (!content || isThinking) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setInput('')
    setIsThinking(true)

    try {
      const res = await fetchWithAuth('/api/treehouse/mom', {
        method: 'POST',
        body: JSON.stringify({
          messages: nextMessages
            .filter((message) => message.id !== 'welcome')
            .map(({ role, content }) => ({ role, content })),
        }),
      })

      if (!res.ok) {
        throw new Error('Kapok request failed')
      }

      const data = (await res.json()) as { message?: string }
      const reply = data.message?.trim() || '我在。你慢慢说，我不走。'
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: reply },
      ])
    } catch (error) {
      console.error('[treehouse/mom] send failed:', error)
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: '我在，只是刚刚风声有点大。你再说一遍，好不好。' },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <main className="kapok-page">
      <div className="moonlight" />

      <header className="kapok-header">
        <button className="back-button" type="button" onClick={() => router.back()}>
          ←
        </button>
        <div className="title-wrap">
          <div className="title-line">
            <TreeIcon />
            <h1>木棉树洞</h1>
          </div>
          <p>这里只有你和我</p>
        </div>
        <div className="header-spacer" />
      </header>

      <section className="message-list" aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-row ${message.role === 'user' ? 'message-row-user' : 'message-row-kapok'}`}
          >
            {message.role === 'assistant' && <span className="kapok-mark">🌸</span>}
            <div className={`message-bubble ${message.role === 'user' ? 'user-bubble' : 'kapok-bubble'}`}>
              {message.content}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="message-row message-row-kapok">
            <span className="kapok-mark">🌸</span>
            <div className="message-bubble kapok-bubble thinking">木棉正在想...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </section>

      <footer className="input-area">
        <form className="input-box" onSubmit={sendMessage}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="今天怎么了..."
            disabled={isThinking}
            aria-label="给木棉发送消息"
          />
          <button type="submit" disabled={!input.trim() || isThinking}>
            发送
          </button>
        </form>
        <p>木棉是你的私人树洞，所有对话只属于你</p>
      </footer>

      <style jsx>{`
        .kapok-page {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: #fff7e8;
          background-color: #0a0d14;
          background-image:
            radial-gradient(at 50% -5%, rgba(245,214,209,0.07) 0px, transparent 45%),
            linear-gradient(180deg, #0a0d14 0%, #121a29 100%);
          font-family: "Noto Serif SC", "Songti SC", Georgia, serif;
        }

        .moonlight {
          position: absolute;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(245,214,209,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .kapok-header {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 44px 1fr 44px;
          align-items: center;
          padding: 48px 18px 18px;
          border-bottom: 1px solid rgba(255, 224, 178, 0.08);
          background: linear-gradient(to bottom, rgba(10, 13, 20, 0.86), rgba(10, 13, 20, 0.18));
          backdrop-filter: blur(18px);
        }

        .back-button {
          width: 38px;
          height: 38px;
          border: 1px solid rgba(255, 224, 178, 0.16);
          border-radius: 999px;
          color: #f8d6a0;
          background: rgba(255, 255, 255, 0.04);
          font-size: 20px;
          cursor: pointer;
        }

        .title-wrap {
          text-align: center;
        }

        .title-line {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        h1 {
          margin: 0;
          color: #f8d6a0;
          font-size: 24px;
          font-weight: 400;
          letter-spacing: 0.12em;
        }

        .title-wrap p {
          margin: 4px 0 0;
          color: rgba(255, 236, 207, 0.58);
          font-size: 12px;
          letter-spacing: 0.28em;
        }

        .message-list {
          position: relative;
          z-index: 1;
          flex: 1;
          overflow-y: auto;
          padding: 22px 18px 18px;
          scrollbar-width: none;
        }

        .message-list::-webkit-scrollbar {
          display: none;
        }

        .message-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          margin-bottom: 16px;
        }

        .message-row-user {
          justify-content: flex-end;
        }

        .message-row-kapok {
          justify-content: flex-start;
        }

        .kapok-mark {
          flex: 0 0 auto;
          margin-bottom: 7px;
          font-size: 18px;
          filter: drop-shadow(0 0 8px rgba(255, 194, 132, 0.35));
        }

        .message-bubble {
          max-width: min(78%, 620px);
          white-space: pre-wrap;
          word-break: break-word;
          border-radius: 22px;
          padding: 13px 16px;
          font-size: 15px;
          font-weight: 300;
          line-height: 1.75;
          letter-spacing: 0.03em;
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(20px);
        }

        .user-bubble {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px 20px 4px 20px;
          color: #e2d9d0;
        }

        .kapok-bubble {
          background: linear-gradient(135deg, rgba(230,168,158,0.07) 0%, rgba(230,168,158,0.02) 100%);
          border: 1px solid rgba(230,168,158,0.12);
          border-radius: 20px 20px 20px 4px;
          color: #d4c5b9;
        }

        .thinking {
          color: rgba(255, 233, 199, 0.7);
          font-size: 14px;
        }

        .input-area {
          position: relative;
          z-index: 1;
          flex-shrink: 0;
          padding: 14px 16px 28px;
          background: linear-gradient(to top, rgba(10, 13, 20, 0.96), rgba(10, 13, 20, 0));
        }

        .input-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border: 1px solid rgba(255, 224, 178, 0.16);
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(22px);
        }

        input {
          min-width: 0;
          flex: 1;
          border: 0;
          outline: 0;
          color: #fff3dd;
          background: transparent;
          font-size: 16px;
          font-family: inherit;
        }

        input::placeholder {
          color: rgba(255, 232, 199, 0.42);
        }

        button {
          font-family: inherit;
        }

        .input-box button {
          flex: 0 0 auto;
          border: 0;
          border-radius: 999px;
          padding: 10px 16px;
          color: #2b170d;
          background: #f8d6a0;
          font-size: 14px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s;
        }

        .input-box button:disabled {
          cursor: default;
          opacity: 0.36;
        }

        .input-box button:not(:disabled):active {
          transform: scale(0.96);
        }

        .input-area p {
          margin: 9px 0 0;
          text-align: center;
          color: rgba(255, 232, 199, 0.34);
          font-size: 10px;
          letter-spacing: 0.12em;
        }

        @media (min-width: 720px) {
          .message-list,
          .input-area {
            padding-left: max(24px, calc((100vw - 720px) / 2));
            padding-right: max(24px, calc((100vw - 720px) / 2));
          }
        }
      `}</style>
    </main>
  )
}
