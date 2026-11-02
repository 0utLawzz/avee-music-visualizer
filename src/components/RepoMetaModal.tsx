import React, { useState } from 'react';
import { X, Copy, Check, Github, Code2, Tag, Terminal, Sparkles, BookOpen } from 'lucide-react';

interface RepoMetaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RepoMetaModal: React.FC<RepoMetaModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const metadata = {
    repoNames: [
      { name: 'pulsecraft-studio', desc: 'Recommended flagship name - modern & brandable' },
      { name: 'avee-music-visualizer', desc: 'Direct keyword match for Avee Player & music creators' },
      { name: 'vibenova-audio-creator', desc: 'Catchy creative media generator' },
      { name: 'trap-nation-visualizer-web', desc: 'High-search volume for EDM/Trap YouTube creators' }
    ],
    shortDescription:
      'High-performance Web Audio API visualizer studio with automatic beat detection, Avee/Trap Nation templates, custom timed overlays, transition engine, and social media video export (16:9, 9:16, 1:1).',
    topics: [
      'audio-visualizer',
      'music-visualizer',
      'web-audio-api',
      'canvas-animation',
      'beat-detection',
      'video-generator',
      'media-recorder',
      'avee-player',
      'trap-nation',
      'react',
      'typescript',
      'tailwind-css',
      'vite',
      'nodejs',
      'audio-processing'
    ],
    technologies: {
      runtime: 'Node.js (v18+) with Express backend dev server',
      frontend: 'React 19, TypeScript, Vite, Tailwind CSS v4',
      audioEngine: 'Web Audio API (AnalyserNode, FFT frequency & time-domain analysis, procedural synthesizer)',
      graphics: 'HTML5 2D Canvas (60 FPS hardware accelerated, dynamic bloom, blur/wipe transition engine)',
      exportEngine: 'MediaStream captureStream + MediaRecorder (VP9/VP8/H.264, WebM/MP4, high bitrate 12Mbps)',
      iconsMotion: 'Lucide React, Motion (Framer Motion)'
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-rose-400 border border-slate-700">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Repository & Project Metadata</h3>
              <p className="text-xs text-slate-400">
                Optimized names, descriptions, topics, and tech stack for GitHub / GitLab
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto py-5 space-y-6 pr-1">
          {/* 1. Suggested Repo Names */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              1. Suggested Repository Names
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {metadata.repoNames.map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-white block">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-slate-400">{item.desc}</span>
                  </div>

                  <button
                    onClick={() => copyToClipboard(item.name, `name_${idx}`)}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg border border-slate-800 transition-colors ml-2 shrink-0"
                    title="Copy repository name"
                  >
                    {copiedKey === `name_${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Repository Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                2. Repository Description / About
              </span>
              <button
                onClick={() => copyToClipboard(metadata.shortDescription, 'desc')}
                className="flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300"
              >
                {copiedKey === 'desc' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy Description
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
              {metadata.shortDescription}
            </div>
          </div>

          {/* 3. GitHub Topics & Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                3. GitHub Topics (Tags)
              </span>
              <button
                onClick={() => copyToClipboard(metadata.topics.join(', '), 'topics')}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300"
              >
                {copiedKey === 'topics' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Copied All
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy All Tags
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950 rounded-xl border border-slate-800">
              {metadata.topics.map((t) => (
                <span
                  key={t}
                  className="text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>

          {/* 4. Technology Stack (Node.js vs Python vs Java) */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" />
              4. Technology Stack & Architecture
            </span>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                <span className="font-bold text-white w-36 shrink-0">Runtime / Backend:</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {metadata.technologies.runtime}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                <span className="font-bold text-white w-36 shrink-0">Frontend Framework:</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {metadata.technologies.frontend}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                <span className="font-bold text-white w-36 shrink-0">Audio Processing:</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {metadata.technologies.audioEngine}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                <span className="font-bold text-white w-36 shrink-0">Graphics & FX:</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {metadata.technologies.graphics}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                <span className="font-bold text-white w-36 shrink-0">Video Rendering:</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {metadata.technologies.exportEngine}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Note: This application runs on <strong>Node.js</strong> for development and serving, while the entire audio analysis, 60 FPS visualizer rendering, and video encoding run client-side in the browser via Web Audio API & MediaRecorder.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
