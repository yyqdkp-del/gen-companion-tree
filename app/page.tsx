'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [tasks, setTasks] = useState<any[]>([])
  const [localEvents, setLocalEvents] = useState<any[]>([])
  const [command, setCommand] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    // 初始加载
    fetchTasks()
    fetchLocalEvents()

    // Realtime 订阅 tasks
    const taskChannel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .subscribe()

    // Realtime 订阅 local_events
    const eventChannel = supabase
      .channel('events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'local_events' }, () => fetchLocalEvents())
      .subscribe()

    return () => {
      supabase.removeChannel(taskChannel)
      supabase.removeChannel(eventChannel)
    }
  }, [])

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .order('urgency', { ascending: true })
    setTasks(data || [])
  }

  async function fetchLocalEvents() {
    const { data } = await supabase
      .from('local_events')
      .select('*')
      .eq('is_active', true)
      .order('severity', { ascending: true })
    setLocalEvents(data || [])
  }

  async function sendCommand() {
    if (!command.trim()) return
    setSending(true)
    await fetch('https://hook.us2.make.com/5qi1044vykcxqc7pqyib0sbsbqy9s6qq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'cmd', content: command, user_id: 'mama' })
    })
    setCommand('')
    setSending(false)
  }

  const urgencyColor = (u: number) => {
    if (u <= 1) return 'border-red-400 bg-red-50'
    if (u <= 2) return 'border-orange-400 bg-orange-50'
    if (u <= 3) return 'border-yellow-400 bg-yellow-50'
    return 'border-green-400 bg-green-50'
  }

  const urgencyDot = (u: number) => {
    if (u <= 1) return 'bg-red-500 animate-ping'
    if (u <= 2) return 'bg-orange-400 animate-pulse'
    if (u <= 3) return 'bg-yellow-400'
    return 'bg-green-400'
  }

  return (
    <main className="min-h-screen bg-[#FAF6F0]">
      {/* 顶部 */}
      <div className="bg-white border-b border-[#EDE8E0] px-6 py-4">
        <h1 className="text-xl font-bold text-[#2D3A4A]">根·陪伴</h1>
        <p className="text-xs text-[#C8956C]">今天也辛苦了 🌿</p>
      </div>

      {/* 内容区 */}
      <div className="max-w-md mx-auto p-4 pb-24">

        {/* 本地热点警报 */}
        {localEvents.map(event => (
          <div key={event.id} className={`rounded-2xl p-4 mb-3 border-2 ${event.severity <= 2 ? 'border-red-400 bg-red-50' : 'border-orange-400 bg-orange-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${event.severity <= 2 ? 'bg-red-500 animate-ping' : 'bg-orange-400 animate-pulse'}`}/>
              <span className="text-sm font-bold text-[#2D3A4A]">🚨 {event.title_cn}</span>
            </div>
            <p className="text-xs text-gray-600 mb-3">{event.description}</p>
            <button className="w-full bg-[#2D3A4A] text-white text-xs py-2 rounded-xl">
              查看详情
            </button>
          </div>
        ))}

        {/* 孩子状态 */}
        <div className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-[#EDE8E0]">
          <h2 className="text-xs font-medium text-[#999] mb-3 uppercase tracking-wide">孩子状态</h2>
          <div className="flex gap-3">
            {['Noah', 'Emma'].map(name => (
              <button key={name} className="flex-1 bg-[#FAF6F0] rounded-xl p-3 text-center hover:bg-[#EDE8E0] transition"
                onClick={() => fetch('https://hook.us2.make.com/5qi1044vykcxqc7pqyib0sbsbqy9s6qq', {
                  method: 'POST', headers: {'Content-Type':'application/json'},
                  body: JSON.stringify({type:'patrol', content:`查看${name}今日状态`, user_id:'mama'})
                })}>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C8956C] to-[#D4A96A] mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg">
                  {name[0]}
                </div>
                <p className="text-sm font-medium text-[#2D3A4A]">{name}</p>
                <div className="w-2 h-2 rounded-full bg-green-400 mx-auto mt-1"/>
              </button>
            ))}
          </div>
        </div>

        {/* 任务气泡 */}
        <div className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-[#EDE8E0]">
          <h2 className="text-xs font-medium text-[#999] mb-3 uppercase tracking-wide">🌟 今日事项</h2>
          {tasks.length === 0 ? (
            <div className="text-center py-6 text-[#C8956C] text-sm">今日一切安好 🌸</div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border ${urgencyColor(task.urgency)}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${urgencyDot(task.urgency)}`}/>
                  <p className="text-sm text-[#2D3A4A] flex-1">{task.title}</p>
                  <button
                    className="text-xs bg-[#2D3A4A] text-white px-3 py-1 rounded-full flex-shrink-0"
                    onClick={async () => {
                      await supabase.from('tasks').update({status:'done'}).eq('id', task.id)
                      fetchTasks()
                    }}>
                    {task.action_label || '搞定'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 树洞入口 */}
        <div className="bg-[#2D3A4A] rounded-2xl p-4 mb-3">
          <h2 className="text-xs font-medium text-[#C8956C] mb-2">🌳 树洞</h2>
          <p className="text-sm text-white mb-3">老沈在这里，有什么想说的？</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="倾诉给老沈..."
              className="flex-1 text-sm bg-[#3D4A5A] text-white rounded-xl px-4 py-2 outline-none placeholder-gray-400"
              onKeyDown={async e => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                  const val = (e.target as HTMLInputElement).value
                  await fetch('https://hook.us2.make.com/5qi1044vykcxqc7pqyib0sbsbqy9s6qq', {
                    method: 'POST', headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({type:'treehouse', content: val, user_id:'mama'})
                  })
                  ;(e.target as HTMLInputElement).value = ''
                }
              }}
            />
            <button className="bg-[#C8956C] text-white px-4 py-2 rounded-xl text-sm">发送</button>
          </div>
        </div>

        {/* 指令中心 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EDE8E0]">
          <h2 className="text-xs font-medium text-[#999] mb-3 uppercase tracking-wide">🎙 发指令</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={command}
              onChange={e => setCommand(e.target.value)}
              placeholder="比如：把天气卡片去掉 / 查附近加油站"
              className="flex-1 text-sm bg-[#FAF6F0] rounded-xl px-4 py-2 border border-[#EDE8E0] outline-none"
              onKeyDown={e => e.key === 'Enter' && sendCommand()}
            />
            <button
              onClick={sendCommand}
              disabled={sending}
              className="bg-[#C8956C] text-white px-4 py-2 rounded-xl text-sm disabled:opacity-50">
              {sending ? '...' : '发送'}
            </button>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {['查附近加油站', '查今日热点', '生成周报'].map(q => (
              <button key={q} onClick={() => setCommand(q)}
                className="text-xs bg-[#FAF6F0] border border-[#EDE8E0] text-[#2D3A4A] px-3 py-1 rounded-full">
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 底部导航 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EDE8E0] px-6 py-3">
        <div className="max-w-md mx-auto flex justify-around">
          {[
            {id:'dashboard', icon:'🏠', label:'首页'},
            {id:'rian', icon:'✨', label:'日安'},
            {id:'growth', icon:'🌱', label:'成长树'},
            {id:'treehouse', icon:'🌳', label:'树洞'},
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 ${activeTab === tab.id ? 'text-[#C8956C]' : 'text-[#999]'}`}>
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
