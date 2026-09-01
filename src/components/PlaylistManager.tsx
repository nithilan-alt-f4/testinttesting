import React, { useState } from "react";
import { useAudio } from "../context/AudioContext";
import { Plus, Trash2, Music, ChevronRight } from "lucide-react";

export const PlaylistManager: React.FC = () => {
  const { playlists, activePlaylistId, setActivePlaylistId, createPlaylist, deletePlaylist, songs } = useAudio();
  const [playlistName, setPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistName.trim()) return;
    await createPlaylist(playlistName.trim());
    setPlaylistName("");
    setIsCreating(false);
  };

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="micro-label">PLAYLISTS</span>
        <button onClick={() => setIsCreating(!isCreating)} className="eq-profile-btn" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Plus size={12} /> NEW
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} style={{ padding: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
          <label className="micro-label">PLAYLIST NAME</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="text" placeholder="My playlist..." value={playlistName} onChange={(e) => setPlaylistName(e.target.value)}
              style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--line)", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", background: "transparent" }} />
            <button type="submit" className="save-button">CREATE</button>
          </div>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <button onClick={() => setActivePlaylistId(null)}
          className={`track-row ${activePlaylistId === null ? "track-row-active" : ""}`}
          style={{ border: "1px solid var(--line-soft)", marginBottom: 4 }}>
          <Music size={14} />
          <div className="track-copy">
            <strong>All Songs</strong>
            <span>{songs.length} tracks</span>
          </div>
          <ChevronRight size={14} style={{ color: "#999" }} />
        </button>

        {playlists.map((playlist) => {
          const isActive = activePlaylistId === playlist.id;
          return (
            <div key={playlist.id}
              className={`track-row ${isActive ? "track-row-active" : ""}`}
              style={{ border: "1px solid var(--line-soft)", marginBottom: 4 }}>
              <button onClick={() => setActivePlaylistId(playlist.id)} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
                <Music size={14} />
                <div className="track-copy">
                  <strong>{playlist.name}</strong>
                  <span>{playlist.songIds.length} tracks</span>
                </div>
              </button>
              <button onClick={() => deletePlaylist(playlist.id)} style={{ color: "#999", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}

        {playlists.length === 0 && (
          <span className="micro-label" style={{ textAlign: "center", padding: 12, color: "#999" }}>NO PLAYLISTS</span>
        )}
      </div>
    </div>
  );
};
export default PlaylistManager;
