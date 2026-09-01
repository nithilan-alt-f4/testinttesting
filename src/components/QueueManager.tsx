import React, { useState } from "react";
import { useAudio } from "../context/AudioContext";
import { X, ChevronUp, ChevronDown, Trash2, Play, GripVertical } from "lucide-react";

interface QueueManagerProps {
  onClose: () => void;
}

export const QueueManager: React.FC<QueueManagerProps> = ({ onClose }) => {
  const { queue, queueIndex, currentSong, setQueue, playSong } = useAudio();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const reorderQueue = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newQueue = [...queue];
    const [moved] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, moved);
    setQueue(newQueue);
  };

  const moveSong = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= queue.length) return;
    const newQueue = [...queue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[targetIndex];
    newQueue[targetIndex] = temp;
    setQueue(newQueue);
  };

  const removeSongFromQueue = (index: number) => {
    if (queue.length <= 1) return;
    setQueue(queue.filter((_, idx) => idx !== index));
  };

  const clearQueueExceptCurrent = () => {
    if (!currentSong) return;
    setQueue([currentSong]);
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel animate-slide-in">
        <div className="drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="micro-label">PLAY QUEUE</span>
            <span className="micro-label" style={{ color: "#999" }}>{queue.length} TRACKS</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {queue.length > 1 && (
              <button onClick={clearQueueExceptCurrent} className="micro-label" style={{ color: "#999", cursor: "pointer" }}>CLEAR</button>
            )}
            <button className="drawer-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="drawer-body" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          {queue.map((song, idx) => {
            const isCurrent = currentSong?.id === song.id && queueIndex === idx;
            return (
              <div key={`${song.id}-${idx}`}
                draggable={true}
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => { e.preventDefault(); if (dragOverIndex !== idx) setDragOverIndex(idx); }}
                onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) reorderQueue(dragIndex, idx); setDragIndex(null); setDragOverIndex(null); }}
                onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                  border: dragOverIndex === idx && dragIndex !== null && dragIndex !== idx ? "1px dashed var(--line)" : isCurrent ? "1px solid var(--red)" : "1px solid var(--line-soft)",
                  cursor: "grab", transition: "all 160ms ease",
                }}>
                <GripVertical size={12} style={{ color: "#ccc", flexShrink: 0 }} />
                <div className="sleeve" style={{ width: 32, height: 32, flexShrink: 0 }}>
                  {song.albumCover ? (
                    <img src={song.albumCover} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <>
                      <span className="sleeve-ring" />
                      <span className="sleeve-cross sleeve-cross-one" />
                      <span className="sleeve-cross sleeve-cross-two" />
                    </>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isCurrent ? "var(--red)" : "var(--ink)" }}>{song.title}</span>
                  <span className="micro-label" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.artist}</span>
                </div>
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  <button onClick={() => moveSong(idx, "up")} disabled={idx === 0} style={{ padding: 2, color: "#999", opacity: idx === 0 ? 0.3 : 1, cursor: "pointer", background: "none", border: "none" }}><ChevronUp size={12} /></button>
                  <button onClick={() => moveSong(idx, "down")} disabled={idx === queue.length - 1} style={{ padding: 2, color: "#999", opacity: idx === queue.length - 1 ? 0.3 : 1, cursor: "pointer", background: "none", border: "none" }}><ChevronDown size={12} /></button>
                  <button onClick={() => removeSongFromQueue(idx)} disabled={queue.length <= 1} style={{ padding: 2, color: "#999", cursor: "pointer", background: "none", border: "none" }}><Trash2 size={10} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
export default QueueManager;
