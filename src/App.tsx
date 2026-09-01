import React, { useState, useEffect, useRef, useCallback } from "react";
import { AudioProvider, useAudio } from "./context/AudioContext";
import { SongUploader } from "./components/SongUploader";
import { PlaylistManager } from "./components/PlaylistManager";
import { LyricsViewer } from "./components/LyricsViewer";
import { Equalizer } from "./components/Equalizer";
import { Visualizer } from "./components/Visualizer";
import { MusicPlayer } from "./components/MusicPlayer";
import { FullscreenPlayer } from "./components/FullscreenPlayer";
import { QueueManager } from "./components/QueueManager";
import { Search, Plus, X, Radio, Pause as PauseIcon, Sun, Moon, ArrowUpRight } from "lucide-react";
import { AnimatePresence } from "motion/react";

type Drawer = "queue" | "lyrics" | "eq" | "viz" | null;

function Dashboard() {
  const { isFullscreen, setIsFullscreen, songs, isPlaying, currentSong, playSong, queue, queueIndex, currentTime, duration } = useAudio();
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [libraryTab, setLibraryTab] = useState<"library" | "playlists" | "upload">("library");
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("p-dark") === "1"; } catch { return false; }
  });
  const [sidebarW, setSidebarW] = useState(390);
  const [mousePos, setMousePos] = useState({ x: 200, y: 200 });
  const dashboardRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem("p-dark", dark ? "1" : "0"); } catch {}
  }, [dark]);

  // Mouse glow
  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  // Sidebar resize
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const startX = e.clientX;
    const startW = sidebarW;
    const onMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = startX - ev.clientX;
      const newW = Math.max(280, Math.min(600, startW + delta));
      setSidebarW(newW);
    };
    const onUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [sidebarW]);

  const closeDrawer = () => setDrawer(null);
  const toggleDrawer = (d: Drawer) => setDrawer((prev) => (prev === d ? null : d));

  return (
    <>
      {/* Texture Background */}
      <div className="texture-bg" />
      {/* Mouse Glow */}
      <div className="mouse-glow" style={{ left: mousePos.x, top: mousePos.y }} />

      <main className="archive-shell">
        {/* Topbar */}
        <header className="topbar">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">P+</div>
            <div>
              <div className="brand-name">PROXIMITY+</div>
              <span className="micro-label">LISTENING DESK</span>
            </div>
          </div>
          <nav className="top-nav" aria-label="Primary navigation">
            <button className={`nav-item ${drawer === null ? "nav-item-active" : ""}`} onClick={() => closeDrawer()}>
              <span className="nav-index">01</span>LIBRARY
            </button>
            <button className={`nav-item ${drawer === "queue" ? "nav-item-active" : ""}`} onClick={() => toggleDrawer("queue")}>
              <span className="nav-index">02</span>QUEUE
            </button>
            <button className={`nav-item ${drawer === "lyrics" ? "nav-item-active" : ""}`} onClick={() => toggleDrawer("lyrics")}>
              <span className="nav-index">03</span>LYRICS
            </button>
            <button className={`nav-item ${drawer === "eq" ? "nav-item-active" : ""}`} onClick={() => toggleDrawer("eq")}>
              <span className="nav-index">04</span>EQ
            </button>
            <button className={`nav-item ${drawer === "viz" ? "nav-item-active" : ""}`} onClick={() => toggleDrawer("viz")}>
              <span className="nav-index">05</span>VISUALIZER
            </button>
          </nav>
          <div className="topbar-right">
            <button className={`dark-toggle ${dark ? "dark-toggle-active" : ""}`} onClick={() => setDark(!dark)}>
              {dark ? <Moon size={12} /> : <Sun size={12} />}
              <span>{dark ? "DARK" : "LIGHT"}</span>
            </button>
            <button className="fullscreen-btn" onClick={() => setIsFullscreen(true)} aria-label="Fullscreen">
              <ArrowUpRight size={16} />
            </button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <section className="dashboard-grid" ref={dashboardRef} style={{ "--sidebar-w": `${sidebarW}px` } as any}>
          {/* Hero Panel */}
          <section className="hero-panel" aria-labelledby="hero-title">
            <div className="panel-kicker">
              <span className="micro-label">ACTIVE CUT</span>
              <span className="micro-label panel-kicker-right">
                {isPlaying ? "PLAYING" : "PAUSED"} {currentSong ? `/ ${currentSong.artist}` : ""}
              </span>
            </div>
            <div className="hero-stage">
              <div className="hero-copy">
                <span className="micro-label">
                  NOW SPINNING{currentSong ? ` / ${songs.findIndex((s) => s.id === currentSong.id) + 1}` : ""}
                </span>
                <h1 id="hero-title" className="hero-title">
                  {currentSong ? (
                    <>
                      {currentSong.title.split(" ").slice(0, 2).join(" ")}<br />
                      <span className="red">{currentSong.title.split(" ").slice(2).join(" ") || currentSong.title.split(" ")[0]}</span>
                    </>
                  ) : (
                    <>NO<br /><span className="red">CUT</span><br />LOADED</>
                  )}
                </h1>
                <div className="hero-meta">
                  <span>{currentSong?.artist || "—"}</span>
                  <span className="meta-divider">/</span>
                  <span>{currentSong?.album || "—"}</span>
                </div>
              </div>
              <div className="hero-turntable">
                <div className="turntable-wrap" aria-label="Turntable preview">
                  <div className="turntable-shadow" />
                  <div className={`record ${isPlaying ? "record-spinning" : ""}`}>
                    <div className="record-grooves" />
                    <div className="record-label">
                      {currentSong?.albumCover ? (
                        <img src={currentSong.albumCover} alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <><span className="record-label-text">P+</span><small>SIDE A</small></>
                      )}
                    </div>
                  </div>
                  <div className={`tonearm ${isPlaying ? "tonearm-live" : ""}`}>
                    <span className="tonearm-pivot" />
                    <span className="tonearm-stick" />
                    <span className="tonearm-head" />
                  </div>
                  <div className={`turntable-led ${isPlaying ? "pulse-red" : ""}`} />
                  <span className="micro-label turntable-note">DIRECT DRIVE / {songs.length} CUTS</span>
                </div>
              </div>
              <div className="hero-side-stamp">
                <span className="micro-label">FIELD NOTE</span>
                <span className="stamp-line" />
                <strong>{String(queueIndex + 1).padStart(2, "0")}</strong>
                <span className="micro-label">ANALOG / DIGITAL</span>
              </div>
            </div>
            <div className="hero-footer">
              <div className="signal-readout">
                <Radio size={14} />
                <span className="micro-label">{currentSong ? `CUT ${queueIndex + 1} / ${queue.length}` : "NO SIGNAL"}</span>
              </div>
              <div className="hero-time">
                <span className="micro-label">{currentSong ? formatTime(currentTime) : "00:00"}</span>
                <span className="time-rule" style={{ "--time-pct": `${currentSong ? (currentTime / (duration || 1)) * 100 : 0}%` } as any} />
                <span className="micro-label">{currentSong ? formatTime(duration) : "00:00"}</span>
              </div>
            </div>
          </section>

          {/* Library Panel + Resize Handle */}
          <div style={{ position: "relative" }}>
            <div className="sidebar-resize-handle" onMouseDown={onResizeStart} />
            <aside className="library-panel" aria-labelledby="library-title" style={{ height: "100%" }}>
              <div className="library-head">
                <div>
                  <span className="micro-label">ARCHIVE / {songs.length} CUTS</span>
                  <h2 id="library-title">LIBRARY</h2>
                </div>
                <button className="square-button" onClick={() => setLibraryTab("upload")} aria-label="Upload">
                  <Plus size={16} />
                </button>
              </div>
              <div className="library-tabs">
                <button className={`library-tab ${libraryTab === "library" ? "library-tab-active" : ""}`} onClick={() => setLibraryTab("library")}>TRACKS</button>
                <button className={`library-tab ${libraryTab === "playlists" ? "library-tab-active" : ""}`} onClick={() => setLibraryTab("playlists")}>PLAYLISTS</button>
                <button className={`library-tab ${libraryTab === "upload" ? "library-tab-active" : ""}`} onClick={() => setLibraryTab("upload")}>UPLOAD</button>
              </div>
              {libraryTab === "library" && (
                <>
                  <div className="library-toolbar">
                    <button className="search-trigger" onClick={() => {}}>
                      <Search size={14} /><span className="micro-label">SEARCH ARCHIVE</span>
                    </button>
                  </div>
                  <LibraryTrackList />
                </>
              )}
              {libraryTab === "playlists" && (
                <div className="drawer-body"><PlaylistManager /></div>
              )}
              {libraryTab === "upload" && (
                <div className="drawer-body"><SongUploader /></div>
              )}
            </aside>
          </div>
        </section>

        {/* Control Panel */}
        <MusicPlayer onOpenDrawer={toggleDrawer} />

        {/* Drawers */}
        <AnimatePresence>
          {drawer === "queue" && <QueueManager onClose={closeDrawer} />}
          {drawer === "lyrics" && <LyricsViewer onClose={closeDrawer} />}
          {drawer === "eq" && <Equalizer onClose={closeDrawer} />}
          {drawer === "viz" && <VisualizerDrawer onClose={closeDrawer} />}
        </AnimatePresence>

        {/* Fullscreen Player */}
        <AnimatePresence>
          {isFullscreen && <FullscreenPlayer onClose={() => setIsFullscreen(false)} />}
        </AnimatePresence>
      </main>
    </>
  );
}

/* Library Track List */
function LibraryTrackList() {
  const { songs, currentSong, isPlaying, playSong, currentTime } = useAudio();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; song: any } | null>(null);

  return (
    <>
      <div className="library-columns" aria-hidden="true">
        <span className="micro-label">#</span>
        <span className="micro-label">RELEASE / ARTIST</span>
        <span className="micro-label">TIME</span>
      </div>
      <div className="track-list">
        {songs.length === 0 && (
          <div className="empty-state"><span className="micro-label">NO CUTS IN ARCHIVE</span></div>
        )}
        {songs.map((song, idx) => {
          const active = currentSong?.id === song.id;
          return (
            <button key={song.id} className={`track-row ${active ? "track-row-active" : ""}`}
              onClick={() => playSong(song, songs)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, song }); }}>
              <div className="track-index">
                <span>{active && isPlaying ? "▸" : String(idx + 1).padStart(2, "0")}</span>
                {active && <span className="active-bar" />}
              </div>
              <div className="sleeve">
                {song.albumCover ? (
                  <img src={song.albumCover} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <><span className="sleeve-ring" /><span className="sleeve-cross sleeve-cross-one" /><span className="sleeve-cross sleeve-cross-two" /></>
                )}
              </div>
              <div className="track-copy">
                <strong>{song.title}</strong>
                <span>{song.artist}{song.album ? ` / ${song.album}` : ""}</span>
              </div>
              <div className="track-time"><span className="micro-label">{formatTime(song.duration)}</span></div>
              {active ? <PauseIcon size={14} style={{ color: "var(--red)" }} /> : null}
            </button>
          );
        })}
      </div>
      {contextMenu && (
        <ContextMenuSimple x={contextMenu.x} y={contextMenu.y} song={contextMenu.song} onClose={() => setContextMenu(null)} />
      )}
    </>
  );
}

/* Context Menu */
function ContextMenuSimple({ x, y, song, onClose }: { x: number; y: number; song: any; onClose: () => void }) {
  const { playSong, playNext, addToQueue, deleteSong, songs } = useAudio();
  React.useEffect(() => {
    const close = () => onClose();
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("click", close); window.removeEventListener("scroll", close, true); };
  }, [onClose]);

  return (
    <div className="context-menu animate-fade-in" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
      <button className="context-menu-item" onClick={() => { playSong(song, songs); onClose(); }}>▶ PLAY</button>
      <button className="context-menu-item" onClick={() => { playNext(song); onClose(); }}>→ PLAY NEXT</button>
      <button className="context-menu-item" onClick={() => { addToQueue(song); onClose(); }}>+ ADD TO QUEUE</button>
      <div className="context-menu-divider" />
      <button className="context-menu-item" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Delete "${song.title}"?`)) deleteSong(song.id); onClose(); }}>✕ DELETE</button>
    </div>
  );
}

/* Visualizer Drawer */
function VisualizerDrawer({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel animate-slide-in">
        <div className="drawer-header">
          <span className="micro-label">SPECTRUM ANALYSIS</span>
          <button className="drawer-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="drawer-body" style={{ padding: 0 }}><Visualizer /></div>
      </div>
    </>
  );
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function App() {
  return (
    <AudioProvider>
      <Dashboard />
    </AudioProvider>
  );
}
