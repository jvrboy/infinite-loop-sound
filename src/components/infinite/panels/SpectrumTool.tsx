import { useEffect, useRef } from "react";
import { getAnalyser, getContext } from "@/audio/engine";

/** Real-time FFT spectrum + waterfall spectrogram. */
export function SpectrumTool() {
  const specRef = useRef<HTMLCanvasElement>(null);
  const waterRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    getContext();
    const a = getAnalyser();
    a.fftSize = 2048;
    const freq = new Uint8Array(a.frequencyBinCount);
    const draw = () => {
      a.getByteFrequencyData(freq);
      const sc = specRef.current, wc = waterRef.current;
      if (sc) {
        const ctx = sc.getContext("2d")!;
        const dpr = window.devicePixelRatio || 1;
        const r = sc.getBoundingClientRect();
        if (sc.width !== r.width * dpr) { sc.width = r.width * dpr; sc.height = r.height * dpr; ctx.scale(dpr, dpr); }
        ctx.clearRect(0, 0, r.width, r.height);
        const bars = Math.min(128, freq.length);
        const bw = r.width / bars;
        for (let i = 0; i < bars; i++) {
          // log mapping
          const li = Math.floor(Math.pow(i / bars, 2) * freq.length);
          const v = freq[li] / 255;
          const h = v * r.height;
          ctx.fillStyle = `oklch(${0.55 + v * 0.25} ${0.15 + v * 0.1} ${215 - v * 80})`;
          ctx.fillRect(i * bw, r.height - h, bw - 1, h);
        }
      }
      if (wc) {
        const ctx = wc.getContext("2d")!;
        const dpr = window.devicePixelRatio || 1;
        const r = wc.getBoundingClientRect();
        if (wc.width !== r.width * dpr) { wc.width = r.width * dpr; wc.height = r.height * dpr; ctx.scale(dpr, dpr); }
        // scroll left by 1px
        const img = ctx.getImageData(1, 0, Math.max(0, r.width - 1), r.height);
        ctx.putImageData(img, 0, 0);
        ctx.clearRect(r.width - 1, 0, 1, r.height);
        const bins = Math.min(r.height, freq.length / 2);
        for (let y = 0; y < r.height; y++) {
          const t = y / r.height;
          const li = Math.floor(Math.pow(1 - t, 2) * bins);
          const v = freq[li] / 255;
          ctx.fillStyle = `oklch(${0.15 + v * 0.55} ${0.05 + v * 0.18} ${215 - v * 80} / ${0.15 + v * 0.85})`;
          ctx.fillRect(r.width - 1, y, 1, 1);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Real-time Spectrum</div>
      <canvas ref={specRef} className="h-24 w-full rounded-xl bg-white/[0.03]" />
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Spectrogram (scrolling)</div>
      <canvas ref={waterRef} className="h-32 w-full rounded-xl bg-white/[0.03]" />
    </div>
  );
}