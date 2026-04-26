// TTS 服务层 - 支持多种语音提供商

// 浏览器原生语音合成
const speakWithBrowser = (text, options = {}) => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      console.warn('Browser speech synthesis not available');
      resolve({ provider: 'fallback' });
      return;
    }

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1;
    utterance.volume = 1;
    
    utterance.onend = () => {
      resolve({ provider: 'browser', success: true });
    };
    
    utterance.onerror = (event) => {
      console.error('Browser TTS error:', event);
      resolve({ provider: 'browser', success: false, error: event });
    };
    
    window.speechSynthesis.speak(utterance);
  });
};

// Fish Audio TTS（预留，占位实现）
const speakWithFishAudio = async (text, options = {}) => {
  try {
    const apiKey = import.meta.env.VITE_FISH_AUDIO_API_KEY;
    const voiceId = import.meta.env.VITE_FISH_AUDIO_VOICE_ID || 'fish-voice-01';
    
    if (!apiKey) {
      throw new Error('Fish Audio API Key not set');
    }
    
    console.log('Fish Audio TTS (placeholder)', { text, voiceId });
    
    // TODO: 实现真实的 Fish Audio API 调用
    // const response = await fetch('https://api.fish.audio/v1/tts', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${apiKey}` },
    //   body: JSON.stringify({ text, voice_id: voiceId })
    // });
    
    // 暂时 fallback 到浏览器
    throw new Error('Fish Audio TTS not implemented yet');
    
  } catch (error) {
    console.warn('Fish Audio TTS failed, falling back to browser:', error);
    throw error;
  }
};

// MiniMax TTS（预留，占位实现）
const speakWithMiniMax = async (text, options = {}) => {
  try {
    const apiKey = import.meta.env.VITE_MINIMAX_TTS_API_KEY;
    const voiceId = import.meta.env.VITE_MINIMAX_TTS_VOICE_ID || 'minimax-voice-01';
    
    if (!apiKey) {
      throw new Error('MiniMax TTS API Key not set');
    }
    
    console.log('MiniMax TTS (placeholder)', { text, voiceId });
    
    // TODO: 实现真实的 MiniMax TTS API 调用
    // const response = await fetch('https://api.minimax.co/v1/tts', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${apiKey}` },
    //   body: JSON.stringify({ text, voice_id: voiceId })
    // });
    
    // 暂时 fallback 到浏览器
    throw new Error('MiniMax TTS not implemented yet');
    
  } catch (error) {
    console.warn('MiniMax TTS failed, falling back to browser:', error);
    throw error;
  }
};

// 统一的 TTS 接口
export const speakDJLine = async (text, options = {}) => {
  const provider = import.meta.env.VITE_TTS_PROVIDER || 'browser';
  
  try {
    switch (provider) {
      case 'fish':
        console.log('Using Fish Audio TTS');
        await speakWithFishAudio(text, options);
        return { provider: 'fish', success: true };
        
      case 'minimax_tts':
        console.log('Using MiniMax TTS');
        await speakWithMiniMax(text, options);
        return { provider: 'minimax_tts', success: true };
        
      case 'browser':
      default:
        console.log('Using Browser TTS');
        return await speakWithBrowser(text, options);
    }
  } catch (error) {
    console.warn(`TTS provider ${provider} failed, falling back to browser`);
    return await speakWithBrowser(text, options);
  }
};

// 停止说话
export const stopSpeaking = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  // TODO: 停止其他 TTS 提供商的播放
};

// 重新播放
export const replaySpeaking = (text, options = {}) => {
  stopSpeaking();
  return speakDJLine(text, options);
};

// 获取当前使用的 TTS 提供商
export const getCurrentTTSProvider = () => {
  return import.meta.env.VITE_TTS_PROVIDER || 'browser';
};

// 获取友好的提供商名称
export const getFriendlyProviderName = () => {
  const provider = getCurrentTTSProvider();
  switch (provider) {
    case 'fish':
      return 'Fish Audio Voice';
    case 'minimax_tts':
      return 'MiniMax AI Voice';
    case 'browser':
    default:
      return 'Browser Voice';
  }
};
