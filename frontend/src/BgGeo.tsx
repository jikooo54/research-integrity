import { useEffect, useRef } from "react";

// Veritae background: a faint forensic node network - drifting nodes linked when
// near, one coral anomaly node. Teal/cyan on slate. Canvas-2D, rm-safe.
export function BgGeo() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0, raf = 0;
    const N = 46;
    const pts = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.0006, vy: (Math.random() - 0.5) * 0.0006 }));
    const resize = () => { W = window.innerWidth; H = window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener("resize", resize);
    const step = (move: boolean) => {
      ctx.clearRect(0, 0, W, H);
      if (move) for (const p of pts) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > 1) p.vx *= -1; if (p.y < 0 || p.y > 1) p.vy *= -1; }
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const a = pts[i], b = pts[j]; const dx = (a.x - b.x) * W, dy = (a.y - b.y) * H; const d = Math.hypot(dx, dy);
        if (d < 150) { ctx.strokeStyle = `rgba(180,83,9,${0.09 * (1 - d / 150)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x * W, a.y * H); ctx.lineTo(b.x * W, b.y * H); ctx.stroke(); }
      }
      for (let i = 0; i < N; i++) { const p = pts[i]; ctx.fillStyle = i === 7 ? "rgba(153,27,27,0.5)" : "rgba(180,83,9,0.30)"; ctx.beginPath(); ctx.arc(p.x * W, p.y * H, 2, 0, Math.PI * 2); ctx.fill(); }
    };
    if (reduce) step(false); else { const loop = () => { step(true); raf = requestAnimationFrame(loop); }; loop(); }
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="bg-geo" aria-hidden="true" />;
}
