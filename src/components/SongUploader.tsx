import React, { useState, useRef, useEffect } from "react";
import { useAudio } from "../context/AudioContext";
import audioDb, { Song } from "../lib/db";
import { Upload, Music, Trash2, Play, Save } from "lucide-react";

interface StagedFile {
  file: File;
  title: string;
  artist: string;
  album: string;
  albumCover: string;
  duration: number;
  isIdentifying: boolean;
  editedFields?: { title?: boolean; artist?: boolean; album?: boolean; albumCover?: boolean; };
  targetPlaylistName?: string;
}

const traverseFileTree = async (entry: any): Promise<File[]> => {
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((file: File) => resolve([file]), () => resolve([]));
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const allFiles: File[] = [];
      const readEntries = () => {
        dirReader.readEntries(async (entries: any[]) => {
          if (entries.length === 0) { resolve(allFiles); }
          else {
            const promises = entries.map((e: any) => traverseFileTree(e));
            const results = await Promise.all(promises);
            for (const files of results) allFiles.push(...files);
            readEntries();
          }
        }, () => resolve(allFiles));
      };
      readEntries();
    } else { resolve([]); }
  });
};

export const SongUploader: React.FC = () => {
  const { songs, playlists, playSong, deleteSong, addSongToPlaylist, loadSongs, loadPlaylists, playNext, addToQueue } = useAudio();
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkPlaylistOption, setBulkPlaylistOption] = useState<string>("none");
  const [bulkSelectedPlaylistId, setBulkSelectedPlaylistId] = useState<string>("");
  const [bulkNewPlaylistName, setBulkNewPlaylistName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const reGuessTimeoutRef = useRef<any>(null);

  const parseFilename = (filename: string): { title: string; artist: string; album: string } => {
    const cleanName = filename.replace(/\.[^/.]+$/, "");
    if (cleanName.includes(" - ")) {
      const parts = cleanName.split(" - ");
      return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim(), album: "Unknown Album" };
    }
    if (cleanName.includes("-")) {
      const parts = cleanName.split("-");
      return { artist: parts[0].trim(), title: parts.slice(1).join("-").trim(), album: "Unknown Album" };
    }
    return { artist: "Unknown Artist", title: cleanName.trim(), album: "Unknown Album" };
  };

  const identifyMetadata = async (filename: string): Promise<{ title: string; artist: string; album: string; albumCover: string }> => {
    try {
      const res = await fetch("/api/songs/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (res.ok) {
        const data = await res.json();
        return { title: data.title || filename.replace(/\.[^/.]+$/, ""), artist: data.artist || "Unknown Artist", album: data.album || "Unknown Album", albumCover: data.albumCover || "" };
      }
    } catch (e) { console.error("Song metadata identification error:", e); }
    const fallback = parseFilename(filename);
    return { title: fallback.title, artist: fallback.artist, album: fallback.album, albumCover: "" };
  };

  const processFile = async (file: File): Promise<StagedFile> => {
    const localDetails = parseFilename(file.name);
    const getDuration = (): Promise<number> => {
      return new Promise((resolve) => {
        const tempAudio = new Audio();
        const objectUrl = URL.createObjectURL(file);
        tempAudio.src = objectUrl;
        tempAudio.addEventListener("loadedmetadata", () => { resolve(tempAudio.duration || 0); URL.revokeObjectURL(objectUrl); });
        tempAudio.addEventListener("error", () => { resolve(0); URL.revokeObjectURL(objectUrl); });
      });
    };
    const duration = await getDuration();
    return { file, title: localDetails.title, artist: localDetails.artist, album: localDetails.album, albumCover: "", duration, isIdentifying: true, editedFields: {} };
  };

  const handleFilesList = async (files: File[], folderName?: string) => {
    const mp3Files = files.filter((file) => file.type === "audio/mpeg" || file.name.endsWith(".mp3"));
    if (mp3Files.length === 0) return;
    setIsUploading(true);
    setUploadProgressMsg(folderName ? `Analyzing "${folderName}"...` : "Analyzing audio files...");
    const initialStaged = await Promise.all(mp3Files.map(async (f) => { const st = await processFile(f); if (folderName) st.targetPlaylistName = folderName; return st; }));
    setStagedFiles((prev) => [...prev, ...initialStaged]);
    setIsUploading(false);
    for (let i = 0; i < initialStaged.length; i++) {
      const current = initialStaged[i];
      const meta = await identifyMetadata(current.file.name);
      setStagedFiles((prev) => prev.map((st) => st.file === current.file ? { ...st, title: meta.title, artist: meta.artist, album: meta.album, albumCover: meta.albumCover, isIdentifying: false } : st));
    }
  };

  const handleFiles = (files: FileList | null) => { if (!files) return; handleFilesList(Array.from(files)); };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const items = e.dataTransfer.items;
    if (!items) { if (e.dataTransfer.files) await handleFilesList(Array.from(e.dataTransfer.files)); return; }
    const folderPromises: Promise<{ folderName: string; files: File[] }>[] = [];
    const looseFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const entry = typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null;
        if (entry) {
          if (entry.isDirectory) {
            folderPromises.push((async () => { const traversed = await traverseFileTree(entry); return { folderName: entry.name, files: traversed.filter((f: File) => f.type === "audio/mpeg" || f.name.endsWith(".mp3")) }; })());
          } else {
            const file = item.getAsFile();
            if (file && (file.type === "audio/mpeg" || file.name.endsWith(".mp3"))) looseFiles.push(file);
          }
        } else {
          const file = item.getAsFile();
          if (file && (file.type === "audio/mpeg" || file.name.endsWith(".mp3"))) looseFiles.push(file);
        }
      }
    }
    const folders = await Promise.all(folderPromises);
    const foldersWithMp3s = folders.filter((f) => f.files.length > 0);
    if (foldersWithMp3s.length > 0 || looseFiles.length > 0) {
      if (looseFiles.length > 0) await handleFilesList(looseFiles);
      for (const folder of foldersWithMp3s) await handleFilesList(folder.files, folder.folderName);
    }
  };

  const handleInputChange = (index: number, field: "title" | "artist" | "album", value: string) => {
    setStagedFiles((prev) => {
      const updated = [...prev];
      const current = updated[index];
      const edited = current.editedFields || {};
      updated[index] = { ...current, [field]: value, editedFields: { ...edited, [field]: true } };
      return updated;
    });
  };

  const saveStagedSong = async (index: number) => {
    const staged = stagedFiles[index];
    if (!staged) return;
    setIsUploading(true);
    setUploadProgressMsg(`Searching lyrics for "${staged.title || staged.file.name}"...`);
    let finalLyrics = "", finalSynced: any[] = [];
    let finalTitle = (staged.title || "").trim();
    let finalArtist = (staged.artist || "Unknown Artist").trim();
    let finalAlbum = (staged.album || "Unknown Album").trim();
    let finalAlbumCover = staged.albumCover || "";
    try {
      const res = await fetch("/api/lyrics/find", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: staged.title || staged.file.name.replace(/\.[^/.]+$/, ""), artist: staged.artist === "Unknown Artist" ? "" : staged.artist, duration: staged.duration, originalFilename: staged.file.name }),
      });
      if (res.ok) {
        const lyricData = await res.json();
        finalLyrics = lyricData.lyrics || "";
        finalSynced = (lyricData.syncedLyrics || []).map((l: any) => ({ time: parseFloat(l.time) || 0, text: String(l.text || "") })).sort((a: any, b: any) => a.time - b.time);
        if (lyricData.title?.trim()) finalTitle = lyricData.title.trim();
        if (lyricData.artist?.trim()) finalArtist = lyricData.artist.trim();
      }
    } catch (e) { console.warn("Auto-lyric search failed:", e); }
    if (!finalTitle) finalTitle = staged.file.name.replace(/\.[^/.]+$/, "");
    else finalTitle = finalTitle.replace(/\.[^/.]+$/, "");
    const newSong: Song = { id: "song_" + Math.random().toString(36).substr(2, 9), title: finalTitle, artist: finalArtist, album: finalAlbum, albumCover: finalAlbumCover, duration: staged.duration, lyrics: finalLyrics, syncedLyrics: finalSynced, audioBlob: staged.file, createdAt: Date.now() };
    await audioDb.saveSong(newSong);
    if (bulkPlaylistOption === "existing" && bulkSelectedPlaylistId) {
      await addSongToPlaylist(newSong.id, bulkSelectedPlaylistId);
    } else if (bulkPlaylistOption === "new" && bulkNewPlaylistName.trim()) {
      const playlistName = bulkNewPlaylistName.trim();
      let targetPl = playlists.find((p) => p.name.toLowerCase() === playlistName.toLowerCase());
      let targetPlId = targetPl?.id;
      if (!targetPl) {
        targetPlId = "pl_" + Math.random().toString(36).substr(2, 9);
        await audioDb.savePlaylist({ id: targetPlId, name: playlistName, songIds: [], createdAt: Date.now() });
        await loadPlaylists();
      }
      if (targetPlId) await addSongToPlaylist(newSong.id, targetPlId);
    } else if (staged.targetPlaylistName) {
      const playlistName = staged.targetPlaylistName.trim();
      let targetPl = playlists.find((p) => p.name.toLowerCase() === playlistName.toLowerCase());
      let targetPlId = targetPl?.id;
      if (!targetPl) { targetPlId = "pl_" + Math.random().toString(36).substr(2, 9); await audioDb.savePlaylist({ id: targetPlId, name: playlistName, songIds: [], createdAt: Date.now() }); await loadPlaylists(); }
      if (targetPlId) await addSongToPlaylist(newSong.id, targetPlId);
    }
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
    setIsUploading(false);
    await loadSongs();
    await loadPlaylists();
  };

  const saveAllStagedSongs = async () => {
    if (stagedFiles.length === 0) return;
    setIsUploading(true);
    let targetPlaylistId = "";
    if (bulkPlaylistOption === "existing" && bulkSelectedPlaylistId) targetPlaylistId = bulkSelectedPlaylistId;
    else if (bulkPlaylistOption === "new" && bulkNewPlaylistName.trim()) {
      const playlistName = bulkNewPlaylistName.trim();
      let targetPl = playlists.find((p) => p.name.toLowerCase() === playlistName.toLowerCase());
      if (targetPl) targetPlaylistId = targetPl.id;
      else { targetPlaylistId = "pl_" + Math.random().toString(36).substr(2, 9); await audioDb.savePlaylist({ id: targetPlaylistId, name: playlistName, songIds: [], createdAt: Date.now() }); await loadPlaylists(); }
    }
    const toProcess = [...stagedFiles];
    for (let i = 0; i < toProcess.length; i++) {
      const staged = toProcess[i];
      setUploadProgressMsg(`Importing "${staged.title || staged.file.name}" (${i + 1}/${toProcess.length})...`);
      let finalLyrics = "", finalSynced: any[] = [];
      let finalTitle = (staged.title || "").trim();
      let finalArtist = (staged.artist || "Unknown Artist").trim();
      let finalAlbum = (staged.album || "Unknown Album").trim();
      let finalAlbumCover = staged.albumCover || "";
      try {
        const res = await fetch("/api/lyrics/find", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: staged.title || staged.file.name.replace(/\.[^/.]+$/, ""), artist: staged.artist === "Unknown Artist" ? "" : staged.artist, duration: staged.duration, originalFilename: staged.file.name }),
        });
        if (res.ok) {
          const lyricData = await res.json();
          finalLyrics = lyricData.lyrics || "";
          finalSynced = (lyricData.syncedLyrics || []).map((l: any) => ({ time: parseFloat(l.time) || 0, text: String(l.text || "") })).sort((a: any, b: any) => a.time - b.time);
          if (lyricData.title?.trim()) finalTitle = lyricData.title.trim();
          if (lyricData.artist?.trim()) finalArtist = lyricData.artist.trim();
        }
      } catch (e) { console.warn("Auto-lyric search failed during bulk upload:", e); }
      if (!finalTitle) finalTitle = staged.file.name.replace(/\.[^/.]+$/, "");
      else finalTitle = finalTitle.replace(/\.[^/.]+$/, "");
      const newSong: Song = { id: "song_" + Math.random().toString(36).substr(2, 9), title: finalTitle, artist: finalArtist, album: finalAlbum, albumCover: finalAlbumCover, duration: staged.duration, lyrics: finalLyrics, syncedLyrics: finalSynced, audioBlob: staged.file, createdAt: Date.now() };
      await audioDb.saveSong(newSong);
      if (targetPlaylistId) await addSongToPlaylist(newSong.id, targetPlaylistId);
    }
    setStagedFiles([]);
    setIsUploading(false);
    await loadSongs();
    await loadPlaylists();
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  useEffect(() => { return () => { if (reGuessTimeoutRef.current) clearTimeout(reGuessTimeoutRef.current); }; }, []);

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`upload-zone ${isDraggingOver ? "upload-zone-drag" : ""}`}
      >
        <input ref={fileInputRef} type="file" accept="audio/mp3, audio/mpeg" multiple onChange={(e) => handleFiles(e.target.files)} style={{ display: "none" }} />
        <Upload size={20} style={{ color: "#999" }} />
        <span style={{ fontSize: 11, fontWeight: 600 }}>Drag & drop music files or folders</span>
        <span className="micro-label">MP3 ONLY — FOLDERS AUTO-CONVERT TO PLAYLISTS</span>
      </div>

      {isUploading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, border: "1px solid var(--line)", background: "#ededed" }}>
          <div style={{ width: 12, height: 12, border: "1px solid var(--line)", borderTop: "2px solid var(--red)", animation: "spin-record 1s linear infinite" }} />
          <span className="micro-label">{uploadProgressMsg}</span>
        </div>
      )}

      {/* Staging Area */}
      {stagedFiles.length > 0 && (
        <div style={{ padding: 12, border: "1px solid var(--line)", background: "#ededed" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span className="micro-label">METADATA QUEUE ({stagedFiles.length} PENDING)</span>
            <button onClick={saveAllStagedSongs} disabled={isUploading} className="save-button" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Save size={12} /> SAVE ALL
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span className="micro-label">TARGET:</span>
            <select value={bulkPlaylistOption === "existing" ? bulkSelectedPlaylistId : bulkPlaylistOption}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "none") { setBulkPlaylistOption("none"); setBulkSelectedPlaylistId(""); }
                else if (val === "new") { setBulkPlaylistOption("new"); setBulkSelectedPlaylistId(""); }
                else { setBulkPlaylistOption("existing"); setBulkSelectedPlaylistId(val); }
              }}
              style={{ padding: "4px 8px", border: "1px solid var(--line)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", background: "transparent" }}>
              <option value="none">Library Only</option>
              <option value="new">+ New Playlist</option>
              {playlists.map((pl) => (<option key={pl.id} value={pl.id}>{pl.name}</option>))}
            </select>
            {bulkPlaylistOption === "new" && (
              <input type="text" placeholder="Name..." value={bulkNewPlaylistName} onChange={(e) => setBulkNewPlaylistName(e.target.value)}
                style={{ padding: "4px 8px", border: "1px solid var(--line)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", background: "transparent", width: 120 }} />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
            {stagedFiles.map((staged, index) => (
              <div key={index} style={{ padding: 8, border: "1px solid var(--line)", background: "var(--paper)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div className="sleeve" style={{ width: 32, height: 32, flexShrink: 0 }}>
                    {staged.albumCover ? (
                      <img src={staged.albumCover} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <>
                        <span className="sleeve-ring" />
                        <span className="sleeve-cross sleeve-cross-one" />
                        <span className="sleeve-cross sleeve-cross-two" />
                      </>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{staged.file.name}</span>
                    <span className="micro-label">MP3 / {formatDuration(staged.duration)}</span>
                  </div>
                </div>
                {staged.isIdentifying ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: 6 }}>
                    <div style={{ width: 10, height: 10, border: "1px solid var(--line)", borderTop: "2px solid var(--red)", animation: "spin-record 1s linear infinite" }} />
                    <span className="micro-label">IDENTIFYING...</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input type="text" value={staged.title} onChange={(e) => handleInputChange(index, "title", e.target.value)} placeholder="Title"
                      style={{ flex: 1, padding: "4px 6px", border: "1px solid var(--line)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", background: "transparent" }} />
                    <input type="text" value={staged.artist} onChange={(e) => handleInputChange(index, "artist", e.target.value)} placeholder="Artist"
                      style={{ flex: 1, padding: "4px 6px", border: "1px solid var(--line)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", background: "transparent" }} />
                    <button onClick={() => saveStagedSong(index)} disabled={isUploading} className="save-button">SAVE</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default SongUploader;
