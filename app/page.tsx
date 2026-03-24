export default function Home() {
  return (
    <main className="min-h-screen bg-[#FAF6F0] p-6">
      <div className="max-w-md mx-auto">
        
        {/* 顶部标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#2D3A4A]">根·陪伴</h1>
          <p className="text-sm text-[#C8956C]">今天也辛苦了 🌿</p>
        </div>

        {/* 孩子状态卡片 */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-[#EDE8E0]">
          <h2 className="text-sm font-medium text-[#666] mb-3">孩子状态</h2>
          <div className="flex gap-3">
            <div className="flex-1 bg-[#FAF6F0] rounded-xl p-3 text-center">
              <div className="w-12 h-12 rounded-full bg-[#EDE8E0] mx-auto mb-2"></div>
              <p className="text-sm font-medium text-[#2D3A4A]">Noah</p>
              <div className="w-2 h-2 rounded-full bg-green-400 mx-auto mt-1"></div>
            </div>
            <div className="flex-1 bg-[#FAF6F0] rounded-xl p-3 text-center">
              <div className="w-12 h-12 rounded-full bg-[#EDE8E0] mx-auto mb-2"></div>
              <p className="text-sm font-medium text-[#2D3A4A]">Emma</p>
              <div className="w-2 h-2 rounded-full bg-green-400 mx-auto mt-1"></div>
            </div>
          </div>
        </div>

        {/* 今日任务 */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-[#EDE8E0]">
          <h2 className="text-sm font-medium text-[#666] mb-3">🌟 今日事项</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-[#FFF0F0] rounded-xl border border-red-200">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
              <p className="text-sm text-[#2D3A4A] flex-1">签证还有 10 天到期</p>
              <button className="text-xs bg-red-400 text-white px-3 py-1 rounded-full">联系中介</button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#FFF8F0] rounded-xl border border-orange-200">
              <div className="w-2 h-2 rounded-full bg-orange-400"></div>
              <p className="text-sm text-[#2D3A4A] flex-1">明天 Noah 带蓝色体育服</p>
              <button className="text-xs bg-orange-400 text-white px-3 py-1 rounded-full">已备好</button>
            </div>
          </div>
        </div>

        {/* 指令输入 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EDE8E0]">
          <h2 className="text-sm font-medium text-[#666] mb-3">🎙 发指令</h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="说中文就好，比如：把天气卡片去掉"
              className="flex-1 text-sm bg-[#FAF6F0] rounded-xl px-4 py-2 border border-[#EDE8E0] outline-none"
            />
            <button className="bg-[#C8956C] text-white px-4 py-2 rounded-xl text-sm">发送</button>
          </div>
        </div>

      </div>
    </main>
  )
}
