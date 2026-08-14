import React, { useEffect, useRef, useState } from 'react';

// Load and sort all frame PNGs from Idle_Work
const frameModules = import.meta.glob<{ default: string }>('../assets/images/Idle_Work/*.png', {
  eager: true,
  import: 'default',
});

const frameUrls: string[] = Object.keys(frameModules)
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  .map((key) => frameModules[key] as unknown as string);

interface CapybaraAnimationProps {
  className?: string;
  fps?: number;
}

export const CapybaraAnimation: React.FC<CapybaraAnimationProps> = ({
  className = 'w-full h-full object-contain',
  fps = 24,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const isPlayingRef = useRef(true);

  // Preload all frames
  useEffect(() => {
    let isMounted = true;
    const loadedImages: HTMLImageElement[] = [];
    let count = 0;

    frameUrls.forEach((url, idx) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        if (!isMounted) return;
        count++;
        if (count >= Math.min(10, frameUrls.length)) {
          // Allow starting once first batch is loaded
          setImagesLoaded(true);
        }
      };
      loadedImages[idx] = img;
    });

    imagesRef.current = loadedImages;

    return () => {
      isMounted = false;
    };
  }, []);

  // Animation and window focus/blur/visibility handling
  useEffect(() => {
    let lastTime = performance.now();

    const handleBlur = () => {
      isPlayingRef.current = false;
    };
    const handleFocus = () => {
      isPlayingRef.current = true;
      lastTime = performance.now();
    };
    const handleVisibilityChange = () => {
      isPlayingRef.current = !document.hidden;
      if (!document.hidden) {
        lastTime = performance.now();
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let animationFrameId: number;
    let currentFrame = 0;
    const frameInterval = 1000 / fps;

    const render = (time: number) => {
      animationFrameId = requestAnimationFrame(render);

      if (!isPlayingRef.current || imagesRef.current.length === 0) {
        return;
      }

      const elapsed = time - lastTime;
      if (elapsed >= frameInterval) {
        lastTime = time - (elapsed % frameInterval);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = imagesRef.current[currentFrame];
        if (img && img.complete && img.naturalWidth > 0) {
          // Sync internal canvas resolution with display width/height
          if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        currentFrame = (currentFrame + 1) % frameUrls.length;
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fps, imagesLoaded]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ imageRendering: 'auto' }}
    />
  );
};

export default CapybaraAnimation;
