# PulseCraft Studio - Technical Edition (Avee & Phonk Audio Visualizer)

A high-performance, browser-native audio visualizer and long-form video clipper built with **React 19**, **TypeScript**, **Tailwind CSS v4**, **Web Audio API**, and **HTML5 Canvas 2D / MediaRecorder**. 

Inspired by legendary music channels and visualizer software (Avee Player, Trap Nation, Monstercat, Phonk Drift channels), PulseCraft Studio allows users to upload any audio track (including 60–120+ minute DJ sets, podcast episodes, or live concerts), choose responsive visualizer templates, mark multiple clip segments, preview real-time reactivity in a Mini-Visualizer, and batch render high-framerate social media videos in one go.

---

## 🌟 Key Features

### 1. Real-Time Canvas Visualizer Engine
- **11+ Visualizer Templates**:
  - `Phonk Crown`: Double-contour glowing wolf/crown shield with bouncing bars and bass recoil.
  - `Avee Classic`: Circular spectrum ring with floating particles, center badge, and reactive bass pulse.
  - `Trap Nation`: Iconic high-density pulsing bass circle with floating particles and camera kick.
  - `Cyber Horizon`: Retro 80s synthwave perspective wireframe grid with neon skyline sun.
  - `Neon Box Frame`: Double neon picture frame with running corner glow lights and floating hearts.
  - `Tunnel Portal`: 3D infinite lightspeed tunnel with warping cubes and dynamic camera zoom.
  - `Twin Woofers`: Dual subwoofers with pulsing speaker cones and dual wave visualizer arcs.
  - `Monstercat Bars`: Classic horizontal bottom spectrum analyzer with high-precision decibel decay.
- **Smart Aspect Ratio Framing**:
  - **9:16 Vertical**: Optimized for TikTok, Instagram Reels, and YouTube Shorts.
  - **16:9 Landscape**: High-definition cinematic master for YouTube and desktop displays.
  - **1:1 Square**: Classic Instagram Feed format with balanced square framing.
  - **4:5 Portrait**: Social feed vertical orientation.

### 2. Long-Form Audio Clipper (60M+ & 120M+)
- **RAM-Efficient Audio Streaming**: Streams 1 to 2+ hour audio files via `HTMLAudioElement` object URLs, eliminating browser memory spikes and tab crashes.
- **Dual-Layer Timeline Navigation**:
  - *Macro Overview Track*: Shows the full 0:00 to 60:00+ duration at a glance with colored blocks representing each marked clip.
  - *Zoom Scrubber (`1x`, `5x`, `15x`, `30x`)*: Pinpoints drops, transitions, and hooks down to sub-second accuracy (`hh:mm:ss.s`).
- **Marking Controls**: Precision `[ MARK IN` and `] MARK OUT` tagging, plus one-click presets (`+15s Hook`, `+30s Reel`, `+60s Drop`, `+3m Track`).

### 3. Mini-Visualizer Live Preview Panel
- Embedded real-time preview panel directly inside the Clipper view.
- Live rendering at full 60 FPS showing exactly how the selected clip reacts to the visualizer template, aspect ratio, frequency bars, and particles before exporting.
- Includes expandable fullscreen preview and real-time beat pulse indicator.

### 4. Sequential Batch Processing Queue (`BatchQueue`)
- Queue multiple clips from the same audio track.
- Controls to reorder, remove individual tasks, or clear the entire queue.
- One-click **"EXPORT BATCH"** executes sequential rendering of all queued clips with progress tracking and automatic file downloads.

### 5. Session Export History Vault
- Sidebar vault tab that stores recently rendered video clips in memory.
- Instant **"SAVE ⤓"** button to re-download files without re-rendering.
- Built-in video player modal for previewing exported videos.

### 6. Automatic Beat Detection & Drop Suggestions
- Web Audio API `AnalyserNode` transient analysis.
- Scans sub-bass energy flux (20–120 Hz) to detect sudden energy spikes and rhythmic drops.
- Displays yellow diamond markers (`◆ DROP`) directly on both timeline layers.
- Quick actions: `SNAP IN ⇥`, `SNAP OUT ⇤`, and `+ CLIP 30s AT DROP`.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Framework & UI** | React 19, TypeScript, Tailwind CSS v4, Motion, Lucide React |
| **Audio Processing** | Web Audio API (`AudioContext`, `AnalyserNode`, `MediaElementAudioSourceNode`, procedural oscillators) |
| **Rendering Engine** | HTML5 Canvas 2D, Damped Harmonic Spring Physics, Custom Shaders/Glow Effects |
| **Video Encoding** | Browser `MediaRecorder` API (`video/webm; codecs=vp9,opus` / `h264`), Canvas `captureStream` |
| **Build & Tooling** | Vite 8, ESBuild, PostCSS, TSX |
| **Target Deployment** | Vercel, Cloud Run, GitHub Pages, Netlify |

---

## 🚀 Local Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Package Manager**: `npm`, `pnpm`, or `bun`

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/pulsecraft-studio.git
cd pulsecraft-studio
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(No external API keys are required for core visualizer playback and video rendering, as the entire engine runs client-side in the browser).*

### 4. Start Local Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000` to start using the visualizer.

### 5. Build for Production
```bash
npm run build
```
Production assets are generated in the `/dist` directory.

---

## ☁️ Deployment Guide (Vercel)

PulseCraft Studio is fully compatible with Vercel as a single-page application (SPA).

1. Push your repository to **GitHub**.
2. Go to [Vercel Dashboard](https://vercel.com/new) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Verify the default project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. The included `vercel.json` file automatically handles single-page routing (`/*` -> `index.html`) and static asset caching.
6. Click **Deploy**. Your app will be live on `*.vercel.app` in under 60 seconds!

---

## 🗄️ Database & User Authentication (Supabase Recommendation)

For full details on adding user accounts, saved project records, and cloud storage, see [`DEPLOYMENT.md`](./DEPLOYMENT.md).

### Recommended Solution: Supabase
- **Database**: PostgreSQL (for saving user profiles, marked clip timestamps, custom visualizer presets, and export history).
- **Authentication**: Supabase Auth (Email/Password, Magic Link, Google/GitHub OAuth).
- **Storage**: S3-compatible cloud storage (for storing user watermark logos, custom video backgrounds, and rendered MP4/WebM clips).
- **Vercel Integration**: Available with 1-click integration in the Vercel Marketplace.

---

## 📄 License
PulseCraft Studio is licensed under the **Apache-2.0 License**.
