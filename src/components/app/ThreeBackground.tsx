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

    // Create particle field with WebGL-like effect using 2D canvas
    const particles: Array<{x: number, y: number, z: number, vx: number, vy: number, size: number}> = [];
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 1000,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 0.5,
      });
    }

    const animate = () => {
      time += 0.01;
      ctx.fillStyle = 'rgba(11, 16, 32, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x + Math.sin(time + x * 0.01) * 10, 0);
        ctx.lineTo(x + Math.sin(time + x * 0.01) * 10, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y + Math.cos(time + y * 0.01) * 10);
        ctx.lineTo(canvas.width, y + Math.cos(time + y * 0.01) * 10);
        ctx.stroke();
      }

      // Draw particles
      particles.forEach((p, i) => {
        p.x += p.vx + Math.sin(time + i * 0.1) * 0.2;
        p.y += p.vy + Math.cos(time + i * 0.1) * 0.2;
        p.z -= 2;
        
        if (p.z < 1) {
          p.z = 1000;
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
        }
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        const scale = 1000 / (1000 + p.z);
        const x2d = p.x;
        const y2d = p.y;
        const size = p.size * scale * 2;

        // Glow effect
        const gradient = ctx.createRadialGradient(x2d, y2d, 0, x2d, y2d, size * 4);
        const hue = (i * 2 + time * 20) % 360;
        gradient.addColorStop(0, `hsla(${200 + Math.sin(time+i)*20}, 100%, 65%, ${0.8 * scale})`);
        gradient.addColorStop(0.5, `hsla(${190}, 100%, 60%, ${0.3 * scale})`);
        gradient.addColorStop(1, 'hsla(220, 100%, 50%, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x2d, y2d, size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `hsla(195, 100%, 70%, ${scale})`;
        ctx.beginPath();
        ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
        ctx.fill();

        // Connections
        particles.slice(i + 1).forEach(p2 => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 * scale) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.15 * (1 - dist / 120) * scale})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      // Central pulse
      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.3;
      const pulse = Math.sin(time * 2) * 0.5 + 0.5;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300);
      gradient.addColorStop(0, `rgba(16, 185, 129, ${0.15 * pulse})`);
      gradient.addColorStop(0.5, `rgba(56, 189, 248, ${0.08 * pulse})`);
      gradient.addColorStop(1, 'rgba(11, 16, 32, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 300, 0, Math.PI * 2);
      ctx.fill();

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
      style={{ zIndex: 0, opacity: 0.6 }}
    />
  );
}