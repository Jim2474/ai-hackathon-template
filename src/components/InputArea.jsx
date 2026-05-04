import { useState } from 'react'

function InputArea({ onGenerate }) {
  const [input, setInput] = useState('')

  const quickInputs = [
    { text: "我要学习 2 小时", label: "学习" },
    { text: "我想睡前放松 30 分钟", label: "睡觉" },
    { text: "我要运动 1 小时", label: "运动" },
    { text: "我现在有点焦虑", label: "安抚" }
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) {
      onGenerate(input)
    }
  }

  const handleQuickInput = (text) => {
    setInput(text)
    onGenerate(text)
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-light mb-2 bg-gradient-to-r from-accent-blue via-accent-purple to-accent-pink bg-clip-text text-transparent">
          Claudio
        </h1>
        <p className="text-gray-400 text-lg">AI 情境音乐规划师</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="告诉我你现在的状态...比如：我现在很困，但还要学 2 小时高数"
          className="w-full h-32 bg-card-dark border border-gray-800 rounded-xl p-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent-blue resize-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-full mt-4 bg-gradient-to-r from-accent-blue to-accent-purple text-white py-3 px-6 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          生成方案
        </button>
      </form>

      <div className="flex flex-wrap gap-3 justify-center">
        {quickInputs.map((item, index) => (
          <button
            key={index}
            onClick={() => handleQuickInput(item.text)}
            className="bg-card-dark border border-gray-800 text-gray-300 px-4 py-2 rounded-lg hover:border-accent-blue hover:text-accent-blue transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default InputArea
