const SYSTEM_PROMPT = `你是 Moodwave 的私人 AI DJ 和音乐规划器。
你的任务不是普通聊天，而是根据用户当前状态，从给定本地歌曲库中选择适合的歌曲，并生成一个私人 DJ 播放计划。
你必须只返回严格 JSON。
不要返回 Markdown。
不要返回解释文字。
不要使用代码块。
不要虚构不存在的歌曲。
tracks 必须从用户提供的 localAudioLibrary 中选择。
tracks 里的 id、title、artist、audioUrl 必须和 localAudioLibrary 完全一致。

输出 JSON 格式必须是：

{
  "title": "Deep Focus Wave",
  "subtitle": "90min · Study Focus · Lofi Ambient",
  "mode": "focus",
  "mood": "tired but wants to study",
  "openingLine": "听起来你现在有点累，但还想把事情往前推一点。没关系，我们先不硬冲，我会用低刺激的音乐帮你慢慢进入状态。",
  "reason": "你现在需要专注，但状态偏困，所以我会避开太吵和歌词太强的歌，先用稳定、轻柔、低干扰的声音降低启动阻力。",
  "phases": [
    {
      "start": 0,
      "end": 10,
      "title": "进入状态",
      "description": "降低启动阻力，让注意力慢慢回来。"
    }
  ],
  "tracks": [
    {
      "id": "focus-01",
      "title": "Focus 01",
      "artist": "Local Demo Audio",
      "mode": "focus",
      "audioUrl": "/audio/focus-01.mp3",
      "phase": "进入状态",
      "transition": "第一首先轻一点，你只需要把书打开，让注意力慢慢回来。"
    }
  ],
  "closingLine": "这一段结束了。你不需要立刻满血，但至少状态已经被拉回来了。"
}

规则：
1. 根据用户输入判断 mode：
   - 学习 / 写代码 / 专注 / 高数 / 作业：focus
   - 焦虑 / 烦 / 压力 / 放松 / 安抚：calm
   - 睡觉 / 睡前 / 入眠 / 晚安：sleep
   - 运动 / 健身 / 提神 / 燃一点：energy
   - 雨声 / 白噪音 / 自然声 / 环境音：nature
2. tracks 选择 3～5 首。
3. 如果对应 mode 歌曲不足，可以补充 calm 或 nature。
4. openingLine 控制在 1～3 句，要像私人 DJ，不要像客服。
5. reason 控制在 2～3 句。
6. transition 每条 1 句。
7. closingLine 控制在 1～2 句。
8. 不要说“根据您的需求”“以下是方案”。`;

function parseJSONSafely(content) {
  let cleanedContent = content;
  
  // 移除 MiniMax 可能返回的 <think> 标签内容
  if (cleanedContent.includes('<think>')) {
    cleanedContent = cleanedContent.replace(/<think>[\s\S]*?<\/think>/g, '');
    console.log('已移除 <think> 标签内容');
  }
  
  try {
    return JSON.parse(cleanedContent);
  } catch (e) {
    try {
      const firstBrace = cleanedContent.indexOf('{');
      const lastBrace = cleanedContent.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonString = cleanedContent.slice(firstBrace, lastBrace + 1);
        return JSON.parse(jsonString);
      }
    } catch (e2) {
      console.error('Failed to parse JSON even after extraction:', e2);
    }
    throw new Error('Failed to parse JSON response from MiniMax');
  }
}

function validatePlan(plan, library) {
  if (!plan.tracks || !Array.isArray(plan.tracks) || plan.tracks.length === 0) {
    throw new Error('Invalid plan: no tracks');
  }
  
  for (const track of plan.tracks) {
    const exists = library.some(t => t.id === track.id);
    if (!exists) {
      throw new Error('Invalid plan: track not found in library');
    }
  }
  
  return true;
}

export async function generateDJPlanWithMiniMax(userInput, localAudioLibrary) {
  const apiKey = import.meta.env.VITE_MINIMAX_API_KEY;
  const baseUrl = (import.meta.env.VITE_MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1').trim().replace(/[`'"]/g, '');
  const model = import.meta.env.VITE_MINIMAX_MODEL || 'MiniMax-M2.7';
  
  console.log('MiniMax API 调用参数:', { baseUrl, model });
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const libraryStr = JSON.stringify(localAudioLibrary, null, 2);
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `用户输入：${userInput}\n\n本地歌曲库：${libraryStr}`
          }
        ],
        temperature: 0.7
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('MiniMax 响应状态:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('MiniMax 错误响应:', errorText);
      throw new Error(`MiniMax API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    console.log('MiniMax 完整响应:', data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid MiniMax response');
    }
    
    const assistantContent = data.choices[0].message.content;
    console.log('MiniMax 内容:', assistantContent);
    
    const plan = parseJSONSafely(assistantContent);
    
    validatePlan(plan, localAudioLibrary);
    
    return {
      id: 'dj-minimax-' + Date.now(),
      duration: 90,
      highlights: ['MiniMax', 'AI', '私人 DJ'],
      transitions: plan.tracks.map(t => t.transition || ''),
      phases: plan.phases.map(p => ({
        time: `${p.start}-${p.end}min`,
        title: p.title
      })),
      ...plan
    };
    
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('MiniMax API request timed out');
    }
    throw error;
  }
}
