# Moodwave 本地音源整理报告

## 整理概述
- 整理日期：2026-04-26
- 原始目录：`audio/`
- 目标目录：`public/audio/`

## 文件统计
- **共发现音频文件**：10 个（全部为 .mp3 格式）
- **成功复制并整理**：10 个
- **无法处理文件**：0 个

## 按模式分类统计
| 模式   | 数量 | 文件列表                     |
|--------|------|------------------------------|
| focus  | 2    | focus-01.mp3, focus-02.mp3   |
| calm   | 2    | calm-01.mp3, calm-02.mp3     |
| sleep  | 1    | sleep-01.mp3                 |
| energy | 4    | energy-01.mp3 ~ energy-04.mp3|
| nature | 2    | nature-01.mp3, nature-02.mp3 |
| **总计** | **10** | - |

## 最终文件名列表
```
public/audio/
├── focus-01.mp3
├── focus-02.mp3
├── calm-01.mp3
├── calm-02.mp3
├── sleep-01.mp3
├── energy-01.mp3
├── energy-02.mp3
├── energy-03.mp3
├── energy-04.mp3
├── nature-01.mp3
└── nature-02.mp3
```

## 音源清单文件
已生成：`src/data/localAudioLibrary.js`

### 引用方式
```javascript
import { localAudioLibrary } from './data/localAudioLibrary';

// 使用示例
console.log(localAudioLibrary); // 查看所有音源
const focusTracks = localAudioLibrary.filter(t => t.mode === 'focus');
```

### 字段说明
- `id`: 唯一标识符
- `title`: 音频标题
- `artist`: 艺术家信息（默认为 "Local Demo Audio"）
- `mode`: 场景模式（focus/calm/sleep/energy/nature）
- `audioUrl`: 音频路径（格式：`/audio/xxx.mp3`）
- `tags`: 标签数组
- `energy`: 能量值（0-1）
- `valence`: 情绪值（0-1）
- `vocal`: 是否有人声
- `bpm`: 节拍数

## 后续主项目接入说明
1. 确保 public/audio 目录下的文件可以通过 `/audio/xxx.mp3` 访问
2. 从 `src/data/localAudioLibrary.js` 导入 `localAudioLibrary`
3. 根据 mode 字段筛选对应场景的音频
4. 使用 audioUrl 作为音频源地址

## 备注
- 原始文件保留在 `audio/` 目录，未做删除
- energy/valence/bpm 为根据场景估算的参考值
- vocal 默认为 false，不确定的情况下设为 false
