# Liquid Glass UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Moodwave's solid UI surfaces with Apple-style Liquid Glass refraction effects, making the particle background visible through frosted glass panels.

**Architecture:** Wrap existing UI sections (header, chat, footer, player) in `<LiquidGlass>` components from `liquid-glass-react`. Shift the main card from opaque light to semi-transparent dark glass so the particle background and gradients show through. Create a reusable `GlassPanel` component to avoid repeating LiquidGlass props. No changes to data flow, state management, playback logic, or TTS — visual layer only.

**Tech Stack:** React 19, liquid-glass-react, Tailwind CSS, p5.js (existing)

**Browser Caveat:** Safari and Firefox only partially support the displacement effect (blur visible, displacement not). Demo in Chrome for full effect.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `package.json` | Add liquid-glass-react dependency |
| Create | `src/components/GlassPanel.jsx` | Reusable wrapper around LiquidGlass with Moodwave defaults |
| Modify | `src/App.jsx` | Apply GlassPanel to main card, header, chat, footer, player |
| Modify | `src/components/ParticleCanvas.jsx` | Increase particle visibility (count, alpha, size) for glass backdrop |
| Modify | `src/components/NeteaseLoginPanel.jsx` | Adapt colors from light to dark glass theme |
| Modify | `src/index.css` | Add glass-related utility styles |

---

## Task 1: Install liquid-glass-react and Verify

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
cd G:/AI_Projects/ai-hackathon-template
npm install liquid-glass-react
```

- [ ] **Step 2: Verify it installed correctly**

```bash
npm ls liquid-glass-react
```

Expected: shows version number, no errors.

- [ ] **Step 3: Quick import smoke test**

Add a temporary import to `src/App.jsx` at the top (will be refined in later tasks):

```jsx
import LiquidGlass from 'liquid-glass-react'
```

- [ ] **Step 4: Start dev server and verify no import errors**

```bash
npm run dev
```

Open browser to localhost:5173. Expected: page loads without console errors about `liquid-glass-react`.

- [ ] **Step 5: Remove the temporary import**

Remove the `import LiquidGlass` line added in Step 3. It will be added properly via GlassPanel in Task 2.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add liquid-glass-react dependency"
```

---

## Task 2: Create GlassPanel Wrapper Component

**Files:**
- Create: `src/components/GlassPanel.jsx`

The same LiquidGlass props (`displacementScale`, `blurAmount`, `saturation`, `aberrationIntensity`, `elasticity`, `cornerRadius`) will be used across multiple UI sections. Extract them into a reusable wrapper.

- [ ] **Step 1: Create GlassPanel.jsx**

```jsx
import LiquidGlass from 'liquid-glass-react'

const PRESETS = {
  card: {
    displacementScale: 45,
    blurAmount: 0.12,
    saturation: 160,
    aberrationIntensity: 1.5,
    elasticity: 0.1,
    cornerRadius: 34,
    mode: 'standard',
  },
  panel: {
    displacementScale: 55,
    blurAmount: 0.08,
    saturation: 140,
    aberrationIntensity: 2,
    elasticity: 0.15,
    cornerRadius: 24,
    mode: 'standard',
  },
  bubble: {
    displacementScale: 30,
    blurAmount: 0.06,
    saturation: 130,
    aberrationIntensity: 1,
    elasticity: 0.1,
    cornerRadius: 16,
    mode: 'standard',
  },
  player: {
    displacementScale: 50,
    blurAmount: 0.1,
    saturation: 150,
    aberrationIntensity: 2,
    elasticity: 0.2,
    cornerRadius: 24,
    mode: 'standard',
  },
}

export default function GlassPanel({ preset = 'panel', children, className = '', style = {}, ...rest }) {
  const base = PRESETS[preset] || PRESETS.panel

  return (
    <LiquidGlass
      {...base}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </LiquidGlass>
  )
}
```

- [ ] **Step 2: Verify no import errors**

```bash
npm run dev
```

Expected: page loads. GlassPanel is not used yet so no visual change.

- [ ] **Step 3: Commit**

```bash
git add src/components/GlassPanel.jsx
git commit -m "feat: create reusable GlassPanel wrapper component"
```

---

## Task 3: Enhance Background for Glass Transparency

**Files:**
- Modify: `src/App.jsx` (background layer only, lines 809-828)
- Modify: `src/components/ParticleCanvas.jsx` (particle visibility)

Liquid Glass effects need a visually rich background to refract. The current background is very dark (`#05070F`) with subtle gradients and low-alpha particles. We need to make the background more vivid so the glass has something to show through.

- [ ] **Step 1: Update background gradients in App.jsx**

Replace the outer background div (line 809):

```jsx
// OLD
<div className="relative h-screen w-full overflow-hidden font-sans" style={{ background: '#05070F' }}>

// NEW
<div className="relative h-screen w-full overflow-hidden font-sans" style={{ background: '#0A0C18' }}>
```

Replace the inner gradient layer (lines 812-819):

```jsx
// OLD
<div
  className="absolute inset-0"
  style={{
    background: `
      radial-gradient(ellipse at 12% 12%, rgba(34, 211, 238, 0.18), transparent 58%),
      radial-gradient(ellipse at 88% 88%, rgba(124, 92, 255, 0.15), transparent 58%),
      radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.35), transparent 62%)
    `
  }}
/>

// NEW
<div
  className="absolute inset-0"
  style={{
    background: `
      radial-gradient(ellipse at 12% 12%, rgba(34, 211, 238, 0.30), transparent 55%),
      radial-gradient(ellipse at 88% 88%, rgba(124, 92, 255, 0.28), transparent 55%),
      radial-gradient(ellipse at 50% 30%, rgba(99, 102, 241, 0.12), transparent 50%),
      radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.20), transparent 62%)
    `
  }}
/>
```

Replace the dot grid overlay (lines 821-827):

```jsx
// OLD
<div
  className="absolute inset-0 opacity-[0.025]"
  style={{
    backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
    backgroundSize: '26px 26px'
  }}
/>

// NEW
<div
  className="absolute inset-0 opacity-[0.06]"
  style={{
    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 0.8px, transparent 0.8px)',
    backgroundSize: '22px 22px'
  }}
/>
```

- [ ] **Step 2: Increase particle visibility in ParticleCanvas.jsx**

Update the Particle class properties (around lines 16-21):

```jsx
// OLD
this.size = p.random(0.8, 1.8)
this.alpha = p.random(10, 30)

// NEW
this.size = p.random(1.2, 3.0)
this.alpha = p.random(25, 65)
```

Update particle count (around line 13):

```jsx
// OLD
const particleCount = 20

// NEW
const particleCount = 30
```

Update particle color for more vibrancy (around line 40):

```jsx
// OLD
p.fill(90, 100, 150, this.alpha)

// NEW
p.fill(140, 160, 220, this.alpha)
```

- [ ] **Step 3: Verify visually in browser**

```bash
npm run dev
```

Expected: Background should be noticeably richer — brighter cyan/purple gradients, more visible dot grid, larger/brighter particles floating around. The overall feel should be "colorful dark" rather than "near-black".

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/ParticleCanvas.jsx
git commit -m "feat: enhance background gradients and particle visibility for glass backdrop"
```

---

## Task 4: Convert Main Card and Header to Glass

**Files:**
- Modify: `src/App.jsx` (main card container + header, lines 832-890)

This is the biggest visual change. The main card switches from an opaque light gradient to a dark semi-transparent glass panel.

- [ ] **Step 1: Import GlassPanel at top of App.jsx**

Add after the existing imports:

```jsx
import GlassPanel from './components/GlassPanel'
```

- [ ] **Step 2: Replace main card container**

Replace the card div (lines 833-841):

```jsx
// OLD
<div
  className="flex h-[min(760px,calc(100vh-24px))] w-[460px] max-w-[calc(100vw-18px)] flex-col overflow-hidden"
  style={{
    borderRadius: '34px',
    background: 'linear-gradient(180deg, #FBFAF6 0%, #F4F1EA 100%)',
    border: '1px solid rgba(255,255,255,0.35)',
    boxShadow: '0 30px 90px rgba(0,0,0,0.45), 0 0 80px rgba(124,92,255,0.12)'
  }}
>

// NEW
<GlassPanel
  preset="card"
  className="flex h-[min(760px,calc(100vh-24px))] w-[460px] max-w-[calc(100vw-18px)] flex-col overflow-hidden"
  style={{
    background: 'linear-gradient(180deg, rgba(15,18,35,0.72) 0%, rgba(10,12,28,0.82) 100%)',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 30px 90px rgba(0,0,0,0.45), 0 0 60px rgba(124,92,255,0.15)',
  }}
>
```

Don't forget to close with `</GlassPanel>` instead of `</div>` at the end of the card.

- [ ] **Step 3: Update header section**

The header (line 842) stays as-is structurally, but the status bar inside needs color updates. Replace the status bar container (lines 868-870):

```jsx
// OLD
<div
  className="rounded-2xl px-3 py-2"
  style={{ background: 'rgba(255,255,255,0.68)', border: '1px solid rgba(17,24,39,0.05)' }}
>

// NEW
<GlassPanel
  preset="bubble"
  className="rounded-2xl px-3 py-2"
  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
>
```

Close with `</GlassPanel>`.

Update text colors in the header for dark background readability:

```jsx
// Claudio title (line 852)
// OLD: style={{ color: '#1F2937' }}
// NEW:
style={{ color: '#F3F4F6' }}

// Time display (line 863)
// OLD: style={{ color: '#1F2937' }}
// NEW:
style={{ color: '#D1D5DB' }}

// Status text (line 857-858)
// OLD: style={{ color: '#6B7280' }}
// NEW:
style={{ color: '#9CA3AF' }}

// "Radio ready" text (line 884)
// OLD: style={{ color: '#9CA3AF' }}
// NEW:
style={{ color: '#6B7280' }}
```

Update source badges (line 878):

```jsx
// OLD: style={{ background: '#FFFFFF', color: '#737782', border: '1px solid rgba(17,24,39,0.05)' }}
// NEW:
style={{ background: 'rgba(255,255,255,0.08)', color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.06)' }}
```

Update the Claudio avatar circle (line 847):

```jsx
// OLD: style={{ background: 'linear-gradient(135deg, #111217, #7C5CFF)' }}
// NEW:
style={{ background: 'linear-gradient(135deg, #7C5CFF, #22D3EE)' }}
```

- [ ] **Step 4: Verify in browser**

Expected: Main card is now a dark frosted glass panel. Particles and gradient background are visible through it. Header text is light-colored and readable. The "C" avatar has a purple-to-cyan gradient.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: convert main card and header to liquid glass"
```

---

## Task 5: Convert Chat Area and Messages to Glass

**Files:**
- Modify: `src/App.jsx` (chat main section + renderChatMessage, lines 748-806, 892-924)

- [ ] **Step 1: Update chat area background**

Replace the main chat area (lines 892-896):

```jsx
// OLD
<main
  ref={chatFeedRef}
  className="flex-1 space-y-3 overflow-y-auto px-5 pb-4 pt-2 sm:px-6"
  style={{ backgroundImage: 'radial-gradient(rgba(17,24,39,0.035) 0.6px, transparent 0.6px)', backgroundSize: '13px 13px' }}
>

// NEW
<main
  ref={chatFeedRef}
  className="flex-1 space-y-3 overflow-y-auto px-5 pb-4 pt-2 sm:px-6"
  style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.02) 0.6px, transparent 0.6px)', backgroundSize: '13px 13px' }}
>
```

- [ ] **Step 2: Update user message bubbles in renderChatMessage**

In the `renderChatMessage` function, update the user message style (lines 753-758):

```jsx
// OLD
<div
  className="max-w-[82%] rounded-2xl rounded-tr-md px-4 py-3 text-sm leading-relaxed"
  style={{ background: '#EDE9FE', color: '#312E81' }}
>

// NEW
<GlassPanel
  preset="bubble"
  className="max-w-[82%] rounded-2xl rounded-tr-md px-4 py-3 text-sm leading-relaxed"
  style={{ background: 'rgba(124,92,255,0.18)', border: '1px solid rgba(124,92,255,0.20)' }}
>
  <span style={{ color: '#E0D4FF' }}>{message.text}</span>
</GlassPanel>
```

Note: Since the user message div just wraps text, change the closing `</div>` to `</GlassPanel>` accordingly. The text color moves to a child span.

- [ ] **Step 3: Update system message style**

Update system messages (lines 766-770):

```jsx
// OLD
<span
  className="rounded-full px-3 py-1 text-[11px] font-medium"
  style={{ background: 'rgba(17,24,39,0.06)', color: '#7A7F89' }}
>

// NEW
<span
  className="rounded-full px-3 py-1 text-[11px] font-medium"
  style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
>
```

- [ ] **Step 4: Update DJ message bubbles**

Update DJ/track_story message container (lines 783-788):

```jsx
// OLD
<div
  className="max-w-[88%] rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed transition-all"
  style={{
    background: isTrackStory ? '#F3F0E8' : '#FFFFFF',
    color: '#1F2937',
    border: isActive ? '1px solid rgba(124,92,255,0.36)' : '1px solid rgba(17,24,39,0.05)',
    boxShadow: isActive ? '0 10px 24px rgba(124,92,255,0.14)' : '0 4px 14px rgba(17,24,39,0.04)'
  }}
>

// NEW - wrap in GlassPanel
<GlassPanel
  preset="bubble"
  className="max-w-[88%] rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed transition-all"
  style={{
    background: isTrackStory ? 'rgba(139,120,80,0.10)' : 'rgba(255,255,255,0.06)',
    border: isActive ? '1px solid rgba(124,92,255,0.36)' : '1px solid rgba(255,255,255,0.06)',
    boxShadow: isActive ? '0 10px 24px rgba(124,92,255,0.14)' : 'none',
  }}
>
```

Update DJ message text colors inside the bubble:

```jsx
// "Claudio" label (line 791)
// OLD: style={{ color: '#6B7280' }}
// NEW:
style={{ color: '#9CA3AF' }}

// Message text is rendered via highlightKeywords - the default text color
// OLD: color: '#1F2937' (on the parent div)
// NEW: add to the GlassPanel wrapper's children or use a wrapping span:
<span style={{ color: '#E5E7EB' }}>
  {highlightKeywords(message.text, currentPlan?.highlights || [])}
</span>

// "Track note" badge (line 794)
// OLD: style={{ background: '#FFFFFF', color: '#8A8D95' }}
// NEW:
style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}
```

Close DJ bubbles with `</GlassPanel>` instead of `</div>`.

- [ ] **Step 5: Update typing indicator**

Replace the planning indicator (lines 905-909):

```jsx
// OLD
<div
  className="rounded-2xl rounded-tl-md px-4 py-3"
  style={{ background: '#FFFFFF', color: '#6B7280', border: '1px solid rgba(17,24,39,0.05)' }}
>

// NEW
<div
  className="rounded-2xl rounded-tl-md px-4 py-3"
  style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.06)' }}
>
```

- [ ] **Step 6: Update error/warning messages**

Replace error display (lines 917-920):

```jsx
// OLD
style={{ background: 'rgba(245,158,11,0.12)', color: '#92400E' }}

// NEW
style={{ background: 'rgba(245,158,11,0.15)', color: '#FCD34D' }}
```

- [ ] **Step 7: Update highlightKeywords background**

In the `highlightKeywords` function (line 199):

```jsx
// OLD
className="rounded-md bg-[#A7F3D0] px-1.5 py-0.5 text-[#065F46]"

// NEW
className="rounded-md px-1.5 py-0.5"
style={{ background: 'rgba(167,243,208,0.18)', color: '#6EE7B7' }}
```

- [ ] **Step 8: Verify in browser**

Expected: Chat messages appear as glass bubbles floating over the dark glass card. User messages have a purple tint, DJ messages are slightly frosted, system messages are subtle. Text is readable (light on dark).

- [ ] **Step 9: Commit**

```bash
git add src/App.jsx
git commit -m "feat: convert chat messages to glass bubbles"
```

---

## Task 6: Convert Footer and Player to Glass

**Files:**
- Modify: `src/App.jsx` (footer section, lines 926-1171)

- [ ] **Step 1: Update footer container**

Replace the footer element (lines 926-932):

```jsx
// OLD
<footer
  className="shrink-0 px-4 pb-4 pt-3 sm:px-5"
  style={{
    background: 'rgba(250,248,243,0.96)',
    borderTop: '1px solid rgba(17,24,39,0.06)',
    boxShadow: '0 -18px 35px rgba(17,24,39,0.05)'
  }}
>

// NEW
<footer
  className="shrink-0 px-4 pb-4 pt-3 sm:px-5"
  style={{
    background: 'rgba(255,255,255,0.04)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  }}
>
```

- [ ] **Step 2: Update "Up next" playlist toggle button**

Replace (lines 938-939):

```jsx
// OLD
style={{ background: 'rgba(255,255,255,0.76)', color: '#4B5563', border: '1px solid rgba(17,24,39,0.05)' }}

// NEW
style={{ background: 'rgba(255,255,255,0.06)', color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.06)' }}
```

- [ ] **Step 3: Update playlist dropdown**

Replace playlist container (lines 952-953):

```jsx
// OLD
style={{ background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(17,24,39,0.05)' }}

// NEW
style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
```

Update playlist track items — current track (line 961):

```jsx
// OLD
background: index === currentTrackIndex ? '#FFFFFF' : 'transparent',
boxShadow: index === currentTrackIndex ? '0 6px 16px rgba(124,92,255,0.09)' : 'none'

// NEW
background: index === currentTrackIndex ? 'rgba(124,92,255,0.12)' : 'transparent',
boxShadow: index === currentTrackIndex ? '0 6px 16px rgba(124,92,255,0.15)' : 'none'
```

Track number badge (line 967):

```jsx
// OLD
background: index === currentTrackIndex ? '#111217' : 'rgba(17,24,39,0.05)',
color: index === currentTrackIndex ? '#FFFFFF' : '#8A8D95'

// NEW
background: index === currentTrackIndex ? 'rgba(124,92,255,0.30)' : 'rgba(255,255,255,0.06)',
color: index === currentTrackIndex ? '#FFFFFF' : '#9CA3AF'
```

Track title/artist text (lines 975-979):

```jsx
// OLD
<p className="truncate text-xs font-semibold" style={{ color: '#111217' }}>
<p className="truncate text-[11px]" style={{ color: '#8A8D95' }}>

// NEW
<p className="truncate text-xs font-semibold" style={{ color: '#F3F4F6' }}>
<p className="truncate text-[11px]" style={{ color: '#9CA3AF' }}>
```

Source badge (line 985):

```jsx
// OLD
background: index === currentTrackIndex ? 'rgba(124,92,255,0.1)' : 'rgba(17,24,39,0.05)',
color: index === currentTrackIndex ? '#7C5CFF' : '#8A8D95'

// NEW
background: index === currentTrackIndex ? 'rgba(124,92,255,0.20)' : 'rgba(255,255,255,0.06)',
color: index === currentTrackIndex ? '#A78BFA' : '#9CA3AF'
```

- [ ] **Step 4: Update dark player section**

Wrap the player section in GlassPanel. Replace (lines 1002-1004):

```jsx
// OLD
<section
  className="rounded-[24px] px-3.5 py-3"
  style={{ background: '#111217', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 18px 34px rgba(17,24,39,0.22)' }}
>

// NEW
<GlassPanel
  preset="player"
  className="rounded-[24px] px-3.5 py-3"
  style={{ background: 'rgba(17,18,23,0.75)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 18px 34px rgba(0,0,0,0.22)' }}
>
```

Close with `</GlassPanel>` instead of `</section>`.

- [ ] **Step 5: Update input area**

Replace input field (lines 1129-1133):

```jsx
// OLD
className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-xs shadow-sm focus:outline-none"
style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1F2937' }}

// NEW
className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-xs shadow-sm focus:outline-none"
style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#F3F4F6' }}
```

Add placeholder color via CSS. In `src/index.css`, add:

```css
input::placeholder {
  color: rgba(156, 163, 175, 0.7);
}
```

- [ ] **Step 6: Update quick input buttons**

Replace quick button styles (lines 1153-1154):

```jsx
// OLD
style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#6B7280' }}

// NEW
style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#D1D5DB' }}
```

- [ ] **Step 7: Update "New wave" and bottom info text**

Replace reason text (line 1165):

```jsx
// OLD: style={{ color: '#9CA3AF' }}
// NEW:
style={{ color: '#6B7280' }}
```

Replace "New wave" button (line 1168):

```jsx
// OLD: style={{ color: '#6B7280' }}
// NEW:
style={{ color: '#9CA3AF' }}
```

- [ ] **Step 8: Update Replay and Stop buttons**

Replay button (line 1111):

```jsx
// OLD: style={{ background: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}
// NEW:
style={{ background: 'rgba(255,255,255,0.08)', color: '#E5E7EB' }}
```

Stop button (line 1119):

```jsx
// OLD: style={{ background: 'rgba(239,68,68,0.18)', color: '#FCA5A5' }}
// NEW:
style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5' }}
```

- [ ] **Step 9: Verify in browser**

Expected: Footer is now transparent/glass. Playlist items float over the glass. The dark player section has a frosted glass look. Input field and buttons use dark glass styling. All text is readable.

- [ ] **Step 10: Commit**

```bash
git add src/App.jsx src/index.css
git commit -m "feat: convert footer and player controls to glass"
```

---

## Task 7: Update NeteaseLoginPanel for Dark Glass Theme

**Files:**
- Modify: `src/components/NeteaseLoginPanel.jsx`

- [ ] **Step 1: Import GlassPanel**

Add at top:

```jsx
import GlassPanel from './GlassPanel'
```

- [ ] **Step 2: Convert the outer section to glass**

Replace the section element (lines 108-114):

```jsx
// OLD
<section
  className="rounded-2xl px-4 py-3"
  style={{
    background: '#FFFFFF',
    border: '1px solid rgba(17,24,39,0.06)',
    boxShadow: '0 8px 22px rgba(17,24,39,0.05)'
  }}
>

// NEW
<GlassPanel
  preset="bubble"
  className="rounded-2xl px-4 py-3"
  style={{
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.06)',
  }}
>
```

Close with `</GlassPanel>`.

- [ ] **Step 3: Update text colors**

Status text (line 123):

```jsx
// OLD: style={{ color: '#111217' }}
// NEW:
style={{ color: '#F3F4F6' }}
```

Description text (line 127):

```jsx
// OLD: style={{ color: '#737782' }}
// NEW:
style={{ color: '#9CA3AF' }}
```

Logout button (line 137):

```jsx
// OLD: style={{ background: 'rgba(17,24,39,0.08)', color: '#111217' }}
// NEW:
style={{ background: 'rgba(255,255,255,0.08)', color: '#E5E7EB' }}
```

Manual cookie input (line 174):

```jsx
// OLD: style={{ background: '#FFF7ED', border: '1px solid rgba(251,146,60,0.22)', color: '#1F2937' }}
// NEW:
style={{ background: 'rgba(255,247,237,0.06)', border: '1px solid rgba(251,146,60,0.15)', color: '#F3F4F6' }}
```

Import button (line 182):

```jsx
// OLD: style={{ background: '#111217' }}
// NEW:
style={{ background: 'rgba(255,255,255,0.10)' }}
```

QR hint text (line 161):

```jsx
// OLD: style={{ color: '#92400E' }}
// NEW:
style={{ color: '#FCD34D' }}
```

- [ ] **Step 4: Verify in browser**

Expected: Login panel appears as a glass card with light text. QR code and input field are visible and styled consistently with the rest of the glass UI.

- [ ] **Step 5: Commit**

```bash
git add src/components/NeteaseLoginPanel.jsx
git commit -m "feat: adapt NeteaseLoginPanel for dark glass theme"
```

---

## Task 8: Polish — Scrollbar, Selection, and Final Touches

**Files:**
- Modify: `src/index.css`
- Modify: `src/App.jsx` (minor tweaks)

- [ ] **Step 1: Add glass-themed scrollbar to index.css**

Append to `src/index.css`:

```css
/* Glass-themed scrollbar */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.20);
}

/* Text selection */
::selection {
  background: rgba(124, 92, 255, 0.35);
  color: #F3F4F6;
}
```

- [ ] **Step 2: Update SoundWaves colors for dark glass**

In the `SoundWaves` component (line 64):

```jsx
// OLD
background: isSpeaking ? '#7C5CFF' : '#111217',
opacity: isPlaying || isSpeaking ? 0.72 : 0.24

// NEW
background: isSpeaking ? '#A78BFA' : '#E5E7EB',
opacity: isPlaying || isSpeaking ? 0.65 : 0.20
```

- [ ] **Step 3: Update progress bar colors**

In the progress bar section (lines 1071-1085), update bar colors:

```jsx
// OLD
background: isActive ? '#A7F3D0' : 'rgba(255,255,255,0.18)',
opacity: isActive ? 0.95 : 0.82

// NEW
background: isActive ? '#6EE7B7' : 'rgba(255,255,255,0.10)',
opacity: isActive ? 0.85 : 0.60
```

- [ ] **Step 4: Update "ON AIR" / "PAUSED" indicator text**

In the player section (line 1013):

```jsx
// OLD: style={{ color: '#A7F3D0' }}
// NEW:
style={{ color: '#6EE7B7' }}
```

- [ ] **Step 5: Update hover state on playlist track items**

In the playlist track button (line 959):

```jsx
// OLD
className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all hover:bg-white"

// NEW
className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all"
// (hover:bg-white doesn't work on dark glass — remove it)
```

- [ ] **Step 6: Final visual verification**

```bash
npm run dev
```

Checklist:
- [ ] Background particles visible through glass panels
- [ ] Chat bubbles have glass effect with readable text
- [ ] Player controls work and look cohesive
- [ ] Playlist dropdown is readable
- [ ] Input area and buttons are styled correctly
- [ ] NeteaseLoginPanel matches the dark glass theme
- [ ] Scrollbar is thin and subtle
- [ ] Sound waves animation is visible on dark background
- [ ] No white/light-only elements that look out of place

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/index.css src/components/NeteaseLoginPanel.jsx
git commit -m "feat: polish glass UI — scrollbar, colors, hover states"
```

---

## Verification

After all tasks, run the full app and verify:

```bash
npm run dev
```

1. Page loads without errors
2. Particle background is visible through all glass panels
3. Chat messages render as glass bubbles with readable text
4. Player section has frosted glass look
5. Quick buttons ("学习", "睡眠", "运动", "安抚") are visible
6. Type a message and press Enter — full flow works (plan generation, DJ intro, music playback)
7. Playlist toggle shows/hides correctly
8. Volume slider and playback controls function normally
9. Browser: test in Chrome for full displacement effect
10. Run `npm run build` to verify no build errors
