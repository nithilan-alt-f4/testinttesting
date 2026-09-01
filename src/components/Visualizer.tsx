import React from "react";
import { useAudio } from "../context/AudioContext";
import { Activity } from "lucide-react";

type VisualizerStyle = "bars" | "wave" | "circle" | "led";

export const Visualizer: React.FC = () => {
  const { analyserNode, isPlaying } = useAudio();
  const [style, setStyle] = React.useState<VisualizerStyle>("led");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationRef = React.useRef<number | null>(null);
  const [dimensions, setDimensions] = React.useState({ width: 400, height: 250 });

  React.useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.max(width, 100), height: Math.max(height, 150) });
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);
    const width = dimensions.width;
    const height = dimensions.height;
    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      if (analyserNode && isPlaying) {
        if (style === "wave") analyserNode.getByteTimeDomainData(dataArray);
        else analyserNode.getByteFrequencyData(dataArray);
      } else {
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = style === "wave" ? 128 + Math.sin(i * 0.1) * 3.5 : Math.max(4, Math.sin(i * 0.15) * 8 + 4);
        }
      }
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(245, 245, 245, 1)";
      ctx.fillRect(0, 0, width, height);

      if (style === "bars") {
        const barWidth = (width / bufferLength) * 1.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * (height - 30);
          ctx.fillStyle = isPlaying ? "#000" : "rgba(0,0,0,0.4)";
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight - 10, barWidth - 1.5, barHeight + 5, [0, 0, 0, 0]);
          ctx.fill();
          x += barWidth;
        }
      } else if (style === "wave") {
        ctx.lineWidth = 2;
        ctx.strokeStyle = isPlaying ? "#000" : "rgba(0,0,0,0.3)";
        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else if (style === "circle") {
        const centerX = width / 2;
        const centerY = height / 2;
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avgVolume = sum / bufferLength;
        const pulse = (avgVolume / 255) * 45;
        const baseRadius = Math.min(width, height) * 0.22 + pulse;

        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 1.25, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 3;
        ctx.stroke();

        const numRays = Math.min(bufferLength, 80);
        for (let i = 0; i < numRays; i++) {
          const angle = (i / numRays) * Math.PI * 2;
          const amplitude = (dataArray[i] / 255) * 60;
          const startX = centerX + Math.cos(angle) * baseRadius;
          const startY = centerY + Math.sin(angle) * baseRadius;
          const endX = centerX + Math.cos(angle) * (baseRadius + amplitude);
          const endY = centerY + Math.sin(angle) * (baseRadius + amplitude);
          ctx.strokeStyle = isPlaying ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.3)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }

        ctx.fillStyle = isPlaying ? "#000" : "rgba(0,0,0,0.6)";
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, 2 * Math.PI);
        ctx.fill();
      } else if (style === "led") {
        const numCols = Math.min(bufferLength, 32);
        const numRows = 12;
        const colWidth = width / numCols;
        const rowHeight = (height - 20) / numRows;
        for (let c = 0; c < numCols; c++) {
          const amplitude = dataArray[c] / 255;
          const activeRows = Math.floor(amplitude * numRows);
          for (let r = 0; r < numRows; r++) {
            const rowIndexFromBottom = numRows - 1 - r;
            const isLit = rowIndexFromBottom < activeRows;
            if (!isLit) { ctx.fillStyle = "rgba(0,0,0,0.04)"; }
            else { ctx.fillStyle = r < 3 ? "rgba(255,0,0,0.95)" : r < 6 ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.95)"; }
            ctx.fillRect(c * colWidth + 2, r * rowHeight + 2, colWidth - 4, rowHeight - 4);
          }
        }
      }
    };

    draw();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [analyserNode, style, dimensions, isPlaying]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="micro-label">SPECTRUM ANALYSIS</span>
        <div className="viz-style-bar">
          {(["bars", "wave", "circle", "led"] as VisualizerStyle[]).map((mode) => (
            <button key={mode} onClick={() => setStyle(mode)} className={`viz-style-btn ${style === mode ? "viz-style-btn-active" : ""}`}>
              {mode}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} style={{ position: "relative", flex: 1, width: "100%", minHeight: 160, border: "1px solid var(--line)", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
        {!isPlaying && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(245,245,245,0.9)", pointerEvents: "none" }}>
            <Activity size={20} style={{ color: "#999" }} />
            <span className="micro-label">STANDBY</span>
          </div>
        )}
      </div>
    </div>
  );
};
export default Visualizer;
