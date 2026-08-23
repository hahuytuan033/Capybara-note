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

// Kích thước bitmap giữ trong RAM. Capybara hiển thị ở 340px (App.tsx), dùng 2×
// (680px) để nét trên cả màn hình thường lẫn HiDPI. Frame gốc là 1080×1080 nên
// downscale lúc decode cắt bitmap RAM từ ~4.45MB xuống ~1.85MB mỗi frame.
const RENDER_SIZE = 680;

// Giới hạn số frame decode song song để tránh đỉnh RAM tạm thời khi ~60 bản
// 1080×1080 cùng tồn tại trước khi bị thu nhỏ.
const LOAD_CONCURRENCY = 4;

// Dynamic-import glob: returns a map of path -> () => Promise<URL> (lazy, NOT eager).
// Only the frames of the active animation mode are actually imported/decoded.
type FrameLoader = () => Promise<string>;

const sortGlobKeys = (obj: Record<string, unknown>): string[] =>
  Object.keys(obj).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

const workFrameGlob = import.meta.glob('../assets/images/Idle_Work/*.png', { import: 'default' });
const tiredFrameGlob = import.meta.glob('../assets/images/Idle_tired/*.png', { import: 'default' });

const workFrameLoaders: FrameLoader[] = sortGlobKeys(workFrameGlob).map((key) => workFrameGlob[key] as FrameLoader);
const tiredFrameLoaders: FrameLoader[] = sortGlobKeys(tiredFrameGlob).map((key) => tiredFrameGlob[key] as FrameLoader);

// Pre-compute the set of source frame indices the render loop will actually use for a mode.
// This avoids importing/decoding every frame when only a subset is rendered.
function computeUsedFrameIndices(frameCount: number, fps: number, duration?: number): number[] {
  if (!duration || duration <= 0 || frameCount <= 0) {
    return Array.from({ length: frameCount }, (_, i) => i);
  }
  const totalRenderSteps = Math.max(1, Math.round(fps * duration));
  const indices = new Set<number>();
  for (let step = 0; step < totalRenderSteps; step++) {
    const idx = Math.floor((step % totalRenderSteps) * (frameCount / totalRenderSteps)) % frameCount;
    indices.add(idx);
  }
  return Array.from(indices).sort((a, b) => a - b);
}

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
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);

  // Sparse arrays indexed by source frame index; unused indices stay undefined.
  // Only the currently displayed mode holds live ImageBitmap objects (downscaled
  // to RENDER_SIZE); the other mode is released.
  const imagesRef = useRef<{
    work: (ImageBitmap | undefined)[];
    tired: (ImageBitmap | undefined)[];
  }>({
    work: [],
    tired: [],
  });
  const activeLoadedRef = useRef<'work' | 'tired' | null>(null);

  const isPlayingRef = useRef(true);
  const animTypeRef = useRef<'work' | 'tired'>(currentAnimType);
  animTypeRef.current = currentAnimType;

  // Release decoded bitmaps of a mode so the browser can free them immediately.
  // ImageBitmap.close() drops the underlying pixels right away (not GC-dependent).
  const releaseFrames = (type: 'work' | 'tired') => {
    const arr = imagesRef.current[type];
    for (const img of arr) {
      if (img) img.close();
    }
    imagesRef.current[type] = [];
  };

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

  // Lazily load only the active mode's frames (Task 1 + Task 2).
  // The previous mode's bitmaps are released AFTER the new mode is ready,
  // so the canvas keeps showing the last frame (no flicker/blank).
  useEffect(() => {
    let isMounted = true;
    const type = currentAnimType;
    const loaders = type === 'work' ? workFrameLoaders : tiredFrameLoaders;
    const fps = ANIMATION_FPS_CONFIG[type] ?? 12;
    const duration = ANIMATION_DURATION_CONFIG[type];
    const usedIndices = computeUsedFrameIndices(loaders.length, fps, duration);

    setIsLoadingFrames(true);

    // Decode một frame ở đầy đủ độ phân giải rồi thu nhỏ về RENDER_SIZE, chỉ giữ
    // lại ImageBitmap nhỏ. Ảnh gốc (Image tạm) được giải phóng ngay sau đó.
    const loadFrame = async (idx: number): Promise<ImageBitmap | undefined> => {
      const url = await loaders[idx]();
      if (!isMounted || !url) return undefined;
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      try {
        await img.decode();
        if (!isMounted) return undefined;
        const bitmap = await createImageBitmap(img, {
          resizeWidth: RENDER_SIZE,
          resizeHeight: RENDER_SIZE,
          resizeQuality: 'high',
        });
        if (!isMounted) {
          bitmap.close();
          return undefined;
        }
        return bitmap;
      } finally {
        img.src = '';
      }
    };

    const load = async () => {
      const images: (ImageBitmap | undefined)[] = new Array(loaders.length).fill(undefined);

      // Load theo lô có giới hạn concurrency để giữ đỉnh RAM tạm thời ở mức thấp.
      for (let i = 0; i < usedIndices.length; i += LOAD_CONCURRENCY) {
        if (!isMounted) break;
        const batch = usedIndices.slice(i, i + LOAD_CONCURRENCY);
        await Promise.all(
          batch.map(async (idx) => {
            try {
              const bitmap = await loadFrame(idx);
              if (bitmap) images[idx] = bitmap;
            } catch {
              /* skip a single missing frame */
            }
          })
        );
      }

      if (!isMounted) {
        // Component unmounted mid-load: free anything already decoded.
        for (const bmp of images) bmp?.close();
        return;
      }

      imagesRef.current[type] = images;

      // Release the previous mode now that the new one is ready (Task 3).
      const prev = activeLoadedRef.current;
      if (prev && prev !== type) {
        releaseFrames(prev);
      }
      activeLoadedRef.current = type;

      setIsLoadingFrames(false);
      setImagesReady(true);
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [currentAnimType]);

  // Free all decoded bitmaps on unmount (Task 3)
  useEffect(() => {
    return () => {
      releaseFrames('work');
      releaseFrames('tired');
      activeLoadedRef.current = null;
    };
  }, []);

  // Main animation loop and window focus/blur/visibility handling
  useEffect(() => {
    let lastTime = performance.now();
    let animationFrameId: number | null = null;
    let currentFrame = 0;
    let lastType = animTypeRef.current;

    const render = (time: number) => {
      animationFrameId = requestAnimationFrame(render);

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
        if (img) {
          // Canvas backing store cố định ở RENDER_SIZE (nguồn đã downscale sẵn).
          if (canvas.width !== RENDER_SIZE || canvas.height !== RENDER_SIZE) {
            canvas.width = RENDER_SIZE;
            canvas.height = RENDER_SIZE;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        currentFrame = currentFrame + 1;
      }
    };

    // Dừng hẳn vòng lặp rAF khi cửa sổ mất focus / bị ẩn, khởi động lại khi
    // quay lại — thay cho việc để rAF quay không tải liên tục.
    const startLoop = () => {
      if (animationFrameId !== null) return;
      isPlayingRef.current = true;
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(render);
    };
    const stopLoop = () => {
      isPlayingRef.current = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    const handleBlur = () => stopLoop();
    const handleFocus = () => startLoop();
    const handleVisibilityChange = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    startLoop();

    return () => {
      stopLoop();
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
