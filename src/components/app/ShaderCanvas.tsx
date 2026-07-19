import { useEffect, useRef } from 'react';

interface ShaderCanvasProps {
  variant?: 'aurora' | 'hexgrid' | 'plasma' | 'dotfield' | 'neonmesh';
  className?: string;
}

/**
 * Lightweight WebGL-free animated shader backgrounds rendered on a 2D canvas.
 * Inspired by curated presets from the Shaders library (Blueprint, Hex Path, LED Flow).
 * Each variant animates with requestAnimationFrame and respects prefers-reduced-motion.
 */
export function ShaderCanvas({ variant = 'aurora', className }: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
    let h = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    window.addEventListener('resize', onResize);

    let t = 0;
    const renderers: Record<string, (t: number) => void> = {
      aurora: (t) => {
        ctx.fillStyle = '#05060f';
        ctx.fillRect(0, 0, w, h);
        const blobs = 4;
        for (let i = 0; i < blobs; i++) {
          const x = w * (0.5 + 0.35 * Math.sin(t * 0.0007 + i * 1.7));
          const y = h * (0.5 + 0.3 * Math.cos(t * 0.0009 + i * 2.1));
          const r = Math.max(1, Math.min(w, h) * (0.35 + 0.05 * Math.sin(t * 0.001 + i)));
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
          const hues = ['#0ea5e9', '#10b981', '#6366f1', '#06b6d4'];
          grad.addColorStop(0, `${hues[i % hues.length]}55`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
        }
      },
      hexgrid: (t) => {
        ctx.fillStyle = '#08080f';
        ctx.fillRect(0, 0, w, h);
        const size = 28 * window.devicePixelRatio;
        const cols = Math.ceil(w / (size * 1.5)) + 1;
        const rows = Math.ceil(h / (size * Math.sqrt(3))) + 1;
        ctx.lineWidth = 1 * window.devicePixelRatio;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = c * size * 1.5;
            const y = r * size * Math.sqrt(3) + (c % 2 ? (size * Math.sqrt(3)) / 2 : 0);
            const wave = 0.5 + 0.5 * Math.sin(t * 0.001 + (c + r) * 0.5);
            const alpha = 0.05 + wave * 0.25;
            ctx.strokeStyle = `rgba(0, 195, 255, ${alpha})`;
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
              const ang = (Math.PI / 3) * k;
              const px = x + size * Math.cos(ang);
              const py = y + size * Math.sin(ang);
              if (k === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
      },
      plasma: (t) => {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y += 2) {
          for (let x = 0; x < w; x += 2) {
            const v =
              Math.sin(x * 0.02 + t * 0.003) +
              Math.sin(y * 0.02 + t * 0.002) +
              Math.sin((x + y) * 0.015 + t * 0.004) +
              Math.sin(Math.sqrt((x - w / 2) ** 2 + (y - h / 2) ** 2) * 0.01 + t * 0.005);
            const n = (v + 4) / 8;
            const r = Math.floor(10 + n * 40);
            const g = Math.floor(20 + n * 80);
            const b = Math.floor(60 + n * 160);
            for (let dy = 0; dy < 2; dy++) {
              for (let dx = 0; dx < 2; dx++) {
                const idx = ((y + dy) * w + (x + dx)) * 4;
                d[idx] = r;
                d[idx + 1] = g;
                d[idx + 2] = b;
                d[idx + 3] = 180;
              }
            }
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      dotfield: (t) => {
        ctx.fillStyle = '#04050a';
        ctx.fillRect(0, 0, w, h);
        const gap = 24 * window.devicePixelRatio;
        for (let y = 0; y < h; y += gap) {
          for (let x = 0; x < w; x += gap) {
            const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.002 + x * 0.05 + y * 0.04));
            ctx.fillStyle = `rgba(120, 200, 255, ${tw * 0.5})`;
            ctx.beginPath();
            ctx.arc(x, y, 1.2 * window.devicePixelRatio, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      },
      neonmesh: (t) => {
        ctx.fillStyle = '#06060c';
        ctx.fillRect(0, 0, w, h);
        ctx.lineWidth = 1 * window.devicePixelRatio;
        const step = 40 * window.devicePixelRatio;
        for (let x = 0; x <= w; x += step) {
          const off = Math.sin(t * 0.001 + x * 0.01) * 20 * window.devicePixelRatio;
          ctx.strokeStyle = `rgba(0, 220, 200, 0.12)`;
          ctx.beginPath();
          ctx.moveTo(x + off, 0);
          ctx.lineTo(x - off, h);
          ctx.stroke();
        }
        for (let y = 0; y <= h; y += step) {
          const off = Math.cos(t * 0.001 + y * 0.01) * 20 * window.devicePixelRatio;
          ctx.strokeStyle = `rgba(120, 80, 255, 0.12)`;
          ctx.beginPath();
          ctx.moveTo(0, y + off);
          ctx.lineTo(w, y - off);
          ctx.stroke();
        }
      },
    };

    const loop = () => {
      t += reduce ? 0 : 16;
      renderers[variant]?.(t);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [variant]);

  return <canvas ref={canvasRef} className={className} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
