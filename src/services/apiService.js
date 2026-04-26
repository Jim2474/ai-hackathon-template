// API 服务模块 - 预留接口，目前使用 mock 数据

import { generatePlan as mockGeneratePlan } from '../data/mockPlans'

const API_CONFIG = {
  // 这里配置 MiniMax API 的相关信息
  // 实际使用时需要填入真实的 API Key
  apiKey: '',
  baseUrl: 'https://api.minimax.chat/v1',
}

/**
 * 调用 AI 生成音乐方案
 * @param {string} userInput - 用户输入的状态描述
 * @returns {Promise<Object>} - 生成的方案
 */
export async function generatePlan(userInput) {
  // 如果有 API Key，调用真实 API
  if (API_CONFIG.apiKey) {
    try {
      return await callMiniMaxAPI(userInput)
    } catch (error) {
      console.warn('API 调用失败，使用 mock 数据:', error)
      return mockGeneratePlan(userInput)
    }
  }

  // 否则使用 mock 数据
  console.log('使用 mock 数据（如需接入真实 API，请在 apiService.js 中配置 API Key）')
  return mockGeneratePlan(userInput)
}

/**
 * 调用 MiniMax AgentPlan API
 * @param {string} userInput - 用户输入
 * @returns {Promise<Object>}
 */
async function callMiniMaxAPI(userInput) {
  // 这里是真实 API 调用的示例结构
  // 实际使用时需要根据 MiniMax API 文档调整

  const response = await fetch(`${API_CONFIG.baseUrl}/agent/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: 'Agent-1',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的音乐规划师。根据用户的状态、情绪、目标，生成一个音乐方案。
          
请返回 JSON 格式，包含以下字段：
- mode: 模式，可选值 focus/sleep/calm/workout/whitenoise
- modeName: 模式名称（中文）
- duration: 时长，单位分钟
- explanation: 方案说明（中文）
- timeline: 播放计划，字符串数组
- hasVoiceReminder: 是否需要语音提醒，布尔值
- autoFadeOut: 是否自动淡出，布尔值

请严格返回 JSON，不要有其他文字。`,
        },
        {
          role: 'user',
          content: userInput,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error('API 请求失败')
  }

  const data = await response.json()
  // 解析 AI 返回的 JSON
  const content = data.choices[0].message.content
  return JSON.parse(content)
}

/**
 * 设置 API Key
 * @param {string} key - API Key
 */
export function setApiKey(key) {
  API_CONFIG.apiKey = key
}

/**
 * 检查是否配置了 API Key
 * @returns {boolean}
 */
export function hasApiKey() {
  return !!API_CONFIG.apiKey
}
