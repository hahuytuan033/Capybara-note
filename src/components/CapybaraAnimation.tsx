import React, { useEffect, useRef, useState } from 'react';

// ============================================================================
// 🎮 CẤU HÌNH FPS VÀ THỜI LƯỢNG CHO TỪNG TRẠNG THÁI ANIMATION
// - FPS: Tốc độ khung hình (khuyên dùng: 12 FPS cho Idle_Work)
// - Duration: Thời gian chạy trọn vẹn 1 vòng loop (6s cho 145 frames của Idle_Work)
// ============================================================================
export const ANIMATION_FPS_CONFIG = {
  work: 12,  // 12 FPS cho Idle_Work
  tired: 12, // 12 FPS cho Idle_tired
};

export const ANIMATION_DURATION_CONFIG: Record<string, number | undefined> = {
  work: 5,   // 6.0 giây cho 1 vòng loop đầy đủ của Idle_Work (72 bước render / 145 frames)
  tired: undefined, // Chạy tuần tự 23 frames theo FPS
};

// ============================================================================
// ⚙️ BIẾN BOOL CHUYỂN ĐỔI TRẠNG THÁI ANIMATION THỦ CÔNG:
// - true: Luôn chạy anim ban đêm / mệt mỏi (10h tối - 6h sáng - Idle_tired)
// - false: Luôn chạy anim bình thường / làm việc (6h sáng - 10h tối - Idle_Work)
// - null: Tự động chuyển theo đồng hồ hệ thống máy tính
// ============================================================================
export const FORCE_TIRED_ANIM: boolean | null = null;

// Load and sort all frame PNGs from Idle_Work (145 frames)
const workFrameModules = import.meta.glob<{ default: string }>('../assets/images/Idle_Work/*.png', {
  eager: true,
  import: 'default',
});

const workFrameUrls: string[] = Object.keys(workFrameModules)
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  .map((key) => workFrameModules[key] as unknown as string);

// Load and sort all frame PNGs from Idle_tired (23 frames)
const tiredFrameModules = import.meta.glob<{ default: string }>('../assets/images/Idle_tired/*.png', {
  eager: true,
  import: 'default',
});

const tiredFrameUrls: string[] = Object.keys(tiredFrameModules)
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  .map((key) => tiredFrameModules[key] as unknown as string);

// Determine animation type based on Windows system clock (06:00 - 22:00: work, 22:00 - 06:00: tired)
function getAnimationTypeByTime(): 'work' | 'tired' {
  if (FORCE_TIRED_ANIM !== null) {
    return FORCE_TIRED_ANIM ? 'tired' : 'work';
  }
  const currentHour = new Date().getHours();
  return currentHour >= 6 && currentHour < 22 ? 'work' : 'tired';
}

export type CapybaraAnimationMode = 'auto' | 'work' | 'tired';

export interface FpsConfig {
  work?: number;
  tired?: number;
}

export interface CapybaraAnimationProps {
  className?: string;
  fps?: number;
  fpsConfig?: FpsConfig;
  mode?: CapybaraAnimationMode;
  /**
   * Biến bool điều khiển trực tiếp qua Prop:
   * - true: chạy anim ban đêm / buồn ngủ (10h tối - 6h sáng)
   * - false: chạy anim bình thường / làm việc
   * - undefined: chạy theo mode / đồng hồ hệ thống
   */
  isTired?: boolean;
}

export const CapybaraAnimation: React.FC<CapybaraAnimationProps> = ({
  className = 'w-full h-full object-contain',
  fps,
  fpsConfig,
  mode = 'auto',
  isTired,
}) => {
  const getInitialType = (): 'work' | 'tired' => {
    if (typeof isTired === 'boolean') return isTired ? 'tired' : 'work';
    if (FORCE_TIRED_ANIM !== null) return FORCE_TIRED_ANIM ? 'tired' : 'work';
    return mode === 'auto' ? getAnimationTypeByTime() : mode;
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentAnimType, setCurrentAnimType] = useState<'work' | 'tired'>(getInitialType);
  const [imagesReady, setImagesReady] = useState(false);

  const imagesRef = useRef<{
    work: HTMLImageElement[];
    tired: HTMLImageElement[];
  }>({
    work: [],
    tired: [],
  });

  const isPlayingRef = useRef(true);
  const animTypeRef = useRef<'work' | 'tired'>(currentAnimType);
  animTypeRef.current = currentAnimType;

  // Track isTired prop or system clock on Windows to switch animation
  useEffect(() => {
    if (typeof isTired === 'boolean') {
      setCurrentAnimType(isTired ? 'tired' : 'work');
      return;
    }

    if (FORCE_TIRED_ANIM !== null) {
      setCurrentAnimType(FORCE_TIRED_ANIM ? 'tired' : 'work');
      return;
    }

    if (mode !== 'auto') {
      setCurrentAnimType(mode);
      return;
    }

    const checkTime = () => {
      const nextType = getAnimationTypeByTime();
      setCurrentAnimType((prev) => (prev !== nextType ? nextType : prev));
    };

    checkTime();
    // Check every 10 seconds for real-time accuracy across hour transitions
    const interval = setInterval(checkTime, 10000);

    return () => clearInterval(interval);
  }, [mode, isTired]);

  // Preload both animation frame collections (Idle_Work & Idle_tired)
  useEffect(() => {
    let isMounted = true;

    const preloadList = (urls: string[]) => {
      return urls.map((url) => {
        const img = new Image();
        img.src = url;
        return img;
      });
    };

    const workImages = preloadList(workFrameUrls);
    const tiredImages = preloadList(tiredFrameUrls);

    imagesRef.current = {
      work: workImages,
      tired: tiredImages,
    };

    // Mark ready once initial frames are loaded
    let loadedCount = 0;
    const allImages = [...workImages.slice(0, 10), ...tiredImages.slice(0, 5)];
    allImages.forEach((img) => {
      img.onload = () => {
        if (!isMounted) return;
        loadedCount++;
        if (loadedCount >= Math.min(5, allImages.length)) {
          setImagesReady(true);
        }
      };
    });

    // Fallback timer in case images are already cached
    const timer = setTimeout(() => {
      if (isMounted) setImagesReady(true);
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Main animation loop and window focus/blur/visibility handling
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
    let lastType = animTypeRef.current;

    const render = (time: number) => {
      animationFrameId = requestAnimationFrame(render);

      if (!isPlayingRef.current) return;

      const activeType = animTypeRef.current;
      const activeFrames = imagesRef.current[activeType];

      if (!activeFrames || activeFrames.length === 0) return;

      // Lấy FPS tương ứng cho trạng thái hiện tại (từ fpsConfig, fps prop hoặc config mặc định)
      const defaultFps = (activeType === 'work' && fps) ? fps : ANIMATION_FPS_CONFIG[activeType] ?? 12;
      const currentFps = fpsConfig?.[activeType] ?? defaultFps;
      const frameInterval = 1000 / currentFps;

      // If animation type changed (e.g. night time arrived), reset frame index
      if (lastType !== activeType) {
        currentFrame = 0;
        lastType = activeType;
      }

      const elapsed = time - lastTime;
      if (elapsed >= frameInterval) {
        lastTime = time - (elapsed % frameInterval);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Tính toán frame ảnh tương ứng theo FPS và thời lượng 6s (72 bước render / 145 frames)
        const targetDuration = ANIMATION_DURATION_CONFIG[activeType];
        let targetFrameIndex = currentFrame;

        if (targetDuration && targetDuration > 0) {
          const totalRenderSteps = Math.max(1, Math.round(currentFps * targetDuration));
          const stepInLoop = currentFrame % totalRenderSteps;
          targetFrameIndex = Math.floor(stepInLoop * (activeFrames.length / totalRenderSteps));
        } else {
          targetFrameIndex = currentFrame % activeFrames.length;
        }

        const img = activeFrames[targetFrameIndex % activeFrames.length];
        if (img && img.complete && img.naturalWidth > 0) {
          if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        currentFrame = currentFrame + 1;
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fpsConfig, imagesReady]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ imageRendering: 'auto' }}
      title={currentAnimType === 'work' ? 'Capybara Working (Daytime)' : 'Capybara Sleepy (Nighttime)'}
    />
  );
};

export default CapybaraAnimation;
