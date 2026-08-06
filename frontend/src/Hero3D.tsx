import { useEffect, useRef } from "react";
import Zdog from "zdog";

// A 3D double helix: two strands of nodes with cross rungs - the forensic
// "data integrity" motif. Slowly spins on its vertical axis. Bleeds out, no box.
const TEAL = "#B45309";
const CYAN = "#CA8A04";
const SLATE = "#A8A29E";
const CORAL = "#991B1B";

export function Hero3D() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const illo = new Zdog.Illustration({ element: el, zoom: 1, resize: true });
    const helix = new Zdog.Anchor({ addTo: illo, rotate: { z: 0.25 } });
    const N = 11, R = 56, span = 22;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Zdog.TAU * 1.6;
      const y = (i - (N - 1) / 2) * span;
      const ax = Math.cos(a) * R, az = Math.sin(a) * R;
      const flaw = i === 6; // one coral "anomaly" node
      new Zdog.Shape({ addTo: helix, path: [{}], stroke: 13, color: flaw ? CORAL : TEAL, translate: { x: ax, y, z: az } });
      new Zdog.Shape({ addTo: helix, path: [{}], stroke: 13, color: CYAN, translate: { x: -ax, y, z: -az } });
      // rung
      new Zdog.Shape({ addTo: helix, path: [{ x: ax, z: az }, { x: -ax, z: -az }], stroke: 3, color: SLATE, translate: { y } });
    }
    let raf = 0;
    const tick = () => { helix.rotate.y += 0.018; illo.updateRenderGraph(); if (!reduce) raf = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="hero3d" aria-hidden="true" />;
}
