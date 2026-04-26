function PlanDisplay({ plan, phase, onStart, onReset }) {
  const isPlaying = phase === 'playing'

  const getModeColor = (mode) => {
    switch (mode) {
      case 'focus': return 'from-blue-500 to-cyan-500'
      case 'sleep': return 'from-purple-500 to-indigo-500'
      case 'calm': return 'from-green-500 to-teal-500'
      case 'workout': return 'from-orange-500 to-red-500'
      case 'whitenoise': return 'from-gray-500 to-gray-600'
      default: return 'from-blue-500 to-purple-500'
    }
  }

  return (
    <div className="w-full max-w-2xl bg-card-dark/90 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className={`inline-block px-4 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${getModeColor(plan.mode)} text-white`}>
            {plan.modeName}
          </span>
          <div className="text-gray-400 mt-2">
            时长：{plan.duration} 分钟
            {plan.autoFadeOut && ' · 自动淡出'}
          </div>
        </div>
        <button
          onClick={onReset}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          重新开始
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">方案说明</h3>
        <p className="text-gray-200 leading-relaxed">{plan.explanation}</p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-400 mb-3">播放计划</h3>
        <div className="space-y-2">
          {plan.timeline.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent-blue"></div>
              <span className="text-gray-300">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {!isPlaying ? (
        <button
          onClick={onStart}
          className="w-full bg-gradient-to-r from-accent-blue to-accent-purple text-white py-4 px-6 rounded-xl font-medium text-lg hover:opacity-90 transition-opacity"
        >
          开始播放
        </button>
      ) : (
        <div className="text-center">
          <div className="text-2xl font-light mb-2 text-accent-blue">播放中...</div>
          <div className="flex justify-center gap-1">
            <div className="w-1 h-6 bg-accent-blue animate-pulse"></div>
            <div className="w-1 h-8 bg-accent-purple animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-10 bg-accent-pink animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1 h-7 bg-accent-purple animate-pulse" style={{ animationDelay: '0.3s' }}></div>
            <div className="w-1 h-5 bg-accent-blue animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlanDisplay
