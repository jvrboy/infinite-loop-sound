import { useEffect, useRef } from "react";

export function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Realistic market grid with depth
    const cols = 40;
    const rows = 24;
    const gridPoints: Array<{x: number; y: number; z: number; baseX: number; baseY: number}> = [];
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        gridPoints.push({
          x: c / cols,
          y: r / rows,
          z: 0,
          baseX: c / cols,
          baseY: r / rows,
        });
      }
    }

    // Candlestick-like bars moving across the background
    interface Bar {
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      speed: number;
      opacity: number;
    }
    const bars: Bar[] = [];
    for (let i = 0; i < 30; i++) {
      bars.push({
        x: Math.random(),
        y: 0.3 + Math.random() * 0.4,
        w: 0.002 + Math.random() * 0.004,
        h: 0.05 + Math.random() * 0.15,
        color: Math.random() > 0.5 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
        speed: 0.0002 + Math.random() * 0.0005,
        opacity: 0.02 + Math.random() * 0.06,
      });
    }

    const animate = () => {
      time += 0.005;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Deep dark blue background gradient
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.8);
      bgGrad.addColorStop(0, "rgba(11, 16, 32, 1)");
      bgGrad.addColorStop(1, "rgba(6, 10, 22, 1)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Draw subtle grid with perspective
      ctx.strokeStyle = "rgba(56, 189, 248, 0.03)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= cols; i++) {
        const x = (i / cols) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let i = 0; i <= rows; i++) {
        const y = (i / rows) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Animated bars (candlestick-like)
      bars.forEach(bar => {
        bar.x += bar.speed;
        if (bar.x > 1.05) bar.x = -0.05;
        const bx = bar.x * w;
        const by = bar.y * h;
        const bw = bar.w * w;
        const bh = bar.h * h * (0.8 + 0.2 * Math.sin(time + bar.x * 10));

        ctx.fillStyle = bar.color.replace("0.08", String(bar.opacity * (0.5 + 0.5 * Math.sin(time * 2 + bar.x * 5))));
        ctx.fillRect(bx, by - bh / 2, bw, bh);

        // Wick
        ctx.strokeStyle = bar.color.replace("0.08", String(bar.opacity * 0.5));
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2, by - bh / 2 - bh * 0.3);
        ctx.lineTo(bx + bw / 2, by + bh / 2 + bh * 0.3);
        ctx.stroke();
      });

      // Subtle horizontal flow lines (like a price ticker trail)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.02)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = h * (0.2 + i * 0.15);
        ctx.beginPath();
        for (let x = 0; x < w; x += 2) {
          const yy = y + Math.sin(x * 0.01 + time + i) * 10 + Math.sin(x * 0.003 + time * 0.5 + i * 2) * 20;
          if (x === 0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }

      // Corner vignette
      const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.3, w * 0.5, h * 0.5, w * 0.9);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, opacity: 0.7 }}
    />
  );
}
