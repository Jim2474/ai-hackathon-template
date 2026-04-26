const pptxgen = require("pptxgenjs");

// Create a new presentation
let pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Moodwave Team";
pres.title = "Moodwave - AI Music DJ";

// ========================================
// SLIDE 1: Moodwave 是什么
// ========================================
let slide1 = pres.addSlide();

// Dark background
slide1.background = { color: "1E1E2E" };

// Title - Moodwave
slide1.addText("Moodwave", {
  x: 0.8,
  y: 1.2,
  w: 8.5,
  h: 1.2,
  fontSize: 64,
  color: "FFFFFF",
  bold: true,
  align: "center"
});

// Subtitle
slide1.addText("Your personal AI DJ for every mood", {
  x: 0.8,
  y: 2.5,
  w: 8.5,
  h: 0.5,
  fontSize: 28,
  color: "88CCFF",
  align: "center",
  italic: true
});

// Core sentence
slide1.addText("Moodwave 不问你想听什么歌，它问你现在是什么状态。", {
  x: 0.8,
  y: 3.4,
  w: 8.5,
  h: 1.2,
  fontSize: 24,
  color: "FFFFFF",
  align: "center",
  lineSpacing: 24
});

// Decorative shape
slide1.addShape(pres.shapes.RECTANGLE, {
  x: 0,
  y: 0,
  w: 10,
  h: 0.4,
  fill: { color: "88CCFF" }
});

// ========================================
// SLIDE 2: 痛点与方案
// ========================================
let slide2 = pres.addSlide();
slide2.background = { color: "1E1E2E" };

// Title
slide2.addText("痛点", {
  x: 0.8,
  y: 0.5,
  w: 4,
  h: 0.6,
  fontSize: 32,
  color: "FFFFFF",
  bold: true
});

// Pain points
slide2.addText([
  { text: "🎶 歌单很多，但不知道现在该听什么", options: { breakLine: true } },
  { text: "🤖 推荐系统懂歌曲，却不懂用户此刻的状态", options: { breakLine: true } },
  { text: "⏰ 学习、焦虑、睡前、运动需要不同的声音节奏", options: {} }
], {
  x: 0.8,
  y: 1.2,
  w: 4,
  h: 2,
  fontSize: 18,
  color: "CCCCCC",
  lineSpacing: 30
});

// Solution title
slide2.addText("方案", {
  x: 5.2,
  y: 0.5,
  w: 4,
  h: 0.6,
  fontSize: 32,
  color: "FFFFFF",
  bold: true
});

// Process flow boxes
const steps = [
  { x: 5.2, text: "用户输入状态" },
  { x: 6.2, text: "AI 理解情绪" },
  { x: 7.2, text: "匹配歌单" },
  { x: 8.2, text: "生成 DJ 台词" },
  { x: 9.2, text: "播放音乐" }
];

steps.forEach((step, i) => {
  if (i < steps.length - 1) {
    // Arrow line
    slide2.addShape(pres.shapes.LINE, {
      x: step.x + 0.7,
      y: 2,
      w: 0.3,
      h: 0,
      line: { color: "88CCFF", width: 2 }
    });
  }
  // Box
  slide2.addShape(pres.shapes.RECTANGLE, {
    x: step.x,
    y: 1.6,
    w: 0.75,
    h: 0.8,
    fill: { color: "2D2D42" },
    line: { color: "88CCFF", width: 1 }
  });
  // Text
  slide2.addText(step.text, {
    x: step.x,
    y: 2.5,
    w: 0.75,
    h: 0.4,
    fontSize: 11,
    color: "FFFFFF",
    align: "center"
  });
});

// Process diagram (simplified)
slide2.addText("用户输入状态 → AI 理解情绪和目标 → 匹配歌单 → 生成私人 DJ 台词 → 播放音乐", {
  x: 5.2,
  y: 3.2,
  w: 4,
  h: 1,
  fontSize: 16,
  color: "88CCFF",
  align: "center"
});

slide1.addShape(pres.shapes.RECTANGLE, {
  x: 0,
  y: 0,
  w: 10,
  h: 0.4,
  fill: { color: "88CCFF" }
});
slide2.addShape(pres.shapes.RECTANGLE, {
  x: 0,
  y: 0,
  w: 10,
  h: 0.4,
  fill: { color: "88CCFF" }
});

// ========================================
// SLIDE 3: Demo 核心功能
// ========================================
let slide3 = pres.addSlide();
slide3.background = { color: "1E1E2E" };

// Title
slide3.addText("核心功能", {
  x: 0.8,
  y: 0.5,
  w: 8.5,
  h: 0.6,
  fontSize: 36,
  color: "FFFFFF",
  bold: true
});

// Features
slide3.addText([
  { text: "✨ 会说话的私人 DJ", options: { breakLine: true } },
  { text: "🎵 本地 Apple Music 歌单匹配", options: { breakLine: true } },
  { text: "🎭 根据状态切换模式（focus/calm/sleep/energy/nature）", options: { breakLine: true } },
  { text: "🔊 本地音源播放", options: {} }
], {
  x: 0.8,
  y: 1.4,
  w: 4.5,
  h: 2,
  fontSize: 20,
  color: "CCCCCC",
  lineSpacing: 32
});

// Input example box
slide3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 5.2,
  y: 1.4,
  w: 4,
  h: 2.2,
  fill: { color: "2D2D42" },
  line: { color: "88CCFF", width: 1 }
});

slide3.addText("输入示例：", {
  x: 5.4,
  y: 1.6,
  w: 3.6,
  h: 0.4,
  fontSize: 16,
  color: "88CCFF"
});

slide3.addText("我现在很困，但还要学习 2 小时", {
  x: 5.4,
  y: 2.1,
  w: 3.6,
  h: 1.2,
  fontSize: 20,
  color: "FFFFFF",
  italic: true
});

slide3.addShape(pres.shapes.RECTANGLE, {
  x: 0,
  y: 0,
  w: 10,
  h: 0.4,
  fill: { color: "88CCFF" }
});

// ========================================
// SLIDE 4: 技术与未来
// ========================================
let slide4 = pres.addSlide();
slide4.background = { color: "1E1E2E" };

// Left column - Tech stack
slide4.addText("技术架构", {
  x: 0.8,
  y: 0.5,
  w: 4,
  h: 0.6,
  fontSize: 32,
  color: "FFFFFF",
  bold: true
});

slide4.addText([
  { text: "React + Vite 前端", options: { breakLine: true } },
  { text: "MiniMax AgentPlan API 生成 DJ Plan", options: { breakLine: true } },
  { text: "Browser SpeechSynthesis 语音", options: { breakLine: true } },
  { text: "localAudioLibrary 本地歌单", options: { breakLine: true } },
  { text: "HTMLAudioElement 播放", options: {} }
], {
  x: 0.8,
  y: 1.2,
  w: 4,
  h: 2,
  fontSize: 18,
  color: "CCCCCC",
  lineSpacing: 28
});

// Right column - Future
slide4.addText("未来", {
  x: 5.2,
  y: 0.5,
  w: 4,
  h: 0.6,
  fontSize: 32,
  color: "FFFFFF",
  bold: true
});

slide4.addText([
  { text: "接入 Apple Music", options: { breakLine: true } },
  { text: "Fish Audio 真人声音", options: { breakLine: true } },
  { text: "学习用户偏好", options: { breakLine: true } },
  { text: "私人电台节目", options: {} }
], {
  x: 5.2,
  y: 1.2,
  w: 4,
  h: 2,
  fontSize: 18,
  color: "CCCCCC",
  lineSpacing: 28
});

// Closing tagline
slide4.addText("Moodwave — 让音乐懂你的每一刻", {
  x: 0.8,
  y: 4.2,
  w: 8.5,
  h: 0.8,
  fontSize: 28,
  color: "88CCFF",
  bold: true,
  align: "center"
});

slide4.addShape(pres.shapes.RECTANGLE, {
  x: 0,
  y: 0,
  w: 10,
  h: 0.4,
  fill: { color: "88CCFF" }
});

// ========================================
// Save the presentation
// ========================================
pres.writeFile({ fileName: "Moodwave_Presentation.pptx" })
  .then(() => {
    console.log("✅ Presentation created successfully: Moodwave_Presentation.pptx");
  })
  .catch((err) => {
    console.error("❌ Error creating presentation:", err);
  });
