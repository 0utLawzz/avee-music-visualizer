import React from 'react';
import { ExportHistoryItem } from '../types/visualizer';
import { formatLongTime } from '../constants/exportFormats';

interface ExportHistoryPanelProps {
  history: ExportHistoryItem[];
  onDownloadItem: (item: ExportHistoryItem) => void;
  onPreviewItem: (item: ExportHistoryItem) => void;
  onRemoveItem: (id: string) => void;
  onClearHistory: () => void;
}

export const ExportHistoryPanel: React.FC<ExportHistoryPanelProps> = ({
  history,
  onDownloadItem,
  onPreviewItem,
  onRemoveItem,
  onClearHistory
}) => {
  return (
    <div className="bg-[#141517] border border-[rgba(240,240,240,0.12)] p-4 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(240,240,240,0.08)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-space text-[10px] bg-emerald-500 text-black font-extrabold px-1.5 py-0.5 uppercase tracking-wider">
              SESSION VAULT
            </span>
            <h3 className="font-syne text-sm font-bold text-white tracking-tight">
              EXPORT HISTORY ({history.length})
            </h3>
          </div>
          <p className="font-space text-[11px] text-[rgba(240,240,240,0.5)] mt-0.5">
            Recently rendered clips stored in memory for instant re-download.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="font-space text-[10px] text-white/50 hover:text-red-400 px-2.5 py-1 border border-white/10 hover:border-red-400/40 transition-colors"
            title="Clear export history"
          >
            CLEAR VAULT
          </button>
        )}
      </div>

      {/* History Items List */}
      <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px]">
        {history.map((item) => (
          <div
            key={item.id}
            className="p-3 bg-[#0b0c0d] border border-[rgba(240,240,240,0.1)] hover:border-emerald-500/40 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-space text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5">
                    {item.aspectRatio}
                  </span>
                  <span className="font-space text-[9px] text-[#ff3e00] font-bold">
                    {item.blobSizeMb} MB
                  </span>
                  <span className="font-space text-[9px] text-white/50">
                    {item.fps} FPS • {item.template}
                  </span>
                  <span className="font-space text-[9px] text-white/40">
                    {new Date(item.exportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <h4 className="font-bold text-xs text-white truncate">{item.clipName}</h4>

                <div className="font-space text-[10px] text-[rgba(240,240,240,0.5)] mt-0.5">
                  Range: <span className="text-white">{formatLongTime(item.startTime)}</span> →{' '}
                  <span className="text-white">{formatLongTime(item.endTime)}</span> ({item.duration.toFixed(1)}s)
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onPreviewItem(item)}
                  className="font-space text-[10px] font-bold bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] px-2 py-1 transition-colors"
                  title="Preview exported video"
                >
                  PREVIEW
                </button>

                <button
                  onClick={() => onDownloadItem(item)}
                  className="font-space text-[10px] font-bold bg-emerald-500 hover:bg-emerald-400 text-black px-2.5 py-1 transition-colors flex items-center gap-1"
                  title="Re-download video file"
                >
                  <span>SAVE</span>
                  <span>⤓</span>
                </button>

                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-white/40 hover:text-red-400 p-1 text-xs"
                  title="Remove from history"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}

        {history.length === 0 && (
          <div className="py-8 text-center border border-dashed border-white/10 bg-[#0b0c0d]">
            <p className="font-space text-xs text-[rgba(240,240,240,0.4)]">
              No exported clips in this session yet.
            </p>
            <p className="font-space text-[10px] text-white/30 mt-1">
              Render any clip or run the batch queue and they will appear here for instant re-download.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
