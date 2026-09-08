import React, { useRef, useEffect } from 'react';
import { TrainState, TimeState, Station, RuntimeStationState, Customer } from '../types';
import { audioSynthesizer } from '../utils/audioSynthesizer';

interface TrainCanvasProps {
  trainState: TrainState;
  timeState: TimeState;
  currentStation: Station;
  nextStation: Station;
  progressToNext: number; // 0 to 1
  runtimeStation?: RuntimeStationState;
  onPullWhistle: () => void;
  onOpenWeatherModal?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'smoke' | 'spark' | 'firefly' | 'steam' | 'sparkle';
}

export const TrainCanvas: React.FC<TrainCanvasProps> = ({
  trainState,
  timeState,
  currentStation,
  nextStation,
  progressToNext,
  runtimeStation,
  onPullWhistle,
  onOpenWeatherModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Live state reference to guarantee zero stutter/resets during React re-renders
  const stateRef = useRef({
    trainState,
    timeState,
    currentStation,
    nextStation,
    progressToNext,
    runtimeStation,
  });
  stateRef.current = {
    trainState,
    timeState,
    currentStation,
    nextStation,
    progressToNext,
    runtimeStation,
  };

  // Animation state references (persists across continuous 60fps render loop)
  const animRef = useRef<{
    visualSpeed: number;
    scrollOffsets: number[];
    wheelRotation: number;
    rodAngle: number;
    particles: Particle[];
    clouds: { x: number; y: number; speed: number; scale: number }[];
    cloudyLayers: { x: number; y: number; speed: number; scale: number; opacity: number }[];
    stars: { x: number; y: number; size: number; twinkle: number }[];
    fireflies: { x: number; y: number; vx: number; vy: number }[];
    rainDrops: { x: number; y: number; length: number; speed: number; alpha: number }[];
    splashes: { x: number; y: number; vx: number; vy: number; alpha: number; life: number; maxLife: number }[];
    snowFlakes: { x: number; y: number; size: number; speedY: number; speedX: number; sway: number; alpha: number }[];
    fogBands: { x: number; y: number; width: number; height: number; speed: number; alpha: number }[];
    meteors: { x: number; y: number; length: number; vx: number; vy: number; alpha: number; size: number; color: string; life: number; maxLife: number }[];
    lightning: { active: boolean; timer: number; flashAlpha: number; segments: { x1: number; y1: number; x2: number; y2: number }[] };
    lightningNextTimer: number;
    meteorNextTimer: number;
    lastTimestamp: number;
    chuffTimer: number;
    clickClackTimer: number;
    departStationX: number;
  }>({
    visualSpeed: 0,
    scrollOffsets: [0, 0, 0, 0, 0, 0, 0],
    wheelRotation: 0,
    rodAngle: 0,
    particles: [],
    clouds: [
      { x: 50, y: 35, speed: 0.15, scale: 1.2 },
      { x: 300, y: 60, speed: 0.1, scale: 0.9 },
      { x: 600, y: 25, speed: 0.18, scale: 1.4 },
      { x: 900, y: 75, speed: 0.12, scale: 1.0 },
      { x: 1200, y: 40, speed: 0.16, scale: 1.1 },
    ],
    cloudyLayers: [
      { x: 20, y: 20, speed: 0.22, scale: 1.6, opacity: 0.75 },
      { x: 240, y: 45, speed: 0.18, scale: 2.1, opacity: 0.85 },
      { x: 520, y: 15, speed: 0.25, scale: 1.8, opacity: 0.7 },
      { x: 780, y: 55, speed: 0.2, scale: 2.4, opacity: 0.9 },
      { x: 1050, y: 30, speed: 0.23, scale: 1.9, opacity: 0.8 },
    ],
    stars: Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.45,
      size: 1 + Math.random() * 1.5,
      twinkle: Math.random() * Math.PI * 2,
    })),
    fireflies: Array.from({ length: 25 }, () => ({
      x: Math.random() * 1200,
      y: 280 + Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    })),
    rainDrops: Array.from({ length: 140 }, () => ({
      x: Math.random() * 1400,
      y: Math.random() * 600,
      length: 12 + Math.random() * 14,
      speed: 450 + Math.random() * 250,
      alpha: 0.4 + Math.random() * 0.5,
    })),
    splashes: [],
    snowFlakes: Array.from({ length: 110 }, () => ({
      x: Math.random() * 1400,
      y: Math.random() * 600,
      size: 1.5 + Math.random() * 3.5,
      speedY: 35 + Math.random() * 45,
      speedX: -15 - Math.random() * 25,
      sway: Math.random() * Math.PI * 2,
      alpha: 0.5 + Math.random() * 0.5,
    })),
    fogBands: [
      { x: 0, y: 220, width: 600, height: 90, speed: 12, alpha: 0.28 },
      { x: 450, y: 250, width: 750, height: 110, speed: 16, alpha: 0.35 },
      { x: 200, y: 290, width: 850, height: 120, speed: 20, alpha: 0.42 },
    ],
    meteors: [],
    lightning: { active: false, timer: 0, flashAlpha: 0, segments: [] },
    lightningNextTimer: 3.5 + Math.random() * 4,
    meteorNextTimer: 1.5 + Math.random() * 2.5,
    lastTimestamp: 0,
    chuffTimer: 0,
    clickClackTimer: 0,
    departStationX: 100,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      if (containerRef.current && canvas) {
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    handleResize();

    // 60FPS Render loop
    const render = (timestamp: number) => {
      const anim = animRef.current;
      const {
        trainState: curTrain,
        timeState: curTime,
        currentStation: curStation,
        nextStation: nextSt,
        progressToNext: curProgress,
      } = stateRef.current;

      if (!anim.lastTimestamp) anim.lastTimestamp = timestamp;
      const dt = Math.min((timestamp - anim.lastTimestamp) / 1000, 0.1);
      anim.lastTimestamp = timestamp;

      const w = canvas.width || 800;
      const h = canvas.height || 400;
      const groundY = h * 0.72; // Ground baseline height

      // Smooth visual acceleration / deceleration interpolation
      const targetSpeed = curTrain.is_at_station ? 0 : curTrain.speed_kmh;
      const speedDiff = targetSpeed - anim.visualSpeed;
      if (Math.abs(speedDiff) > 0.05) {
        anim.visualSpeed += speedDiff * Math.min(1.0, dt * 8.0);
      } else {
        anim.visualSpeed = targetSpeed;
      }

      const currentSpeed = anim.visualSpeed;
      const speedRatio = Math.min(1.0, currentSpeed / 120); // 0 to 1
      const isMoving = currentSpeed > 0.3;

      // Update Parallax Scroll Speeds (Directly proportional to the train departing and cruising speed)
      const baseSpeed = currentSpeed * 2.2 * dt;
      anim.scrollOffsets[0] = (anim.scrollOffsets[0] + baseSpeed * 0.04) % w; // Layer 1 (Far peach horizon mountains)
      anim.scrollOffsets[1] = (anim.scrollOffsets[1] + baseSpeed * 0.10) % w; // Layer 2 (Warm tan rolling hills)
      anim.scrollOffsets[2] = (anim.scrollOffsets[2] + baseSpeed * 0.22) % w; // Layer 3 (Misty forest hills)
      anim.scrollOffsets[3] = (anim.scrollOffsets[3] + baseSpeed * 0.45) % w; // Layer 4 (Vertical pine trees)
      anim.scrollOffsets[4] = (anim.scrollOffsets[4] + baseSpeed * 0.72) % w; // Layer 5 (Dark green bush contours)
      anim.scrollOffsets[5] = (anim.scrollOffsets[5] + baseSpeed * 1.0) % w; // Layer 6 (Grassy foreground surface)
      anim.scrollOffsets[6] = (anim.scrollOffsets[6] + baseSpeed * 1.0) % 32; // Railroad track ties (exact 1:1 speed with ground)

      // Update departing station position (moves smoothly at the EXACT same physical rate as the track and foreground ground)
      if (curTrain.is_at_station) {
        anim.departStationX = w * 0.12;
      } else if (anim.departStationX > -850) {
        anim.departStationX -= baseSpeed * 1.0;
      }

      // Update wheel and mechanical rod rotation (smoothly accelerates from 0 as train pulls away)
      anim.wheelRotation += currentSpeed * 0.12 * dt;
      anim.rodAngle += currentSpeed * 0.12 * dt;

      // Procedural Audio & Particle Triggers
      anim.chuffTimer += dt;
      
      // Spawn gentle idle steam even when stationary
      if (!isMoving) {
        if (anim.chuffTimer >= 0.8) {
          anim.chuffTimer = 0;
          // Idle gentle smoke wisp from chimney
          const chimneyX = w * 0.62;
          const chimneyY = groundY - 82;
          anim.particles.push({
            x: chimneyX,
            y: chimneyY,
            vx: -Math.random() * 4 - 2,
            vy: -14 - Math.random() * 8,
            size: 5 + Math.random() * 4,
            alpha: 0.5,
            color: curTime.isNight ? 'rgba(180, 190, 210, ' : 'rgba(235, 240, 248, ',
            life: 0,
            maxLife: 1.6,
            type: 'smoke',
          });
        }
      } else {
        // Interval between chuffs accelerates dynamically as speed increases
        const chuffInterval = Math.max(0.12, 0.85 - speedRatio * 0.70);
        if (anim.chuffTimer >= chuffInterval) {
          anim.chuffTimer = 0;
          audioSynthesizer.playChuff(0.5 + speedRatio * 0.5);

          // Spawn main smoke puff from locomotive chimney (thicker on initial departure surge)
          const chimneyX = w * 0.62;
          const chimneyY = groundY - 82;
          const departureSurge = currentSpeed < 25 ? 1.4 : 1.0;
          anim.particles.push({
            x: chimneyX,
            y: chimneyY,
            vx: -currentSpeed * 0.25 - Math.random() * 12 - 6,
            vy: -22 - Math.random() * 16,
            size: (8 + Math.random() * 6) * departureSurge,
            alpha: 0.85,
            color: curTime.isNight ? 'rgba(180, 190, 210, ' : 'rgba(235, 240, 248, ',
            life: 0,
            maxLife: 1.4 + Math.random() * 0.6,
            type: 'smoke',
          });

          // Piston Steam Jet Exhaust near low front wheels
          const locX = w * 0.58;
          anim.particles.push({
            x: locX + 110,
            y: groundY - 14,
            vx: -currentSpeed * 0.35 - Math.random() * 10 - 15,
            vy: -4 - Math.random() * 6,
            size: (4 + Math.random() * 3) * departureSurge,
            alpha: 0.75,
            color: 'rgba(255, 255, 255, ',
            life: 0,
            maxLife: 0.5 + Math.random() * 0.3,
            type: 'smoke',
          });
        }

        // Track Click-Clack sound
        anim.clickClackTimer += dt;
        const clackInterval = Math.max(0.35, 2.2 - speedRatio * 1.7);
        if (anim.clickClackTimer >= clackInterval) {
          anim.clickClackTimer = 0;
          audioSynthesizer.playClickClack();
        }
      }

      // Update Particles
      for (let i = anim.particles.length - 1; i >= 0; i--) {
        const p = anim.particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          anim.particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.type === 'smoke') {
          p.size += 18 * dt; // Smoke expands as it rises
          p.alpha = Math.max(0, 0.8 * (1 - p.life / p.maxLife));
          p.vy -= 12 * dt; // Rises upwards
        } else if (p.type === 'spark') {
          p.vy += 60 * dt; // Gravity
          p.alpha = 1 - p.life / p.maxLife;
        }
      }

      // ----------------------------------------------------
      // 1. SKY GRADIENT RENDERING
      // ----------------------------------------------------
      drawSkyGradient(ctx, w, h, curTime);

      // Stars (Twinkling in night and twilight)
      if (curTime.dayPhase === 'NIGHT' || curTime.dayPhase === 'DAWN' || curTime.dayPhase === 'SUNSET') {
        const starAlpha = curTime.dayPhase === 'NIGHT' ? 0.85 : 0.4;
        ctx.fillStyle = '#ffffff';
        anim.stars.forEach((s) => {
          s.twinkle += dt * 3;
          const currentSize = s.size * (0.7 + Math.sin(s.twinkle) * 0.3);
          ctx.globalAlpha = starAlpha * (0.6 + Math.sin(s.twinkle * 1.5) * 0.4);
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, currentSize, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1.0;
      }

      // Sun & Moon
      drawCelestialBodies(ctx, w, h, curTime);

      // Sky Weather Backdrop Effects (Sunrays, Thick Clouds, Meteor Shower)
      drawWeatherSkyBackdrop(ctx, w, h, curTime, dt, anim);

      // Standard ambient clouds
      drawClouds(ctx, w, h, anim.clouds, curTime, dt);

      // Distant rolling Fog Bands (Back layer)
      if (curTime.activeWeather === 'FOGGY') {
        drawFogBands(ctx, w, groundY, dt, anim.fogBands, 'BACK');
      }

      // ----------------------------------------------------
      // 2. PARALLAX HILLS LAYERS (Matching User Graphics 01-06)
      // ----------------------------------------------------
      // Layer 01: Distant Undulating Peach/Sunset Mountains
      drawLayer01Mountains(ctx, w, groundY, anim.scrollOffsets[0], curTime);

      // Layer 02: Warm Tan Rolling Hills
      drawLayer02TanHills(ctx, w, groundY, anim.scrollOffsets[1], curTime);

      // Layer 03: Misty Blue-Green Forest Hills
      drawLayer03MistyHills(ctx, w, groundY, anim.scrollOffsets[2], curTime);

      // Layer 04: Geometric Vertical Pine Trees
      drawLayer04VerticalTrees(ctx, w, groundY, anim.scrollOffsets[3], curTime);

      // Layer 05: Dark Green Shrub/Bush Contours
      drawLayer05BushContours(ctx, w, groundY, anim.scrollOffsets[4], curTime);

      // Layer 06: Foreground Grassy Ground Surface
      drawLayer06GrassyGround(ctx, w, groundY, anim.scrollOffsets[5], curTime);

      // ----------------------------------------------------
      // 3. STATION PLATFORM & SHELTER
      // ----------------------------------------------------
      drawStationInfrastructure(
        ctx,
        w,
        groundY,
        curProgress,
        curTrain.is_at_station,
        curStation,
        nextSt,
        anim.departStationX,
        curTime,
        stateRef.current.runtimeStation
      );

      // ----------------------------------------------------
      // 4. RAILROAD TRACKS (Ballast, Sleepers, Steel Rails)
      // ----------------------------------------------------
      drawRailroadTracks(ctx, w, groundY, anim.scrollOffsets[6], curTime);

      // ----------------------------------------------------
      // 5. TRAIN & SPECIALIZED WAGONS
      // ----------------------------------------------------
      drawTrainComposition(
        ctx,
        w,
        groundY,
        curTrain,
        anim.wheelRotation,
        anim.rodAngle,
        curTime
      );

      // ----------------------------------------------------
      // 6. SMOKE & PARTICLES (Above train)
      // ----------------------------------------------------
      anim.particles.forEach((p) => {
        ctx.fillStyle = p.color + p.alpha + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Fireflies during Night
      if (curTime.isNight && curTime.activeWeather !== 'THUNDERSTORM' && curTime.activeWeather !== 'COLD') {
        ctx.fillStyle = '#fef08a';
        anim.fireflies.forEach((f) => {
          f.x = (f.x + f.vx + w) % w;
          f.y = Math.max(groundY - 60, Math.min(groundY + 40, f.y + f.vy));
          ctx.globalAlpha = 0.4 + Math.sin(timestamp * 0.005 + f.x) * 0.4;
          ctx.beginPath();
          ctx.arc(f.x, f.y, 2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1.0;
      }

      // ----------------------------------------------------
      // 7. WEATHER FOREGROUND OVERLAYS (Rain, Lightning, Snow, Mist)
      // ----------------------------------------------------
      drawWeatherForegroundOverlays(ctx, w, h, groundY, curTime, dt, anim, curTrain);

      // ----------------------------------------------------
      // 8. AMBIENT COLOR GRADING & LIGHTING TINT
      // ----------------------------------------------------
      drawWeatherColorGrading(ctx, w, h, curTime);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  const getWeatherIconStr = (wType: string) => {
    switch (wType) {
      case 'SUNNY': return '☀️';
      case 'CLOUDY': return '⛅';
      case 'RAINY': return '🌧️';
      case 'THUNDERSTORM': return '⛈️';
      case 'COLD': return '❄️';
      case 'FOGGY': return '🌫️';
      case 'METEOR_SHOWER': return '🌠';
      default: return '☀️';
    }
  };

  const getWeatherNameStr = (wType: string) => {
    switch (wType) {
      case 'SUNNY': return 'Trời Nắng';
      case 'CLOUDY': return 'Có Mây';
      case 'RAINY': return 'Trời Mưa';
      case 'THUNDERSTORM': return 'Dông Bão';
      case 'COLD': return 'Trời Lạnh & Tuyết';
      case 'FOGGY': return 'Sương Mù';
      case 'METEOR_SHOWER': return 'Mưa Sao Băng';
      default: return 'Trời Nắng';
    }
  };

  return (
    <div
      ref={containerRef}
      id="train-canvas-container"
      className="relative w-full h-full min-h-[360px] overflow-hidden bg-slate-950 select-none cursor-default"
    >
      <canvas ref={canvasRef} className="w-full h-full block pixelated" />

      {/* Interactive Top-Right Controls: Weather Badge & Whistle */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {onOpenWeatherModal && (
          <button
            id="canvas-weather-btn"
            onClick={onOpenWeatherModal}
            className="flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-100 px-3 py-1.5 rounded-full border border-indigo-500/40 shadow-lg backdrop-blur-md transition active:scale-95 cursor-pointer text-xs font-semibold"
            title="Xem & Tùy Chỉnh Hệ Thống Thời Tiết"
          >
            <span className="text-base">{getWeatherIconStr(timeState.activeWeather)}</span>
            <span className="hidden sm:inline">{getWeatherNameStr(timeState.activeWeather)}</span>
          </button>
        )}

        <button
          id="canvas-whistle-btn"
          onClick={() => {
            audioSynthesizer.playWhistle();
            onPullWhistle();
          }}
          className="group relative flex items-center gap-2 bg-amber-500/90 hover:bg-amber-400 text-amber-950 font-bold px-3 py-1.5 rounded-full shadow-lg border-2 border-amber-300 transition-transform active:scale-95 cursor-pointer backdrop-blur-sm"
          title="Kéo còi tàu hơi nước (Choo Choo!)"
        >
          <span className="text-lg">📢</span>
          <span className="text-xs tracking-wider uppercase font-extrabold hidden sm:inline">Kéo Còi Tàu</span>
          <span className="w-2 h-2 rounded-full bg-amber-900 animate-ping absolute -top-0.5 -right-0.5" />
        </button>
      </div>

      {/* Speedometer Overlay in Bottom-Left */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-200">
        <span className="text-amber-400 font-bold">⚙️ {Math.round(trainState.speed_kmh)} km/h</span>
        <span className="text-slate-500">|</span>
        <span className="text-emerald-400">⚖️ {trainState.total_weight_tons.toFixed(0)}T</span>
        <span className="text-slate-500">|</span>
        <span className="text-sky-300">
          {timeState.dayPhase === 'DAWN' ? '🌅 Rạng Sáng' : timeState.dayPhase === 'DAY' ? '☀️ Ban Ngày' : timeState.dayPhase === 'SUNSET' ? '🌇 Hoàng Hôn' : '🌙 Ban Đêm'}
        </span>
        <span className="text-slate-500">|</span>
        <span
          onClick={onOpenWeatherModal}
          className="text-amber-300 font-sans font-medium cursor-pointer hover:underline flex items-center gap-1"
          title="Bấm để đổi thời tiết"
        >
          {getWeatherIconStr(timeState.activeWeather)} {getWeatherNameStr(timeState.activeWeather)}
        </span>
      </div>
    </div>
  );
};

// =========================================================================
// CANVAS DRAWING HELPER FUNCTIONS (Faithfully rendering the pixel art art style)
// =========================================================================

function drawSkyGradient(ctx: CanvasRenderingContext2D, w: number, h: number, timeState: TimeState) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h * 0.75);

  switch (timeState.dayPhase) {
    case 'DAWN':
      gradient.addColorStop(0, '#2e1f47');
      gradient.addColorStop(0.35, '#6e456e');
      gradient.addColorStop(0.7, '#d66d67');
      gradient.addColorStop(1, '#ffc288');
      break;
    case 'DAY':
      gradient.addColorStop(0, '#5390d9');
      gradient.addColorStop(0.4, '#72b0ea');
      gradient.addColorStop(0.8, '#b5e2fa');
      gradient.addColorStop(1, '#eaf4f4');
      break;
    case 'SUNSET':
      // Matches the warm peach/coral tones in Hills Layer 01
      gradient.addColorStop(0, '#662249');
      gradient.addColorStop(0.3, '#bc4749');
      gradient.addColorStop(0.65, '#f48c06');
      gradient.addColorStop(0.9, '#faa307');
      gradient.addColorStop(1, '#ffdf9e');
      break;
    case 'NIGHT':
      gradient.addColorStop(0, '#050814');
      gradient.addColorStop(0.4, '#0d1933');
      gradient.addColorStop(0.8, '#1b2a47');
      gradient.addColorStop(1, '#2c3e66');
      break;
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function drawCelestialBodies(ctx: CanvasRenderingContext2D, w: number, h: number, timeState: TimeState) {
  // Sun
  if (timeState.sunPosition.y <= 1.0 && timeState.sunPosition.y >= 0) {
    const sx = timeState.sunPosition.x * w;
    const sy = timeState.sunPosition.y * (h * 0.65);

    // Sun Outer Glow
    const sunGlow = ctx.createRadialGradient(sx, sy, 5, sx, sy, 60);
    sunGlow.addColorStop(0, timeState.dayPhase === 'SUNSET' ? 'rgba(255, 160, 60, 0.8)' : 'rgba(255, 240, 160, 0.7)');
    sunGlow.addColorStop(1, 'rgba(255, 220, 120, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sx, sy, 60, 0, Math.PI * 2);
    ctx.fill();

    // Sun Disc
    ctx.fillStyle = timeState.dayPhase === 'SUNSET' ? '#ff7b54' : '#fff5cc';
    ctx.beginPath();
    ctx.arc(sx, sy, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  // Moon
  if (timeState.moonPosition.y <= 1.0 && timeState.moonPosition.y >= 0) {
    const mx = timeState.moonPosition.x * w;
    const my = timeState.moonPosition.y * (h * 0.65);

    // Moon Glow
    const moonGlow = ctx.createRadialGradient(mx, my, 5, mx, my, 45);
    moonGlow.addColorStop(0, 'rgba(215, 235, 255, 0.5)');
    moonGlow.addColorStop(1, 'rgba(200, 225, 255, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(mx, my, 45, 0, Math.PI * 2);
    ctx.fill();

    // Crescent Moon Disc
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(mx, my, 14, 0, Math.PI * 2);
    ctx.fill();

    // Moon shadow for crescent look
    ctx.fillStyle = '#0d1933';
    ctx.beginPath();
    ctx.arc(mx - 5, my - 3, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawClouds(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  clouds: { x: number; y: number; speed: number; scale: number }[],
  timeState: TimeState,
  dt: number
) {
  const cloudColor =
    timeState.dayPhase === 'NIGHT'
      ? 'rgba(40, 55, 80, 0.4)'
      : timeState.dayPhase === 'SUNSET'
      ? 'rgba(255, 200, 180, 0.65)'
      : 'rgba(255, 255, 255, 0.75)';

  ctx.fillStyle = cloudColor;
  clouds.forEach((c) => {
    c.x = (c.x + c.speed * 40 * dt) % (w + 200);
    const drawX = c.x - 100;
    const drawY = c.y;

    ctx.beginPath();
    ctx.arc(drawX, drawY, 20 * c.scale, 0, Math.PI * 2);
    ctx.arc(drawX + 25 * c.scale, drawY - 8 * c.scale, 25 * c.scale, 0, Math.PI * 2);
    ctx.arc(drawX + 55 * c.scale, drawY, 18 * c.scale, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Layer 01: Undulating Wavy Peach/Sunset Mountains (Faithfully matching Hills Layer 01.png)
function drawLayer01Mountains(ctx: CanvasRenderingContext2D, w: number, groundY: number, offset: number, timeState: TimeState) {
  const layerY = groundY - 140;
  const period = 380;

  let baseColor = '#fca587'; // Peach coral
  let darkBand = '#e77f67';
  if (timeState.isNight) {
    baseColor = '#1d2d44';
    darkBand = '#132034';
  } else if (timeState.dayPhase === 'DAWN') {
    baseColor = '#cf7182';
    darkBand = '#a84c60';
  }

  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.moveTo(0, groundY);

  for (let x = -period; x <= w + period; x += 15) {
    const waveX = x + offset;
    const y = layerY + Math.sin(waveX * 0.016) * 55 + Math.cos(waveX * 0.008) * 25;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, groundY);
  ctx.closePath();
  ctx.fill();

  // Dithered gradient banding for authentic retro pixel aesthetic
  ctx.fillStyle = darkBand;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let x = -period; x <= w + period; x += 15) {
    const waveX = x + offset;
    const y = layerY + 30 + Math.sin(waveX * 0.016) * 50;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1.0;
}

// Layer 02: Warm Tan Rolling Hills (Matching Hills Layer 02.png)
function drawLayer02TanHills(ctx: CanvasRenderingContext2D, w: number, groundY: number, offset: number, timeState: TimeState) {
  const layerY = groundY - 95;
  const period = 260;

  let color = '#b59275';
  if (timeState.isNight) color = '#243447';
  else if (timeState.dayPhase === 'SUNSET') color = '#99583d';

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, groundY);

  for (let x = -period; x <= w + period; x += 12) {
    const waveX = x + offset;
    const y = layerY + Math.sin(waveX * 0.024) * 35 + Math.sin(waveX * 0.009) * 20;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, groundY);
  ctx.closePath();
  ctx.fill();
}

// Layer 03: Misty Green-Blue Forest Hills (Matching Hills Layer 03.png)
function drawLayer03MistyHills(ctx: CanvasRenderingContext2D, w: number, groundY: number, offset: number, timeState: TimeState) {
  const layerY = groundY - 65;
  const period = 200;

  let color = '#5b756c';
  if (timeState.isNight) color = '#1a2c38';
  else if (timeState.dayPhase === 'SUNSET') color = '#534547';

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, groundY);

  for (let x = -period; x <= w + period; x += 10) {
    const waveX = x + offset;
    const y = layerY + Math.sin(waveX * 0.035) * 22;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, groundY);
  ctx.closePath();
  ctx.fill();
}

// Layer 04: Geometric Vertical Pine Trees (Matching Hills Layer 04.png)
function drawLayer04VerticalTrees(ctx: CanvasRenderingContext2D, w: number, groundY: number, offset: number, timeState: TimeState) {
  const treeSpacing = 240;
  const treeColor = timeState.isNight ? '#162828' : '#3d5a45';
  const trunkColor = timeState.isNight ? '#0d1818' : '#2b3a2f';

  const startX = -((offset % treeSpacing) + treeSpacing);
  for (let x = startX; x <= w + treeSpacing; x += treeSpacing) {
    const treeBaseY = groundY - 20;
    const treeHeight = 110;

    // Tall geometric pixel branch trunk (stylized as in Hills Layer 04)
    ctx.fillStyle = trunkColor;
    ctx.fillRect(x + 18, treeBaseY - treeHeight, 4, treeHeight);
    // Vertical branches
    ctx.fillRect(x + 8, treeBaseY - treeHeight, 3, 40);
    ctx.fillRect(x + 28, treeBaseY - treeHeight + 15, 3, 30);
    ctx.fillRect(x + 11, treeBaseY - treeHeight + 20, 7, 3);
    ctx.fillRect(x + 21, treeBaseY - treeHeight + 35, 7, 3);

    // Foliage dome at base of tree
    ctx.fillStyle = treeColor;
    ctx.beginPath();
    ctx.arc(x + 20, treeBaseY - 10, 32, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Layer 05: Dark Green Bush Contours (Matching Hills Layer 06.png / 05)
function drawLayer05BushContours(ctx: CanvasRenderingContext2D, w: number, groundY: number, offset: number, timeState: TimeState) {
  const bushSpacing = 90;
  const bushColor = timeState.isNight ? '#10221c' : '#2d4a3e';
  const startX = -((offset % bushSpacing) + bushSpacing);

  ctx.fillStyle = bushColor;
  for (let x = startX; x <= w + bushSpacing; x += bushSpacing) {
    ctx.beginPath();
    ctx.arc(x, groundY - 12, 38, 0, Math.PI * 2);
    ctx.arc(x + 35, groundY - 16, 45, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Layer 06: Grassy Foreground Ground (Matching Hills Layer 05.png)
function drawLayer06GrassyGround(ctx: CanvasRenderingContext2D, w: number, groundY: number, offset: number, timeState: TimeState) {
  const grassColor = timeState.isNight ? '#0b1915' : '#22381f';
  const soilColor = timeState.isNight ? '#070f0d' : '#172315';

  // Soil ground base
  ctx.fillStyle = soilColor;
  ctx.fillRect(0, groundY, w, 200);

  // Grass fringe layer
  ctx.fillStyle = grassColor;
  ctx.fillRect(0, groundY - 6, w, 12);

  // Grass tufts along the top edge scrolling synchronized with ground & track
  ctx.fillStyle = timeState.isNight ? '#162e24' : '#385e2b';
  const startX = -((offset % 14) + 14);
  for (let x = startX; x <= w + 14; x += 14) {
    const tuftHeight = 4 + (Math.abs(Math.floor(x * 7)) % 5);
    ctx.fillRect(x, groundY - 6 - tuftHeight, 3, tuftHeight);
  }
}

// Detailed Station Infrastructure, Grand Terminal, Clock Tower, Platform, and Rail Signals
function drawStationInfrastructure(
  ctx: CanvasRenderingContext2D,
  w: number,
  groundY: number,
  progressToNext: number,
  isAtStation: boolean,
  currentStation: Station,
  nextStation: Station,
  departStationX: number,
  timeState: TimeState,
  runtimeStation?: RuntimeStationState
) {
  const platformW = 620;

  if (isAtStation) {
    // 1. Stopped at current station
    drawSingleStation(
      ctx,
      w,
      groundY,
      w * 0.12,
      currentStation,
      'RED',
      timeState,
      runtimeStation?.customers,
      runtimeStation?.number
    );
  } else {
    // 2. Departing from previous station (smooth physical movement matching track & ground speed)
    if (departStationX > -platformW - 120) {
      drawSingleStation(
        ctx,
        w,
        groundY,
        departStationX,
        currentStation,
        'GREEN',
        timeState,
        undefined,
        runtimeStation ? Math.max(1, runtimeStation.number - 1) : undefined
      );
    }

    // 3. Approaching next station
    if (progressToNext >= 0.85) {
      const approachRatio = (progressToNext - 0.85) / 0.15; // 0 to 1
      const nextStationX = w * 1.25 - approachRatio * (w * 1.13);
      const signalState: 'GREEN' | 'YELLOW' | 'RED' = approachRatio > 0.8 ? 'RED' : 'YELLOW';
      drawSingleStation(
        ctx,
        w,
        groundY,
        nextStationX,
        nextStation,
        signalState,
        timeState,
        runtimeStation?.customers,
        runtimeStation?.number
      );
    }
  }
}

// Draw a single complete station architecture at a specified X position
function drawSingleStation(
  ctx: CanvasRenderingContext2D,
  w: number,
  groundY: number,
  stationX: number,
  activeStation: Station,
  signalState: 'GREEN' | 'YELLOW' | 'RED',
  timeState: TimeState,
  customers?: Customer[],
  stationNumber?: number
) {
  const biome = activeStation.biome || 'plains';
  const platformW = 620;
  const platformH = 34;
  const platformY = groundY - 12;

  // -------------------------------------------------------------
  // A. MAIN STATION BUILDING & CLOCK TOWER (Background architecture)
  // -------------------------------------------------------------
  const buildingX = stationX + 40;
  const buildingW = 280;
  const buildingH = 145;
  const buildingY = platformY - buildingH;

  // Biome-specific wall & roof color palettes
  let wallColor = '#854d0e'; // Red-brown brick
  let wallTrim = '#a16207';
  let roofColor = '#78350f'; // Slate clay roof
  let roofTrim = '#92400e';
  let windowGlow = timeState.isNight || timeState.dayPhase === 'SUNSET' ? '#fef08a' : '#93c5fd';

  if (biome === 'snow' || biome === 'mountains') {
    wallColor = '#475569'; // Grey alpine stone
    wallTrim = '#64748b';
    roofColor = '#1e293b'; // Dark slate with snow caps
    roofTrim = '#f8fafc'; // White snow trim
  } else if (biome === 'forest') {
    wallColor = '#713f12'; // Log cabin timber
    wallTrim = '#854d0e';
    roofColor = '#14532d'; // Forest green shingle
    roofTrim = '#166534';
  } else if (biome === 'coastal') {
    wallColor = '#1e3a5f'; // Nautical navy blue
    wallTrim = '#38bdf8';
    roofColor = '#0f172a'; // Deep slate
    roofTrim = '#f1f5f9';
  } else if (biome === 'city') {
    wallColor = '#334155'; // Art-deco slate
    wallTrim = '#e2e8f0';
    roofColor = '#0f172a';
    roofTrim = '#38bdf8';
  }

  // 1. Station Main Hall Body
  ctx.fillStyle = wallColor;
  ctx.fillRect(buildingX, buildingY + 30, buildingW, buildingH - 30);
  ctx.fillStyle = wallTrim;
  ctx.fillRect(buildingX - 4, buildingY + 26, buildingW + 8, 6);

  // Brick / Stone pattern accents
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let by = buildingY + 38; by < platformY - 20; by += 16) {
    for (let bx = buildingX + 10; bx < buildingX + buildingW - 15; bx += 32) {
      ctx.fillRect(bx, by, 20, 2);
    }
  }

  // Main Hall Pitched Roof
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(buildingX - 12, buildingY + 30);
  ctx.lineTo(buildingX + buildingW / 2, buildingY - 10);
  ctx.lineTo(buildingX + buildingW + 12, buildingY + 30);
  ctx.closePath();
  ctx.fill();

  // Roof Trim / Snow Caps
  ctx.fillStyle = roofTrim;
  ctx.fillRect(buildingX - 16, buildingY + 28, buildingW + 32, 5);
  if (biome === 'snow') {
    // Snow accumulation on roof
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(buildingX - 12, buildingY + 28);
    ctx.lineTo(buildingX + buildingW / 2, buildingY - 14);
    ctx.lineTo(buildingX + buildingW + 12, buildingY + 28);
    ctx.lineTo(buildingX + buildingW + 8, buildingY + 32);
    ctx.lineTo(buildingX + buildingW / 2, buildingY - 8);
    ctx.lineTo(buildingX - 8, buildingY + 32);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Grand Clock Tower (Tháp đồng hồ bên trái nhà ga)
  const towerX = buildingX + 25;
  const towerW = 54;
  const towerH = 195;
  const towerY = platformY - towerH;

  // Tower Stone Shaft
  ctx.fillStyle = wallColor;
  ctx.fillRect(towerX, towerY + 35, towerW, towerH - 35);
  ctx.fillStyle = wallTrim;
  ctx.fillRect(towerX - 3, towerY + 32, towerW + 6, 6);

  // Tower Pointed Spire Roof
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(towerX - 6, towerY + 34);
  ctx.lineTo(towerX + towerW / 2, towerY);
  ctx.lineTo(towerX + towerW + 6, towerY + 34);
  ctx.closePath();
  ctx.fill();

  // Weather Vane / Spire Pin
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(towerX + towerW / 2, towerY);
  ctx.lineTo(towerX + towerW / 2, towerY - 18);
  ctx.stroke();
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(towerX + towerW / 2 - 6, towerY - 14, 12, 4);

  // Clock Face (Illuminated Circular Dial)
  const clockCenterX = towerX + towerW / 2;
  const clockCenterY = towerY + 62;
  const clockRadius = 16;

  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(clockCenterX, clockCenterY, clockRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Clock Hour Ticks
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(clockCenterX - 1, clockCenterY - clockRadius + 2, 2, 4);
  ctx.fillRect(clockCenterX - 1, clockCenterY + clockRadius - 6, 2, 4);
  ctx.fillRect(clockCenterX - clockRadius + 2, clockCenterY - 1, 4, 2);
  ctx.fillRect(clockCenterX + clockRadius - 6, clockCenterY - 1, 4, 2);

  // Clock Moving Hands (Animated by time)
  const clockTimeSec = Date.now() * 0.001;
  const hourAngle = (clockTimeSec / 60) % (Math.PI * 2);
  const minAngle = clockTimeSec % (Math.PI * 2);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(clockCenterX, clockCenterY);
  ctx.lineTo(clockCenterX + Math.cos(hourAngle - Math.PI / 2) * 8, clockCenterY + Math.sin(hourAngle - Math.PI / 2) * 8);
  ctx.stroke();

  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(clockCenterX, clockCenterY);
  ctx.lineTo(clockCenterX + Math.cos(minAngle - Math.PI / 2) * 12, clockCenterY + Math.sin(minAngle - Math.PI / 2) * 12);
  ctx.stroke();

  // 3. Illuminated Arch Windows on Main Hall
  const windowPositions = [buildingX + 110, buildingX + 160, buildingX + 210];
  windowPositions.forEach((wx) => {
    // Window Frame
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(wx - 2, buildingY + 54, 30, 44);
    // Window Light Glow
    ctx.fillStyle = windowGlow;
    ctx.fillRect(wx, buildingY + 56, 26, 40);

    // Warm Ambient Light Glow at Night
    if (timeState.isNight || timeState.dayPhase === 'SUNSET') {
      const wGlow = ctx.createRadialGradient(wx + 13, buildingY + 76, 2, wx + 13, buildingY + 76, 40);
      wGlow.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      wGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = wGlow;
      ctx.beginPath();
      ctx.arc(wx + 13, buildingY + 76, 40, 0, Math.PI * 2);
      ctx.fill();
    }

    // Window Pane Grids
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(wx + 12, buildingY + 56, 2, 40);
    ctx.fillRect(wx, buildingY + 74, 26, 2);
  });

  // Grand Entrance Arched Doorway
  const doorX = buildingX + 145;
  ctx.fillStyle = '#451a03';
  ctx.fillRect(doorX, platformY - 44, 38, 44);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.strokeRect(doorX, platformY - 44, 38, 44);

  // -------------------------------------------------------------
  // B. PLATFORM SHELTER CANOPY (Victorian Ironwork & Wood)
  // -------------------------------------------------------------
  const canopyX = stationX + 20;
  const canopyW = platformW - 40;
  const canopyH = 88;
  const canopyY = platformY - canopyH;

  // Canopy Wooden/Slate Arched Roof
  ctx.fillStyle = roofColor;
  ctx.fillRect(canopyX, canopyY, canopyW, 14);
  ctx.fillStyle = roofTrim;
  ctx.fillRect(canopyX - 8, canopyY - 4, canopyW + 16, 6);

  // Cast Iron Trusses & Pillar Columns
  const pillarXPositions = [canopyX + 40, canopyX + 180, canopyX + 320, canopyX + 460];
  pillarXPositions.forEach((px) => {
    // Steel Column Post
    ctx.fillStyle = '#334155';
    ctx.fillRect(px, canopyY + 14, 8, canopyH - 14);

    // Ornate Column Cap & Base
    ctx.fillStyle = '#64748b';
    ctx.fillRect(px - 3, canopyY + 12, 14, 5);
    ctx.fillRect(px - 4, platformY - 14, 16, 14);

    // Diagonal Trusses under roof
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + 4, canopyY + 30);
    ctx.lineTo(px - 20, canopyY + 14);
    ctx.moveTo(px + 4, canopyY + 30);
    ctx.lineTo(px + 28, canopyY + 14);
    ctx.stroke();

    // Hanging Vintage Platform Lanterns
    const lanternX = px + 4;
    const lanternY = canopyY + 38;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(lanternX - 1, lanternY - 8, 2, 8);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(lanternX - 4, lanternY, 8, 10);

    // Warm Light Cones
    if (timeState.isNight || timeState.dayPhase === 'SUNSET') {
      const pGlow = ctx.createRadialGradient(lanternX, lanternY + 5, 2, lanternX, lanternY + 5, 45);
      pGlow.addColorStop(0, 'rgba(251, 191, 36, 0.6)');
      pGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = pGlow;
      ctx.beginPath();
      ctx.arc(lanternX, lanternY + 5, 45, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // -------------------------------------------------------------
  // C. STATION NAMEBOARD SIGN
  // -------------------------------------------------------------
  const signX = stationX + platformW / 2 - 120;
  const signY = canopyY + 22;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(signX, signY, 240, 28);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(signX, signY, 240, 28);

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  const stationLabel = stationNumber
    ? `🚉 GA #${stationNumber}: ${activeStation.station_name.toUpperCase()}`
    : `🚉 ${activeStation.station_name.toUpperCase()}`;
  ctx.fillText(stationLabel, signX + 120, signY + 19);

  // -------------------------------------------------------------
  // D. PLATFORM BASE & HAZARD TACTILE EDGE
  // -------------------------------------------------------------
  // Earth foundation & Stone masonry
  ctx.fillStyle = '#523c2d';
  ctx.fillRect(stationX, platformY + 12, platformW, platformH - 12);

  // Stone slab platform surface
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(stationX, platformY, platformW, 12);

  // Yellow & Black Tactile Warning Strip along the rail edge
  for (let tx = stationX; tx < stationX + platformW; tx += 24) {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(tx, platformY + 9, 14, 3);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(tx + 14, platformY + 9, 10, 3);
  }

  // Stone slab seams
  ctx.fillStyle = '#64748b';
  for (let sx = stationX + 35; sx < stationX + platformW; sx += 40) {
    ctx.fillRect(sx, platformY, 2, 10);
  }

  // -------------------------------------------------------------
  // E. WAITING BENCHES, LUGGAGE STACKS & PASSENGERS
  // -------------------------------------------------------------
  // Wooden Bench on Platform
  const benchX = stationX + 220;
  ctx.fillStyle = '#78350f';
  ctx.fillRect(benchX, platformY - 14, 36, 14);
  ctx.fillStyle = '#451a03';
  ctx.fillRect(benchX + 2, platformY - 22, 32, 8); // Backrest

  // Luggage Leather Suitcases Stack
  const luggageX = stationX + 265;
  ctx.fillStyle = '#b45309';
  ctx.fillRect(luggageX, platformY - 10, 18, 10);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(luggageX + 2, platformY - 18, 14, 8);
  ctx.fillStyle = '#f59e0b'; // Gold luggage straps
  ctx.fillRect(luggageX + 5, platformY - 18, 2, 18);
  ctx.fillRect(luggageX + 12, platformY - 18, 2, 18);

  // Station Passengers Silhouettes / Characters
  const defaultPassengers = [
    { x: stationX + 110, coat: '#1e3a5f', hat: true, waving: signalState === 'GREEN' || signalState === 'RED', luggage: 5 },
    { x: stationX + 145, coat: '#831843', hat: false, waving: false, luggage: 4 },
    { x: stationX + 370, coat: '#14532d', hat: true, waving: true, luggage: 7 },
    { x: stationX + 410, coat: '#475569', hat: true, waving: false, luggage: 6 },
  ];

  const passengers = customers && customers.length > 0
    ? customers.slice(0, 8).map((c, i) => ({
        x: stationX + 90 + i * 42,
        coat: c.coatColor || '#1e3a5f',
        hat: c.hat,
        waving: signalState === 'GREEN' || signalState === 'RED' || c.waving,
        luggage: c.luggageKg,
        avatar: c.avatar,
      }))
    : defaultPassengers;

  passengers.forEach((p) => {
    // Individual suitcase if luggage exists
    if (p.luggage && p.luggage > 0) {
      ctx.fillStyle = '#b45309';
      ctx.fillRect(p.x + 6, platformY - 8, 8, 8);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(p.x + 8, platformY - 8, 2, 8);
    }

    // Head
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(p.x, platformY - 26, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Top Hat / Cap
    if (p.hat) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(p.x - 5, platformY - 33, 10, 3);
      ctx.fillRect(p.x - 3, platformY - 38, 6, 6);
    }

    // Coat / Torso
    ctx.fillStyle = p.coat;
    ctx.fillRect(p.x - 4, platformY - 21, 8, 16);

    // Legs
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(p.x - 3, platformY - 5, 3, 6);
    ctx.fillRect(p.x + 1, platformY - 5, 3, 6);

    // Waving Hand Animation when departing or arrived
    if (p.waving) {
      const waveArm = Math.sin(Date.now() * 0.008) * 6;
      ctx.strokeStyle = p.coat;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x + 4, platformY - 18);
      ctx.lineTo(p.x + 10, platformY - 26 + waveArm);
      ctx.stroke();

      // Hand
      ctx.fillStyle = '#fcd34d';
      ctx.beginPath();
      ctx.arc(p.x + 10, platformY - 27 + waveArm, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // -------------------------------------------------------------
  // F. RAILWAY SIGNAL MAST & WATER TOWER (Hạ tầng đèn tín hiệu)
  // -------------------------------------------------------------
  const signalMastX = stationX + platformW + 25;
  const mastHeight = 85;
  const mastY = groundY - mastHeight;

  // Steel Lattice Signal Mast Post
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(signalMastX, mastY, 6, mastHeight);
  ctx.fillStyle = '#475569';
  ctx.fillRect(signalMastX - 4, groundY - 8, 14, 8);

  // Signal Light Box Head (3-aspect signal)
  const boxW = 16;
  const boxH = 38;
  const boxY = mastY + 4;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(signalMastX - 5, boxY, boxW, boxH);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(signalMastX - 5, boxY, boxW, boxH);

  // 1. RED Signal Light
  const isRed = signalState === 'RED';
  ctx.fillStyle = isRed ? '#ef4444' : '#450a0a';
  ctx.beginPath();
  ctx.arc(signalMastX + 3, boxY + 7, 4.5, 0, Math.PI * 2);
  ctx.fill();
  if (isRed) {
    const redGlow = ctx.createRadialGradient(signalMastX + 3, boxY + 7, 2, signalMastX + 3, boxY + 7, 20);
    redGlow.addColorStop(0, 'rgba(239, 68, 68, 0.9)');
    redGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = redGlow;
    ctx.beginPath();
    ctx.arc(signalMastX + 3, boxY + 7, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. YELLOW Signal Light
  const isYellow = signalState === 'YELLOW';
  ctx.fillStyle = isYellow ? '#eab308' : '#422006';
  ctx.beginPath();
  ctx.arc(signalMastX + 3, boxY + 19, 4.5, 0, Math.PI * 2);
  ctx.fill();
  if (isYellow) {
    const yelGlow = ctx.createRadialGradient(signalMastX + 3, boxY + 19, 2, signalMastX + 3, boxY + 19, 20);
    yelGlow.addColorStop(0, 'rgba(234, 179, 8, 0.9)');
    yelGlow.addColorStop(1, 'rgba(234, 179, 8, 0)');
    ctx.fillStyle = yelGlow;
    ctx.beginPath();
    ctx.arc(signalMastX + 3, boxY + 19, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. GREEN Signal Light (Active on departure!)
  const isGreen = signalState === 'GREEN';
  ctx.fillStyle = isGreen ? '#22c55e' : '#052e16';
  ctx.beginPath();
  ctx.arc(signalMastX + 3, boxY + 31, 4.5, 0, Math.PI * 2);
  ctx.fill();
  if (isGreen) {
    const grnGlow = ctx.createRadialGradient(signalMastX + 3, boxY + 31, 2, signalMastX + 3, boxY + 31, 24);
    grnGlow.addColorStop(0, 'rgba(34, 197, 94, 0.95)');
    grnGlow.addColorStop(1, 'rgba(34, 197, 94, 0)');
    ctx.fillStyle = grnGlow;
    ctx.beginPath();
    ctx.arc(signalMastX + 3, boxY + 31, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  // Locomotive Water Replenishment Tank & Crane
  const waterX = signalMastX + 45;
  const tankH = 70;
  const tankY = groundY - tankH;
  // Wooden Stilt Legs
  ctx.fillStyle = '#523c2d';
  ctx.fillRect(waterX, tankY + 30, 4, 40);
  ctx.fillRect(waterX + 28, tankY + 30, 4, 40);
  // Tank Barrel
  ctx.fillStyle = '#78350f';
  ctx.fillRect(waterX - 4, tankY, 40, 32);
  ctx.fillStyle = '#1e293b'; // Iron bands
  ctx.fillRect(waterX - 4, tankY + 6, 40, 3);
  ctx.fillRect(waterX - 4, tankY + 22, 40, 3);
  // Water Spout Crane Arm
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(waterX, tankY + 16);
  ctx.lineTo(waterX - 18, tankY + 28);
  ctx.lineTo(waterX - 18, tankY + 38);
  ctx.stroke();
}

// Railroad Tracks (Ballast, Ties, and Steel Rails)
function drawRailroadTracks(ctx: CanvasRenderingContext2D, w: number, groundY: number, trackOffset: number, timeState: TimeState) {
  const trackY = groundY + 12;
  const tiePitch = 32;

  // Ballast Bed (Gravel)
  ctx.fillStyle = timeState.isNight ? '#1c212d' : '#475569';
  ctx.fillRect(0, trackY - 4, w, 24);

  // Ballast textured specks (scrolling 1:1 with track ties)
  ctx.fillStyle = timeState.isNight ? '#111827' : '#334155';
  const speckStart = -((trackOffset % tiePitch) + tiePitch * 2);
  for (let bx = speckStart; bx <= w + tiePitch * 2; bx += 16) {
    ctx.fillRect(bx + 3, trackY - 1, 3, 2);
    ctx.fillRect(bx + 9, trackY + 14, 2, 2);
  }

  // Wooden Ties / Sleepers (smooth continuous scrolling matching wheel rolling speed & station departure)
  ctx.fillStyle = '#3e2723';
  const startX = -((trackOffset % tiePitch) + tiePitch * 2);
  for (let x = startX; x <= w + tiePitch * 2; x += tiePitch) {
    ctx.fillRect(x, trackY - 2, 16, 18);
    // Steel tie plates
    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(x + 2, trackY, 3, 14);
    ctx.fillRect(x + 11, trackY, 3, 14);
    ctx.fillStyle = '#3e2723';
  }

  // Steel Rails (Top and Bottom rails)
  // Rail 1
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, trackY + 2, w, 4);
  ctx.fillStyle = '#cbd5e1'; // Specular highlight
  ctx.fillRect(0, trackY + 2, w, 1);

  // Rail 2
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, trackY + 11, w, 4);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, trackY + 11, w, 1);
}

// Main Train Composition (Locomotive + Coal Tender + Specialized Wagons)
function drawTrainComposition(
  ctx: CanvasRenderingContext2D,
  w: number,
  groundY: number,
  trainState: TrainState,
  wheelRotation: number,
  rodAngle: number,
  timeState: TimeState
) {
  // Subtle suspension vibration when rolling
  const isMoving = !trainState.is_at_station && trainState.speed_kmh > 1;
  const suspensionBob = isMoving ? Math.sin(Date.now() * 0.015) * 0.6 : 0;
  const trainY = groundY + 8 + suspensionBob;
  const carWidth = 90;
  const carSpacing = 8;

  // Position locomotive towards right side of canvas
  const locX = w * 0.58;

  // -----------------------------------------------------------------
  // 1. STEAM LOCOMOTIVE (Matching sheet_train_v18.png)
  // -----------------------------------------------------------------
  drawLocomotive(ctx, locX, trainY, trainState, wheelRotation, rodAngle, timeState);

  // -----------------------------------------------------------------
  // 2. SPECIALIZED CARRIAGES (Only cars in player's train car_list)
  // -----------------------------------------------------------------
  let currentCarX = locX;

  trainState.car_list.forEach((car, index) => {
    const nextCarX = currentCarX - carWidth - carSpacing;
    drawCoupler(ctx, nextCarX + carWidth, currentCarX, trainY);

    switch (car.car_type_id) {
      case 'GREENHOUSE_POTATO':
        drawGreenhouseCar(ctx, nextCarX, trainY, car, wheelRotation, timeState);
        break;
      case 'BARN_CHICKEN':
        drawChickenBarnCar(ctx, nextCarX, trainY, car, wheelRotation, index);
        break;
      case 'STORAGE':
        drawStorageCar(ctx, nextCarX, trainY, car, wheelRotation);
        break;
      case 'FUEL_GENERATOR':
        drawFuelGeneratorCar(ctx, nextCarX, trainY, car, wheelRotation, timeState);
        break;
      case 'MAINTENANCE':
        drawMaintenanceCar(ctx, nextCarX, trainY, car, wheelRotation, timeState);
        break;
      case 'PASSENGER':
        drawPassengerCar(ctx, nextCarX, trainY, car, wheelRotation, timeState);
        break;
      case 'RESTAURANT':
        drawRestaurantCar(ctx, nextCarX, trainY, car, wheelRotation, timeState);
        break;
    }

    currentCarX = nextCarX;
  });
}

// Coupler bar connecting train cars
function drawCoupler(ctx: CanvasRenderingContext2D, x1: number, x2: number, trainY: number) {
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x1 - 2, trainY - 14, x2 - x1 + 4, 5);
}

// Steam Locomotive Renderer (Faithfully replicating the red-and-black steam engine in sheet_train_v18.png)
function drawLocomotive(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  trainState: TrainState,
  wheelRotation: number,
  rodAngle: number,
  timeState: TimeState
) {
  const locW = 120;
  const locH = 65;
  const locY = y - locH;
  const isMoving = !trainState.is_at_station && trainState.speed_kmh > 1;
  const now = Date.now();

  // 1. Headlight Conical Beam (Pierces darkness during Night/Sunset)
  if (timeState.isNight || timeState.dayPhase === 'SUNSET') {
    const lightX = x + locW - 4;
    const lightY = locY + 32;
    const beamGradient = ctx.createRadialGradient(lightX, lightY, 5, lightX + 220, lightY, 180);
    beamGradient.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
    beamGradient.addColorStop(0.3, 'rgba(253, 224, 71, 0.4)');
    beamGradient.addColorStop(1, 'rgba(234, 179, 8, 0)');

    ctx.fillStyle = beamGradient;
    ctx.beginPath();
    ctx.moveTo(lightX, lightY - 4);
    ctx.lineTo(lightX + 280, lightY - 60);
    ctx.lineTo(lightX + 280, lightY + 50);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Chassis Base Frame
  ctx.fillStyle = '#1f242d';
  ctx.fillRect(x, locY + 45, locW, 10);

  // 3. Steam Boiler (Dark Charcoal Steel with brass rivets and thermal sheen)
  ctx.fillStyle = '#2c3340';
  ctx.fillRect(x + 36, locY + 18, 72, 28);

  // Boiler subtle animated heat sheen
  const heatSheen = 0.12 + Math.sin(now * 0.003) * 0.06;
  ctx.fillStyle = `rgba(254, 215, 170, ${heatSheen})`;
  ctx.fillRect(x + 38, locY + 20, 68, 8);

  // Gold Brass Boiler Bands with Rivets
  ctx.fillStyle = '#d97706'; // Gold brass bands
  ctx.fillRect(x + 55, locY + 18, 3.5, 28);
  ctx.fillRect(x + 78, locY + 18, 3.5, 28);
  ctx.fillRect(x + 98, locY + 18, 3.5, 28);

  // Brass Rivets
  ctx.fillStyle = '#fef08a';
  for (let ry = locY + 20; ry <= locY + 44; ry += 6) {
    ctx.fillRect(x + 56, ry, 1.5, 1.5);
    ctx.fillRect(x + 79, ry, 1.5, 1.5);
    ctx.fillRect(x + 99, ry, 1.5, 1.5);
  }

  // Boiler top curve
  ctx.fillStyle = '#3d4657';
  ctx.fillRect(x + 36, locY + 18, 72, 4);

  // 4. Chimney Stack (Exhaust funnel)
  ctx.fillStyle = '#1f242d';
  ctx.fillRect(x + 92, locY - 14, 14, 32);
  // Chimney crown flared rim
  ctx.fillStyle = '#475569';
  ctx.fillRect(x + 88, locY - 16, 22, 6);

  // 5. Golden Steam Dome & Live Steam Safety Valve
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(x + 68, locY + 14, 6, 0, Math.PI * 2);
  ctx.fill();

  // Steam safety valve wisp (Animated small steam puff escaping valve)
  const valveSteamPhase = (now * 0.008) % Math.PI;
  const valveSteamSize = 2 + Math.sin(valveSteamPhase) * 2;
  const valveSteamAlpha = 0.35 + Math.sin(valveSteamPhase) * 0.25;
  ctx.fillStyle = `rgba(240, 245, 255, ${valveSteamAlpha})`;
  ctx.beginPath();
  ctx.arc(x + 68 - (isMoving ? 4 : 0), locY + 6 - valveSteamSize, valveSteamSize, 0, Math.PI * 2);
  ctx.fill();

  // Steam whistle post
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(x + 48, locY + 8, 4, 10);

  // 6. Driver's Cabin (Classic Crimson Red with arched roof)
  ctx.fillStyle = '#dc2626'; // Vibrant red cab
  ctx.fillRect(x, locY + 4, 38, 44);
  // Cab Roof Overhang
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(x - 4, locY, 46, 6);

  // Cabin Window with Animated Driver
  ctx.fillStyle = timeState.isNight ? '#fef08a' : '#93c5fd';
  ctx.fillRect(x + 12, locY + 10, 16, 16);

  // Animated Driver inside window (Bobs and controls the steam lever)
  const driverBob = isMoving ? Math.sin(now * 0.01) * 1.5 : 0;
  // Driver head with train engineer cap
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x + 20, locY + 18 + driverBob, 4, 0, Math.PI * 2);
  ctx.fill();
  // Engineer Hat Visor
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(x + 18, locY + 14 + driverBob, 6, 2.5);
  // Driver Body / Coat
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x + 16, locY + 22 + driverBob, 8, 4);

  // 7. ANIMATED BOILER FIREBOX FURNACE (Lò hơi rực lửa than hồng bập bùng)
  // Firebox Door Frame (Arch under cab/boiler)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x + 24, locY + 32, 16, 14);
  ctx.fillStyle = '#334155';
  ctx.strokeRect(x + 24, locY + 32, 16, 14);

  // Roaring Firebox Flames (Animated flickering fire inside furnace)
  const fireFlicker1 = Math.sin(now * 0.02) * 2;
  const fireFlicker2 = Math.cos(now * 0.027) * 2.5;
  const fireFlicker3 = Math.sin(now * 0.035 + 1.2) * 2;

  // Outer orange fire
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.moveTo(x + 26, locY + 44);
  ctx.lineTo(x + 28, locY + 37 + fireFlicker1);
  ctx.lineTo(x + 31, locY + 41);
  ctx.lineTo(x + 34, locY + 35 + fireFlicker2);
  ctx.lineTo(x + 37, locY + 40);
  ctx.lineTo(x + 38, locY + 44);
  ctx.closePath();
  ctx.fill();

  // Inner intense golden/yellow core flames
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(x + 28, locY + 44);
  ctx.lineTo(x + 30, locY + 39 + fireFlicker3);
  ctx.lineTo(x + 32, locY + 42);
  ctx.lineTo(x + 35, locY + 38 + fireFlicker1);
  ctx.lineTo(x + 37, locY + 44);
  ctx.closePath();
  ctx.fill();

  // Firebox Furnace Grate Bars
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(x + 25, locY + 41, 14, 1.5);
  ctx.fillRect(x + 25, locY + 37, 14, 1.5);

  // Warm firebox glow on chassis ground
  const fireGlow = 0.25 + Math.sin(now * 0.015) * 0.12;
  ctx.fillStyle = `rgba(249, 115, 22, ${fireGlow})`;
  ctx.beginPath();
  ctx.arc(x + 32, locY + 48, 12, 0, Math.PI);
  ctx.fill();

  // 8. ANIMATED BOILER STEAM PRESSURE GAUGE (Đồng hồ đo áp suất nồi hơi)
  // Round brass gauge housing
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(x + 48, locY + 28, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fef3c7'; // White/cream gauge face
  ctx.beginPath();
  ctx.arc(x + 48, locY + 28, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Gauge Needle (Vibrating pressure needle reflecting active steam pressure)
  const needleAngle = -Math.PI * 0.25 + (isMoving ? Math.sin(now * 0.012) * 0.4 + 0.3 : Math.sin(now * 0.004) * 0.1);
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + 48, locY + 28);
  ctx.lineTo(x + 48 + Math.cos(needleAngle) * 3, locY + 28 + Math.sin(needleAngle) * 3);
  ctx.stroke();

  // 9. Front Cowcatcher / Pilot Grill (Red & Yellow warning stripes)
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(x + locW - 4, locY + 45);
  ctx.lineTo(x + locW + 16, locY + 54);
  ctx.lineTo(x + locW - 4, locY + 54);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(x + locW + 4, locY + 48, 4, 5);

  // 10. Front Headlight Housing
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(x + locW - 6, locY + 28, 8, 10);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(x + locW - 1, locY + 30, 4, 6);

  // 11. Drive Wheels & Connecting Side Rods (Animated!)
  const wheelPositions = [x + 20, x + 52, x + 84];
  const wheelRadius = 11;
  const wheelCenterY = locY + 54;

  wheelPositions.forEach((wx) => {
    drawTrainWheel(ctx, wx, wheelCenterY, wheelRadius, wheelRotation);
  });

  // Connecting Side Rod (Reciprocating Piston Rod linking all drive wheels)
  const rodOffsetX = Math.cos(rodAngle) * 5;
  const rodOffsetY = Math.sin(rodAngle) * 5;

  ctx.fillStyle = '#f59e0b'; // Brass drive rod
  ctx.fillRect(
    wheelPositions[0] + rodOffsetX,
    wheelCenterY + rodOffsetY - 2,
    wheelPositions[2] - wheelPositions[0],
    4
  );

  // Piston Crosshead slider
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(wheelPositions[2] + rodOffsetX, wheelCenterY + rodOffsetY - 3, 14, 6);
}

// Coal Tender Wagon (Matching sheet_train_v18.png tender cart)
function drawCoalTender(ctx: CanvasRenderingContext2D, x: number, y: number, wheelRotation: number) {
  const tenderW = 75;
  const tenderH = 45;
  const tenderY = y - tenderH;
  const now = Date.now();

  // Tender Box Chassis
  ctx.fillStyle = '#1f242d';
  ctx.fillRect(x, tenderY + 32, tenderW, 8);

  // Tender Red Body
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(x + 4, tenderY + 12, tenderW - 8, 20);
  // Upper flared rim
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(x + 2, tenderY + 10, tenderW - 4, 4);

  // Heaped Coal Pile with subtle texture
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x + 20, tenderY + 10, 10, Math.PI, 0);
  ctx.arc(x + 38, tenderY + 8, 14, Math.PI, 0);
  ctx.arc(x + 55, tenderY + 10, 11, Math.PI, 0);
  ctx.fill();

  // Coal lumps glistening highlights
  const coalGlint = Math.sin(now * 0.005) > 0.6;
  ctx.fillStyle = coalGlint ? '#475569' : '#1e293b';
  ctx.fillRect(x + 28, tenderY + 2, 3, 3);
  ctx.fillRect(x + 44, tenderY + 3, 3, 2);

  // Wheels
  drawTrainWheel(ctx, x + 16, tenderY + 38, 8, wheelRotation);
  drawTrainWheel(ctx, x + 38, tenderY + 38, 8, wheelRotation);
  drawTrainWheel(ctx, x + 60, tenderY + 38, 8, wheelRotation);
}

// Greenhouse Potato Wagon (Glass roof, glowing warmth, green potato crops)
function drawGreenhouseCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  car: { growth_timer: number },
  wheelRotation: number,
  timeState: TimeState
) {
  const carW = 85;
  const carH = 50;
  const carY = y - carH;

  // Base
  ctx.fillStyle = '#475569';
  ctx.fillRect(x, carY + 36, carW, 8);

  // Greenhouse Frame & Warm Interior Glow
  ctx.fillStyle = timeState.isNight ? 'rgba(34, 197, 94, 0.45)' : 'rgba(187, 247, 208, 0.6)';
  ctx.fillRect(x + 4, carY + 8, carW - 8, 28);

  // Arched Glass Framework
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, carY + 8, carW - 8, 28);

  // Glass Panels dividers
  ctx.fillStyle = '#334155';
  ctx.fillRect(x + 24, carY + 8, 2, 28);
  ctx.fillRect(x + 44, carY + 8, 2, 28);
  ctx.fillRect(x + 64, carY + 8, 2, 28);

  // Soil bed inside greenhouse
  ctx.fillStyle = '#451a03';
  ctx.fillRect(x + 6, carY + 28, carW - 12, 8);

  // Green Leafy Potato Plants
  const isReady = car.growth_timer <= 0.5;
  ctx.fillStyle = isReady ? '#22c55e' : '#86efac';
  for (let px = x + 12; px < x + carW - 10; px += 12) {
    ctx.beginPath();
    ctx.arc(px, carY + 26, isReady ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Harvest Ready Glow
  if (isReady) {
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('🥔 READY', x + 16, carY + 4);
  }

  // Wheels
  drawTrainWheel(ctx, x + 18, carY + 42, 8, wheelRotation);
  drawTrainWheel(ctx, x + carW - 18, carY + 42, 8, wheelRotation);
}

// Chicken Barn Wagon (Wooden coop, wire mesh, animated chickens)
function drawChickenBarnCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _car: { growth_timer: number },
  wheelRotation: number,
  carIndex: number
) {
  const carW = 85;
  const carH = 50;
  const carY = y - carH;

  // Base
  ctx.fillStyle = '#475569';
  ctx.fillRect(x, carY + 36, carW, 8);

  // Wooden Barn Walls
  ctx.fillStyle = '#b45309'; // Warm barn wood
  ctx.fillRect(x + 4, carY + 12, carW - 8, 24);

  // Coop Slatted Windows with straw inside
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(x + 10, carY + 18, 18, 12);
  ctx.fillRect(x + 36, carY + 18, 18, 12);
  ctx.fillRect(x + 60, carY + 18, 18, 12);

  // Animated Chickens pecking in the window
  const hop = Math.sin(Date.now() * 0.006 + carIndex) * 2;
  // Chicken 1
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + 19, carY + 24 + hop, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef4444'; // Comb
  ctx.fillRect(x + 19, carY + 20 + hop, 2, 2);

  // Chicken 2
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + 45, carY + 24 - hop, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x + 45, carY + 20 - hop, 2, 2);

  // Roof
  ctx.fillStyle = '#78350f';
  ctx.fillRect(x + 2, carY + 8, carW - 4, 5);

  // Wheels
  drawTrainWheel(ctx, x + 18, carY + 42, 8, wheelRotation);
  drawTrainWheel(ctx, x + carW - 18, carY + 42, 8, wheelRotation);
}

// Storage Wagon (Cargo stacks, sacks, crates, fuel barrels)
function drawStorageCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _car: unknown,
  wheelRotation: number
) {
  const carW = 85;
  const carH = 48;
  const carY = y - carH;

  // Base
  ctx.fillStyle = '#334155';
  ctx.fillRect(x, carY + 34, carW, 8);

  // Wooden side railing
  ctx.fillStyle = '#64748b';
  ctx.fillRect(x + 4, carY + 24, carW - 8, 10);

  // Stacked Cargo Crates & Sacks
  // Wooden crate 1
  ctx.fillStyle = '#d97706';
  ctx.fillRect(x + 10, carY + 12, 20, 14);
  ctx.strokeStyle = '#92400e';
  ctx.strokeRect(x + 10, carY + 12, 20, 14);

  // Potato Sacks
  ctx.fillStyle = '#ca8a04';
  ctx.beginPath();
  ctx.arc(x + 42, carY + 18, 8, 0, Math.PI * 2);
  ctx.arc(x + 54, carY + 18, 8, 0, Math.PI * 2);
  ctx.fill();

  // Biofuel Blue Drum Barrel
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(x + 64, carY + 10, 14, 18);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(x + 64, carY + 13, 14, 2);
  ctx.fillRect(x + 64, carY + 21, 14, 2);

  // Wheels
  drawTrainWheel(ctx, x + 18, carY + 40, 8, wheelRotation);
  drawTrainWheel(ctx, x + carW - 18, carY + 40, 8, wheelRotation);
}

// Passenger Car (Lit windows, silhouettes, roof vents)
function drawPassengerCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _car: unknown,
  wheelRotation: number,
  timeState: TimeState
) {
  const carW = 92;
  const carH = 54;
  const carY = y - carH;

  // Body
  ctx.fillStyle = '#1e3a8a'; // Royal blue passenger coach
  ctx.fillRect(x + 4, carY + 10, carW - 8, 28);
  // Gold Trim Line
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(x + 4, carY + 28, carW - 8, 2);

  // Roof
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x + 2, carY + 6, carW - 4, 6);

  // Warm Rectangular Windows
  const windowColor = timeState.isNight ? '#fef08a' : '#dbeafe';
  for (let wx = x + 12; wx < x + carW - 12; wx += 18) {
    ctx.fillStyle = windowColor;
    ctx.fillRect(wx, carY + 14, 12, 11);

    // Passenger head silhouette
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(wx + 6, carY + 20, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wheels
  drawTrainWheel(ctx, x + 18, carY + 44, 8, wheelRotation);
  drawTrainWheel(ctx, x + carW - 18, carY + 44, 8, wheelRotation);
}

// Fuel Generator Car (High-tech energy coils, pulsing blue glow, fuel tanks)
function drawFuelGeneratorCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _car: unknown,
  wheelRotation: number,
  timeState: TimeState
) {
  const carW = 88;
  const carH = 52;
  const carY = y - carH;

  // Base Chassis
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x, carY + 38, carW, 8);

  // Armored Generator Housing (Dark Slate / Teal)
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(x + 4, carY + 12, carW - 8, 26);
  ctx.fillStyle = '#115e59';
  ctx.fillRect(x + 4, carY + 10, carW - 8, 4);

  // Energy Plasma Core in Center (Animated pulsing glow)
  const pulse = 0.6 + Math.sin(Date.now() * 0.008) * 0.4;
  ctx.fillStyle = `rgba(34, 211, 238, ${pulse})`;
  ctx.fillRect(x + 32, carY + 16, 24, 16);
  ctx.strokeStyle = '#0891b2';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 32, carY + 16, 24, 16);

  // Core Plasma Spark / Energy Bars
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 42, carY + 18, 4, 12);
  ctx.fillRect(x + 36, carY + 22, 16, 4);

  // Fuel Storage Cannisters on Left & Right
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(x + 8, carY + 14, 18, 20);
  ctx.fillRect(x + 62, carY + 14, 18, 20);

  // Glowing Green/Blue Indicator LED
  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.arc(x + 12, carY + 18, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Fuel Vapor / Steam Pipe
  ctx.fillStyle = '#334155';
  ctx.fillRect(x + 41, carY + 4, 6, 8);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(x + 39, carY + 2, 10, 3);

  // Status Label
  if (timeState.isNight) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('⚡FUEL', x + 28, carY + 6);
  }

  // Wheels
  drawTrainWheel(ctx, x + 18, carY + 44, 8, wheelRotation);
  drawTrainWheel(ctx, x + carW - 18, carY + 44, 8, wheelRotation);
}

// Maintenance & Repair Car (Robotic arm, hazard stripes, welding beacon)
function drawMaintenanceCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _car: unknown,
  wheelRotation: number,
  _timeState: TimeState
) {
  const carW = 88;
  const carH = 52;
  const carY = y - carH;

  // Base Chassis
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x, carY + 38, carW, 8);

  // Mobile Workshop Body (Industrial Steel Orange/Yellow)
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(x + 4, carY + 16, carW - 8, 22);

  // Hazard Diagonal Stripes at Bottom
  ctx.fillStyle = '#1e293b';
  for (let sx = x + 6; sx < x + carW - 10; sx += 12) {
    ctx.beginPath();
    ctx.moveTo(sx, carY + 38);
    ctx.lineTo(sx + 5, carY + 32);
    ctx.lineTo(sx + 9, carY + 32);
    ctx.lineTo(sx + 4, carY + 38);
    ctx.closePath();
    ctx.fill();
  }

  // Tool Rack / Spare Parts on Side
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(x + 10, carY + 20, 16, 10);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(x + 12, carY + 22, 12, 2);
  ctx.fillRect(x + 12, carY + 26, 8, 2);

  // Articulated Mechanical Robotic Repair Arm
  const armAngle = Math.sin(Date.now() * 0.005) * 0.3;
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 52, carY + 16);
  ctx.lineTo(x + 58 + Math.cos(armAngle) * 14, carY + 6 + Math.sin(armAngle) * 6);
  ctx.lineTo(x + 72 + Math.cos(armAngle) * 10, carY + 12 + Math.sin(armAngle) * 8);
  ctx.stroke();

  // Welding Torch Head & Glowing Amber Beacon
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x + 70, carY + 8, 5, 5);

  // Welding Spark Burst Effect
  const sparkAnim = Math.sin(Date.now() * 0.015);
  if (sparkAnim > 0.4) {
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(x + 74, carY + 10, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Workshop Roof Vent
  ctx.fillStyle = '#78350f';
  ctx.fillRect(x + 20, carY + 10, 20, 6);

  // Wheels
  drawTrainWheel(ctx, x + 18, carY + 44, 8, wheelRotation);
  drawTrainWheel(ctx, x + carW - 18, carY + 44, 8, wheelRotation);
}

// Restaurant & Dining Car (Striped bistro awning, warm lamps, dining tables, and animated boiling chef pot)
function drawRestaurantCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _car: unknown,
  wheelRotation: number,
  timeState: TimeState
) {
  const carW = 92;
  const carH = 54;
  const carY = y - carH;
  const now = Date.now();

  // Base & Body (Burgundy Luxury Carriage)
  ctx.fillStyle = '#831843'; // Rose burgundy
  ctx.fillRect(x + 4, carY + 12, carW - 8, 26);
  ctx.fillStyle = '#f59e0b'; // Gold trim
  ctx.fillRect(x + 4, carY + 36, carW - 8, 2);

  // Striped Bistro Awning Roof (Red & Cream)
  for (let ax = x + 2; ax < x + carW - 2; ax += 10) {
    ctx.fillStyle = (Math.floor((ax - x) / 10) % 2 === 0) ? '#be123c' : '#fef3c7';
    ctx.fillRect(ax, carY + 6, 10, 8);
  }

  // Left Window: Dining Guests with Table Lamps
  const windowColor = timeState.isNight ? '#fef08a' : '#fef9c3';
  ctx.fillStyle = windowColor;
  ctx.fillRect(x + 10, carY + 16, 32, 14);

  // Table Silhouette
  ctx.fillStyle = '#451a03';
  ctx.fillRect(x + 14, carY + 26, 24, 4);

  // Dining Guest 1
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(x + 18, carY + 22, 3, 0, Math.PI * 2);
  ctx.fill();

  // Wine Glass
  ctx.fillStyle = '#be123c';
  ctx.fillRect(x + 25, carY + 22, 2, 4);

  // Dining Guest 2
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x + 32, carY + 22, 3, 0, Math.PI * 2);
  ctx.fill();

  // Right Window: Kitchen Section with Animated Chef & Boiling Cooking Pot (Nồi Súp Sôi Sùng Sục)
  ctx.fillStyle = timeState.isNight ? '#fed7aa' : '#ffedd5';
  ctx.fillRect(x + 48, carY + 16, 34, 14);

  // Kitchen Stove Glow
  const stoveGlow = Math.sin(now * 0.02) * 1.5;
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x + 52, carY + 28, 12, 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(x + 54, carY + 27, 8, 1);

  // ANIMATED COPPER COOKING POT (Nồi nấu ăn bằng đồng sôi sùng sục)
  ctx.fillStyle = '#d97706'; // Copper pot body
  ctx.fillRect(x + 53, carY + 22, 10, 6);
  ctx.fillStyle = '#b45309'; // Rim
  ctx.fillRect(x + 52, carY + 21, 12, 2);

  // Bouncing Pot Lid (Nắp nồi nhảy nhót khi nước sôi)
  const lidHop = Math.sin(now * 0.035) * 1.2;
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(x + 52, carY + 19 - Math.max(0, lidHop), 12, 2);
  // Pot Lid Handle
  ctx.fillStyle = '#78350f';
  ctx.fillRect(x + 57, carY + 17 - Math.max(0, lidHop), 2, 2);

  // Boiling Steam Vapor Rising from Pot (Hơi nước bốc lên từ nồi)
  const potSteamAlpha = 0.4 + Math.sin(now * 0.015) * 0.25;
  ctx.fillStyle = `rgba(255, 255, 255, ${potSteamAlpha})`;
  ctx.beginPath();
  ctx.arc(x + 58 + Math.sin(now * 0.01) * 2, carY + 14, 2.5, 0, Math.PI * 2);
  ctx.arc(x + 60 - Math.sin(now * 0.012) * 2, carY + 10, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Chef Silhouette Stirring with Ladle
  const chefStir = Math.sin(now * 0.015) * 2;
  // Chef White Hat (Toque)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 70, carY + 16, 6, 6);
  ctx.beginPath();
  ctx.arc(x + 73, carY + 16, 4, Math.PI, 0);
  ctx.fill();
  // Chef Head
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(x + 73, carY + 22, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Chef Apron / Ladle
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 70, carY + 24, 6, 5);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 70, carY + 24);
  ctx.lineTo(x + 62 + chefStir, carY + 23);
  ctx.stroke();

  // Roof Chimney for kitchen oven aroma with tiny steam puff
  ctx.fillStyle = '#475569';
  ctx.fillRect(x + carW - 24, carY + 2, 6, 6);
  ctx.fillStyle = `rgba(245, 245, 255, ${potSteamAlpha * 0.6})`;
  ctx.beginPath();
  ctx.arc(x + carW - 21, carY - 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Wheels
  drawTrainWheel(ctx, x + 18, carY + 44, 8, wheelRotation);
  drawTrainWheel(ctx, x + carW - 18, carY + 44, 8, wheelRotation);
}

// Reusable Train Wheel with rotating spokes
function drawTrainWheel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number
) {
  // Outer Steel Rim
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Dark Inner Wheel Disc
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
  ctx.fill();

  // Rotating Spokes
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const angle = rotation + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * (radius - 2), y + Math.sin(angle) * (radius - 2));
    ctx.stroke();
  }

  // Golden Center Hub
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

// =========================================================================
// WEATHER SYSTEM RENDERING ENGINES
// =========================================================================

/**
 * 1. Sky Backdrop Weather Effects (Sunbeams, Cloud Banks, Meteor Showers)
 */
function drawWeatherSkyBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeState: TimeState,
  dt: number,
  anim: any
) {
  const weather = timeState.activeWeather;

  // 1.1 SUNNY: Warm Sun Shafts & Golden Light Motes
  if (weather === 'SUNNY' && (timeState.dayPhase === 'DAY' || timeState.dayPhase === 'DAWN')) {
    const sunX = timeState.sunPosition.x * w;
    const sunY = timeState.sunPosition.y * h;

    if (sunY < h * 0.75) {
      ctx.save();
      const beamGrad = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, w * 0.85);
      beamGrad.addColorStop(0, 'rgba(255, 235, 160, 0.28)');
      beamGrad.addColorStop(0.4, 'rgba(255, 215, 120, 0.12)');
      beamGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, 0, w, h * 0.75);

      // Angled Light Rays
      ctx.strokeStyle = 'rgba(255, 245, 200, 0.08)';
      ctx.lineWidth = 45;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(sunX + i * 260 + Math.sin(Date.now() * 0.001 + i) * 30, h * 0.8);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 1.2 CLOUDY: Multi-layered Fluffy Overcast Clouds
  if (weather === 'CLOUDY' || weather === 'RAINY' || weather === 'THUNDERSTORM') {
    const isStorm = weather === 'THUNDERSTORM';
    const isRain = weather === 'RAINY';

    ctx.save();
    anim.cloudyLayers.forEach((cloud: any) => {
      cloud.x = (cloud.x + cloud.speed * dt * 40) % (w + 400);
      const drawX = cloud.x - 200;
      const drawY = cloud.y;

      const cloudBaseColor = isStorm
        ? `rgba(45, 52, 70, ${cloud.opacity * 0.95})`
        : isRain
        ? `rgba(130, 145, 165, ${cloud.opacity * 0.85})`
        : `rgba(235, 242, 250, ${cloud.opacity * 0.75})`;

      const cloudShadeColor = isStorm
        ? `rgba(28, 32, 45, ${cloud.opacity * 0.95})`
        : isRain
        ? `rgba(95, 110, 130, ${cloud.opacity * 0.85})`
        : `rgba(195, 208, 225, ${cloud.opacity * 0.75})`;

      ctx.fillStyle = cloudBaseColor;
      const s = cloud.scale;

      // Organic Cloud Cluster
      ctx.beginPath();
      ctx.arc(drawX + 40 * s, drawY + 25 * s, 28 * s, 0, Math.PI * 2);
      ctx.arc(drawX + 75 * s, drawY + 15 * s, 36 * s, 0, Math.PI * 2);
      ctx.arc(drawX + 115 * s, drawY + 20 * s, 30 * s, 0, Math.PI * 2);
      ctx.arc(drawX + 145 * s, drawY + 30 * s, 24 * s, 0, Math.PI * 2);
      ctx.fill();

      // Cloud Bottom Shadow
      ctx.fillStyle = cloudShadeColor;
      ctx.beginPath();
      ctx.arc(drawX + 75 * s, drawY + 28 * s, 30 * s, 0, Math.PI);
      ctx.arc(drawX + 115 * s, drawY + 30 * s, 25 * s, 0, Math.PI);
      ctx.fill();
    });
    ctx.restore();
  }

  // 1.3 METEOR SHOWER (Mưa Sao Băng): Celestial Shooting Stars
  if (weather === 'METEOR_SHOWER') {
    anim.meteorNextTimer -= dt;
    if (anim.meteorNextTimer <= 0) {
      anim.meteorNextTimer = 0.6 + Math.random() * 1.4;
      // Spawn new shooting star
      const startX = Math.random() * w * 1.2;
      const startY = Math.random() * (h * 0.35);
      const angle = Math.PI * 0.22 + (Math.random() - 0.5) * 0.15; // ~40 degrees angle
      const speed = 700 + Math.random() * 500;

      const colors = ['#67e8f9', '#c084fc', '#fef08a', '#ffffff', '#93c5fd'];
      const chosenColor = colors[Math.floor(Math.random() * colors.length)];

      anim.meteors.push({
        x: startX,
        y: startY,
        length: 50 + Math.random() * 70,
        vx: -Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1.0,
        size: 2 + Math.random() * 2,
        color: chosenColor,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.4,
      });

      // Play soft celestial chime occasionally
      if (Math.random() < 0.35) {
        audioSynthesizer.playMeteorChime();
      }
    }

    // Render & Update Meteors
    for (let i = anim.meteors.length - 1; i >= 0; i--) {
      const m = anim.meteors[i];
      m.life += dt;
      if (m.life >= m.maxLife) {
        anim.meteors.splice(i, 1);
        continue;
      }

      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.alpha = Math.max(0, 1.0 - m.life / m.maxLife);

      ctx.save();
      const tailX = m.x - (m.vx / 800) * m.length;
      const tailY = m.y - (m.vy / 800) * m.length;

      const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      grad.addColorStop(0, `${m.color}`);
      grad.addColorStop(0.3, `rgba(255, 255, 255, ${m.alpha * 0.8})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = m.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // Brilliant Head Glow
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Stardust Sparkle trail
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(tailX + (Math.random() - 0.5) * 6, tailY + (Math.random() - 0.5) * 6, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

/**
 * 2. Weather Foreground Overlays (Rainfall, Splashes, Lightning, Snowfall, Rolling Fog)
 */
function drawWeatherForegroundOverlays(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  groundY: number,
  timeState: TimeState,
  dt: number,
  anim: any,
  trainState: TrainState
) {
  const weather = timeState.activeWeather;
  const speedRatio = trainState.speed_kmh / 120;

  // 2.1 RAINY & THUNDERSTORM: Dynamic Rain Streaks & Water Splashes
  if (weather === 'RAINY' || weather === 'THUNDERSTORM') {
    const isStorm = weather === 'THUNDERSTORM';
    const rainCount = isStorm ? 180 : 120;
    const windSlant = isStorm ? -140 : -60 - speedRatio * 50;

    ctx.save();
    ctx.strokeStyle = isStorm ? 'rgba(180, 205, 240, 0.65)' : 'rgba(200, 225, 255, 0.5)';
    ctx.lineWidth = isStorm ? 1.5 : 1.2;

    // Update & Render Rain Drops
    for (let i = 0; i < rainCount; i++) {
      const drop = anim.rainDrops[i % anim.rainDrops.length];
      drop.y += drop.speed * (isStorm ? 1.4 : 1.0) * dt;
      drop.x += windSlant * dt;

      // Hit Ground & Spawn Splash
      if (drop.y >= groundY - 5 + (i % 25)) {
        if (Math.random() < 0.4) {
          anim.splashes.push({
            x: drop.x,
            y: groundY - 2 + (Math.random() * 8),
            vx: (Math.random() - 0.5) * 35,
            vy: -15 - Math.random() * 20,
            alpha: 0.7,
            life: 0,
            maxLife: 0.15 + Math.random() * 0.1,
          });
        }
        drop.y = -20 - Math.random() * 40;
        drop.x = Math.random() * (w + 200);
      }

      if (drop.x < -50) drop.x = w + 50;

      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + (windSlant / drop.speed) * drop.length, drop.y + drop.length);
      ctx.stroke();
    }

    // Render Water Splashes / Ripples on ground and tracks
    for (let i = anim.splashes.length - 1; i >= 0; i--) {
      const sp = anim.splashes[i];
      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        anim.splashes.splice(i, 1);
        continue;
      }
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.alpha = Math.max(0, 0.7 * (1 - sp.life / sp.maxLife));

      ctx.fillStyle = `rgba(210, 230, 255, ${sp.alpha})`;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Tiny Ripple Ring
      ctx.strokeStyle = `rgba(200, 220, 255, ${sp.alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(sp.x, groundY + 2, (sp.life / sp.maxLife) * 6, (sp.life / sp.maxLife) * 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Wet Rail Sheen Reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, groundY + 3, w, 2);
  }

  // 2.2 THUNDERSTORM: Lightning Strikes & Electric Flashes
  if (weather === 'THUNDERSTORM') {
    anim.lightningNextTimer -= dt;

    if (anim.lightningNextTimer <= 0 && !anim.lightning.active) {
      anim.lightningNextTimer = 4.0 + Math.random() * 5.5;
      anim.lightning.active = true;
      anim.lightning.timer = 0.28;
      anim.lightning.flashAlpha = 0.85;

      // Generate Procedural Lightning Bolt Segments
      anim.lightning.segments = [];
      let startX = w * 0.2 + Math.random() * w * 0.6;
      let startY = 10;
      const targetY = groundY - 20;

      while (startY < targetY) {
        const nextY = startY + 25 + Math.random() * 35;
        const nextX = startX + (Math.random() - 0.5) * 55;
        anim.lightning.segments.push({ x1: startX, y1: startY, x2: nextX, y2: nextY });

        // Branching Fork
        if (Math.random() < 0.45) {
          anim.lightning.segments.push({
            x1: startX,
            y1: startY,
            x2: startX + (Math.random() - 0.5) * 75,
            y2: nextY + 15,
          });
        }
        startX = nextX;
        startY = nextY;
      }

      // Play Thunder Sound
      audioSynthesizer.playThunder();
    }

    if (anim.lightning.active) {
      anim.lightning.timer -= dt;
      if (anim.lightning.timer <= 0) {
        anim.lightning.active = false;
      } else {
        ctx.save();
        // Screen Lightning Flash
        ctx.fillStyle = `rgba(235, 245, 255, ${anim.lightning.flashAlpha * 0.45})`;
        ctx.fillRect(0, 0, w, h);

        // Draw Jagged Electric Bolts
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#93c5fd';
        ctx.shadowBlur = 16;

        ctx.beginPath();
        anim.lightning.segments.forEach((seg: any) => {
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        });
        ctx.stroke();

        // Inner Core Glow
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // 2.3 COLD: Crystalline Snowflakes & Frosted Drift
  if (weather === 'COLD') {
    ctx.save();
    ctx.fillStyle = '#ffffff';

    anim.snowFlakes.forEach((snow: any) => {
      snow.sway += dt * 2.5;
      snow.y += snow.speedY * dt;
      snow.x += (snow.speedX - speedRatio * 30 + Math.sin(snow.sway) * 20) * dt;

      if (snow.y > groundY + 15) {
        snow.y = -10;
        snow.x = Math.random() * (w + 200);
      }
      if (snow.x < -30) snow.x = w + 30;

      ctx.globalAlpha = snow.alpha;
      ctx.beginPath();
      ctx.arc(snow.x, snow.y, snow.size, 0, Math.PI * 2);
      ctx.fill();

      // Snowflake Cross Arms for larger flakes
      if (snow.size > 3.0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(snow.x - snow.size - 1, snow.y);
        ctx.lineTo(snow.x + snow.size + 1, snow.y);
        ctx.moveTo(snow.x, snow.y - snow.size - 1);
        ctx.lineTo(snow.x, snow.y + snow.size + 1);
        ctx.stroke();
      }
    });

    // Snow Dust behind speeding train wheels
    if (trainState.speed_kmh > 15) {
      const locX = w * 0.58;
      ctx.fillStyle = 'rgba(240, 248, 255, 0.5)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(
          locX - 20 - i * 35 - Math.random() * 20,
          groundY - 4 - Math.random() * 12,
          4 + Math.random() * 6,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 2.4 FOGGY: Volumetric Foreground Rolling Mist & Train Headlight Cone
  if (weather === 'FOGGY') {
    drawFogBands(ctx, w, groundY, dt, anim.fogBands, 'FRONT');
    drawHeadlightMistCone(ctx, w, groundY, trainState);
  }
}

/**
 * 3. Volumetric Fog Mist Bands
 */
function drawFogBands(
  ctx: CanvasRenderingContext2D,
  w: number,
  groundY: number,
  dt: number,
  fogBands: any[],
  layer: 'BACK' | 'FRONT'
) {
  ctx.save();
  fogBands.forEach((band, idx) => {
    if ((layer === 'BACK' && idx % 2 === 0) || (layer === 'FRONT' && idx % 2 !== 0)) {
      band.x = (band.x + band.speed * dt) % (w + band.width);
      const drawX = band.x - band.width;
      const drawY = groundY - 60 + idx * 25;

      const grad = ctx.createRadialGradient(
        drawX + band.width / 2,
        drawY + band.height / 2,
        20,
        drawX + band.width / 2,
        drawY + band.height / 2,
        band.width / 2
      );
      grad.addColorStop(0, `rgba(225, 235, 245, ${band.alpha * 0.85})`);
      grad.addColorStop(0.6, `rgba(215, 228, 240, ${band.alpha * 0.45})`);
      grad.addColorStop(1, 'rgba(215, 228, 240, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(drawX, drawY, band.width, band.height);
    }
  });
  ctx.restore();
}

/**
 * 4. Atmospheric Headlight Beam in Fog / Dark
 */
function drawHeadlightMistCone(
  ctx: CanvasRenderingContext2D,
  w: number,
  groundY: number,
  trainState: TrainState
) {
  const locX = w * 0.58;
  const lampX = locX + 138;
  const lampY = groundY - 34;

  ctx.save();
  const coneGrad = ctx.createRadialGradient(lampX, lampY, 5, lampX + 160, lampY, 260);
  coneGrad.addColorStop(0, 'rgba(255, 250, 200, 0.7)');
  coneGrad.addColorStop(0.3, 'rgba(255, 240, 160, 0.35)');
  coneGrad.addColorStop(0.7, 'rgba(240, 245, 255, 0.12)');
  coneGrad.addColorStop(1, 'rgba(240, 245, 255, 0)');

  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(lampX, lampY);
  ctx.lineTo(lampX + 320, lampY - 65);
  ctx.lineTo(lampX + 340, lampY + 70);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * 5. Full-Screen Ambient Weather Tint & Atmospheric Color Grading
 */
function drawWeatherColorGrading(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeState: TimeState
) {
  const weather = timeState.activeWeather;

  ctx.save();
  switch (weather) {
    case 'SUNNY':
      if (timeState.dayPhase === 'DAY') {
        ctx.fillStyle = 'rgba(255, 230, 160, 0.06)';
        ctx.fillRect(0, 0, w, h);
      }
      break;
    case 'CLOUDY':
      ctx.fillStyle = 'rgba(160, 180, 205, 0.09)';
      ctx.fillRect(0, 0, w, h);
      break;
    case 'RAINY':
      ctx.fillStyle = 'rgba(40, 70, 110, 0.14)';
      ctx.fillRect(0, 0, w, h);
      break;
    case 'THUNDERSTORM':
      ctx.fillStyle = 'rgba(20, 25, 55, 0.28)';
      ctx.fillRect(0, 0, w, h);
      break;
    case 'COLD':
      ctx.fillStyle = 'rgba(170, 220, 255, 0.13)';
      ctx.fillRect(0, 0, w, h);
      break;
    case 'FOGGY':
      ctx.fillStyle = 'rgba(220, 230, 240, 0.22)';
      ctx.fillRect(0, 0, w, h);
      break;
    case 'METEOR_SHOWER':
      ctx.fillStyle = 'rgba(88, 28, 135, 0.08)';
      ctx.fillRect(0, 0, w, h);
      break;
  }

  // Additional day-night ambient lighting overlay
  if (timeState.dayPhase === 'NIGHT') {
    ctx.fillStyle = 'rgba(10, 18, 42, 0.32)';
    ctx.fillRect(0, 0, w, h);
  } else if (timeState.dayPhase === 'SUNSET') {
    ctx.fillStyle = 'rgba(255, 120, 50, 0.12)';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

