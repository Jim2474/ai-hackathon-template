// TTS 服务层 - 支持多种语音提供商
let currentTtsAudio = null;
let currentTtsAbortController = null;
let currentTtsStopHandler = null;

export const MINIMAX_DJ_VOICE_PRESETS = {
  privateRadioFemale: {
    voiceId: 'Chinese (Mandarin)_Warm_Girl',
    speed: 1.08,
    pitch: -1,
    label: '温暖女声，私人电台感'
  },
  lateNightFemale: {
    voiceId: 'Chinese (Mandarin)_Wise_Women',
    speed: 1.10,
    pitch: -1,
    label: '阅历姐姐，深夜电台感'
  },
  brightFemale: {
    voiceId: 'Chinese (Mandarin)_Sweet_Lady',
    speed: 1.06,
    pitch: 0,
    label: '甜美女声，更明亮'
  },
  privateRadioMale: {
    voiceId: 'Chinese (Mandarin)_Radio_Host',
    speed: 1.06,
    pitch: -1,
    label: '电台男主播，稍柔和'
  },
  warmHost: {
    voiceId: 'Chinese (Mandarin)_Gentleman',
    speed: 1.04,
    pitch: -1,
    label: '温润男声，更像私人陪伴'
  },
  announcer: {
    voiceId: 'Chinese (Mandarin)_Male_Announcer',
    speed: 1.08,
    pitch: 0,
    label: '播报男声，更清晰正式'
  },
  lyrical: {
    voiceId: 'Chinese (Mandarin)_Lyrical_Voice',
    speed: 1.02,
    pitch: -1,
    label: '抒情男声，更柔和'
  }
};

const DEFAULT_DJ_VOICE = MINIMAX_DJ_VOICE_PRESETS.lateNightFemale;

function stopCurrentTtsAudio() {
  if (currentTtsAbortController) {
    currentTtsAbortController.abort();
    currentTtsAbortController = null;
  }

  if (currentTtsAudio) {
    currentTtsAudio.pause();
    currentTtsAudio.src = '';
  }

  if (currentTtsStopHandler) {
    currentTtsStopHandler();
    currentTtsStopHandler = null;
  } else {
    currentTtsAudio = null;
  }
}

function hexToBlobUrl(hex, mimeType = 'audio/mpeg') {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }

  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

function toNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getBrowserVoices() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    setTimeout(() => {
      resolve(window.speechSynthesis?.getVoices?.() || []);
    }, 250);
  });
}

async function pickChinesePresenterVoice() {
  const voices = await getBrowserVoices();
  const chineseVoices = voices.filter((voice) => /zh-(CN|HK|TW)|Chinese|Mandarin|普通话|中文/i.test(`${voice.lang} ${voice.name}`));
  const presenterHints = /(female|woman|girl|xiaoxiao|xiaoyi|huihui|yaoyao|xiaobei|xiaoni|xiaohan|xiaomeng|xiaomo|女|温暖|少女|姐姐|主播|朗读)/i;
  return chineseVoices.find((voice) => presenterHints.test(voice.name)) || chineseVoices[0] || null;
}

// 浏览器原生语音合成
const speakWithBrowser = async (text, options = {}) => {
  stopCurrentTtsAudio();

  if (!window.speechSynthesis) {
    console.warn('Browser speech synthesis not available');
    return { provider: 'fallback', success: false };
  }

  window.speechSynthesis.cancel();
  const selectedVoice = await pickChinesePresenterVoice();

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.lang = 'zh-CN';
    utterance.rate = options.rate || toNumber(import.meta.env.VITE_BROWSER_TTS_RATE, 1.04);
    utterance.pitch = options.pitch || toNumber(import.meta.env.VITE_BROWSER_TTS_PITCH, 1.02);
    utterance.volume = toNumber(import.meta.env.VITE_BROWSER_TTS_VOLUME, 1);
    
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

// MiniMax TTS
const speakWithMiniMax = async (text, options = {}) => {
  const apiKey = import.meta.env.VITE_MINIMAX_TTS_API_KEY || import.meta.env.VITE_MINIMAX_API_KEY;
  const baseUrl = (import.meta.env.VITE_MINIMAX_TTS_BASE_URL || 'https://api.minimaxi.com/v1').trim().replace(/[`'"]/g, '');
  const model = import.meta.env.VITE_MINIMAX_TTS_MODEL || 'speech-2.8-turbo';
  const voiceId = import.meta.env.VITE_MINIMAX_TTS_VOICE_ID || DEFAULT_DJ_VOICE.voiceId;
  const speed = toNumber(options.rate || import.meta.env.VITE_MINIMAX_TTS_SPEED, DEFAULT_DJ_VOICE.speed);
  const volume = toNumber(import.meta.env.VITE_MINIMAX_TTS_VOLUME, 1);
  const pitch = toNumber(import.meta.env.VITE_MINIMAX_TTS_PITCH, DEFAULT_DJ_VOICE.pitch);
  const emotion = String(import.meta.env.VITE_MINIMAX_TTS_EMOTION || '').trim();
  const useLocalProxy = import.meta.env.VITE_MINIMAX_TTS_USE_PROXY !== 'false';

  if (!useLocalProxy && !apiKey) {
    throw new Error('MiniMax TTS API Key not set');
  }

  stopSpeaking();
  currentTtsAbortController = new AbortController();

  const headers = {
    'Content-Type': 'application/json'
  };

  if (!useLocalProxy) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(useLocalProxy ? '/api/minimax/t2a_v2' : `${baseUrl}/t2a_v2`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      text,
      stream: false,
      output_format: 'hex',
      voice_setting: {
        voice_id: voiceId,
        speed: Math.min(2, Math.max(0.5, speed)),
        vol: Math.min(10, Math.max(0.1, volume)),
        pitch: Math.min(12, Math.max(-12, pitch)),
        ...(emotion ? { emotion } : {})
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1
      },
      subtitle_enable: false
    }),
    signal: currentTtsAbortController.signal
  });

  currentTtsAbortController = null;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax TTS API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const statusCode = data?.base_resp?.status_code;

  if (statusCode !== undefined && statusCode !== 0) {
    throw new Error(`MiniMax TTS API error: ${data.base_resp.status_msg || statusCode}`);
  }

  const audioHex = data?.data?.audio;
  if (!audioHex) {
    throw new Error('MiniMax TTS response has no audio');
  }

  const audioUrl = hexToBlobUrl(audioHex);
  const audio = new Audio(audioUrl);
  currentTtsAudio = audio;

  return new Promise((resolve, reject) => {
    currentTtsStopHandler = () => {
      URL.revokeObjectURL(audioUrl);
      currentTtsAudio = null;
      resolve({ provider: 'minimax_tts', success: false, stopped: true });
    };

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentTtsAudio = null;
      currentTtsStopHandler = null;
      resolve({ provider: 'minimax_tts', success: true });
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      currentTtsAudio = null;
      currentTtsStopHandler = null;
      reject(new Error('MiniMax TTS audio playback failed'));
    };

    audio.play().catch((error) => {
      URL.revokeObjectURL(audioUrl);
      currentTtsAudio = null;
      currentTtsStopHandler = null;
      reject(error);
    });
  });
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
    if (error?.name === 'AbortError') {
      return { provider, success: false, stopped: true };
    }

    console.warn(`TTS provider ${provider} failed, falling back to browser`);
    return await speakWithBrowser(text, options);
  }
};

// 停止说话
export const stopSpeaking = () => {
  stopCurrentTtsAudio();
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
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
