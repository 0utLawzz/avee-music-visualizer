import React from 'react';
import { BatchQueueItem } from '../types/visualizer';
import { formatLongTime, estimateClipFileSize } from '../constants/exportFormats';

interface BatchQueueProps {
  queue: BatchQueueItem[];
  onRemoveItem: (id: string) => void;
  onClearQueue: () => void;
  onStartBatchExport: () => void;
  onCancelBatchExport: () => void;
  isBatchExporting: boolean;
  currentExportingId: string | null;
  overallProgress: number;
  onDownloadCompletedItem: (item: BatchQueueItem) => void;
  onPreviewItem: (item: BatchQueueItem) => void;
}

export const BatchQueue: React.FC<BatchQueueProps> = ({
  queue,
  onRemoveItem,
  onClearQueue,
  onStartBatchExport,
  onCancelBatchExport,
  isBatchExporting,
  currentExportingId,
  overallProgress,
  onDownloadCompletedItem,
  onPreviewItem
}) => {
  const totalDuration = queue.reduce(
    (acc, item) => acc + Math.max(0, item.endTime - item.startTime),
    0
  );

  const totalEstimatedMb = queue.reduce((acc, item) => {
    const dur = Math.max(0, item.endTime - item.startTime);
    return acc + estimateClipFileSize(dur, item.bitrateBps);
  }, 0);

  const pendingCount = queue.filter((q) => q.status === 'pending').length;
  const completedCount = queue.filter((q) => q.status === 'completed').length;

  return (
    <div className="bg-[#141517] border border-[rgba(240,240,240,0.12)] p-4 flex flex-col h-full shadow-lg">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgba(240,240,240,0.08)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-space text-[10px] bg-[#ff3e00] text-black font-extrabold px-1.5 py-0.5 uppercase tracking-wider">
              QUEUE ENGINE
            </span>
            <h3 className="font-syne text-sm font-bold text-white tracking-tight">
              BATCH RENDER PIPELINE
            </h3>
          </div>
          <p className="font-space text-[11px] text-[rgba(240,240,240,0.5)] mt-0.5">
            {queue.length} Tasks ({completedCount} Done, {pendingCount} Pending) • Total ~{totalDuration.toFixed(1)}s • ~{totalEstimatedMb.toFixed(1)} MB
          </p>
        </div>

        {/* Master Actions */}
        <div className="flex items-center gap-2">
          {queue.length > 0 && !isBatchExporting && (
            <button
              onClick={onClearQueue}
              className="font-space text-[10px] font-bold text-white/50 hover:text-red-400 px-2.5 py-1.5 border border-white/10 hover:border-red-400/40 transition-colors"
              title="Clear all tasks from queue"
            >
              CLEAR ALL
            </button>
          )}

          {isBatchExporting ? (
            <button
              onClick={onCancelBatchExport}
              className="font-space text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>CANCEL BATCH</span>
            </button>
          ) : (
            <button
              onClick={onStartBatchExport}
              disabled={queue.length === 0 || pendingCount === 0}
              className="font-space text-xs font-bold bg-[#ff3e00] hover:bg-[#ff5722] disabled:opacity-40 disabled:pointer-events-none text-black px-4 py-1.5 shadow-md shadow-[#ff3e00]/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>EXPORT BATCH ({pendingCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar when Active */}
      {isBatchExporting && (
        <div className="mt-3 p-3 bg-[#0b0c0d] border border-[#ff3e00] space-y-1.5">
          <div className="flex justify-between font-space text-[11px]">
            <span className="text-[#ff3e00] font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff3e00] animate-pulse" />
              Batch Rendering in Progress...
            </span>
            <span className="text-white font-bold">{overallProgress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-white/10 overflow-hidden rounded-xs">
            <div
              className="h-full bg-[#ff3e00] transition-all duration-200"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Queue Task Items List */}
      <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px]">
        {queue.map((item, index) => {
          const isCurrent = currentExportingId === item.id;
          const duration = Math.max(0, item.endTime - item.startTime);
          const estSize = estimateClipFileSize(duration, item.bitrateBps);

          return (
            <div
              key={item.id}
              className={`p-3 bg-[#0b0c0d] border transition-all ${
                isCurrent
                  ? 'border-[#ff3e00] shadow-sm bg-[rgba(255,62,0,0.04)]'
                  : item.status === 'completed'
                  ? 'border-emerald-500/30'
                  : 'border-[rgba(240,240,240,0.1)] hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-space text-[9px] bg-white/10 text-white font-bold px-1.5 py-0.5">
                      #{index + 1}
                    </span>
                    <span className="font-space text-[9px] bg-[#00f0ff]/15 text-[#00f0ff] font-bold px-1.5 py-0.5">
                      {item.aspectRatio}
                    </span>
                    <span className="font-space text-[9px] text-white/50">
                      {item.fps} FPS • {item.template}
                    </span>
                    <span className="font-space text-[9px] text-[#ff3e00] font-bold">
                      ~{estSize} MB
                    </span>

                    {/* Status Badges */}
                    {item.status === 'pending' && (
                      <span className="font-space text-[8px] bg-white/10 text-white/70 px-1 py-0.5">
                        QUEUED
                      </span>
                    )}
                    {item.status === 'rendering' && (
                      <span className="font-space text-[8px] bg-[#ff3e00] text-black font-extrabold px-1 py-0.5 animate-pulse">
                        RENDERING ({item.progressPercent.toFixed(0)}%)
                      </span>
                    )}
                    {item.status === 'completed' && (
                      <span className="font-space text-[8px] bg-emerald-500/20 text-emerald-400 font-bold px-1 py-0.5">
                        DONE ({item.blobSizeMb || estSize} MB)
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="font-space text-[8px] bg-red-500/20 text-red-400 font-bold px-1 py-0.5">
                        FAILED
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-xs text-white truncate">{item.name}</h4>

                  <div className="font-space text-[10px] text-[rgba(240,240,240,0.5)] mt-0.5">
                    Range: <span className="text-white">{formatLongTime(item.startTime)}</span> →{' '}
                    <span className="text-white">{formatLongTime(item.endTime)}</span> ({duration.toFixed(1)}s)
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.status === 'completed' && item.blobUrl && (
                    <>
                      <button
                        onClick={() => onPreviewItem(item)}
                        className="font-space text-[10px] font-bold bg-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff]/30 px-2 py-1"
                        title="Preview exported video"
                      >
                        PREVIEW
                      </button>
                      <button
                        onClick={() => onDownloadCompletedItem(item)}
                        className="font-space text-[10px] font-bold bg-emerald-500 text-black hover:bg-emerald-400 px-2.5 py-1"
                        title="Download file"
                      >
                        SAVE ⤓
                      </button>
                    </>
                  )}

                  {!isBatchExporting && (
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-white/40 hover:text-red-400 p-1 text-xs"
                      title="Remove task from queue"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Individual task progress bar when rendering */}
              {item.status === 'rendering' && (
                <div className="mt-2 h-1 bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-[#ff3e00] transition-all duration-150"
                    style={{ width: `${item.progressPercent}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {queue.length === 0 && (
          <div className="py-8 text-center border border-dashed border-white/10 bg-[#0b0c0d]">
            <p className="font-space text-xs text-[rgba(240,240,240,0.4)]">
              No clips in batch queue.
            </p>
            <p className="font-space text-[10px] text-white/30 mt-1">
              Click "+ ADD TO BATCH QUEUE" on any marked clip to build a render queue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
