import { TimeSyncMode, DayPhase, TimeState, WeatherType, WeatherSelectionMode } from '../types';

export function calculateTimeState(
  mode: TimeSyncMode,
  fastForwardSeconds: number = 0,
  manualHour: number = 12,
  activeWeather: WeatherType = 'SUNNY',
  unlockedWeathers: WeatherType[] = ['SUNNY'],
  weatherMode: WeatherSelectionMode = 'AUTO',
  totalPlayTimeSeconds: number = 0
): TimeState {
  let totalSeconds = 0;

  if (mode === 'REALTIME') {
    const now = new Date();
    totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  } else if (mode === 'FAST_FORWARD') {
    // 1 real second = 2 game minutes (so a full 24-hr day takes 12 minutes, or fast cycle)
    totalSeconds = (fastForwardSeconds * 120) % 86400;
  } else {
    // MANUAL
    totalSeconds = (manualHour * 3600) % 86400;
  }

  const hour = Math.floor(totalSeconds / 3600) % 24;
  const minute = Math.floor((totalSeconds % 3600) / 60);
  const second = Math.floor(totalSeconds % 60);

  const displayTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

  const timeFloat = hour + minute / 60 + second / 3600;

  // Day Phase detection
  let dayPhase: DayPhase = 'DAY';
  let phaseProgress = 0;

  if (timeFloat >= 5.0 && timeFloat < 7.0) {
    dayPhase = 'DAWN';
    phaseProgress = (timeFloat - 5.0) / 2.0;
  } else if (timeFloat >= 7.0 && timeFloat < 16.75) {
    dayPhase = 'DAY';
    phaseProgress = (timeFloat - 7.0) / 9.75;
  } else if (timeFloat >= 16.75 && timeFloat < 19.25) {
    dayPhase = 'SUNSET';
    phaseProgress = (timeFloat - 16.75) / 2.5;
  } else {
    dayPhase = 'NIGHT';
    if (timeFloat >= 19.25) {
      phaseProgress = (timeFloat - 19.25) / 9.75;
    } else {
      phaseProgress = (timeFloat + 4.75) / 9.75;
    }
  }

  const isNight = dayPhase === 'NIGHT';

  // Resolved active weather
  let resolvedWeather: WeatherType = activeWeather;
  if (weatherMode === 'AUTO') {
    if (unlockedWeathers && unlockedWeathers.length > 0) {
      // If Meteor Shower is unlocked and it is night (after 21:00 or before 4:00), give chance of Meteor Shower
      if (unlockedWeathers.includes('METEOR_SHOWER') && (hour >= 21 || hour < 4)) {
        resolvedWeather = 'METEOR_SHOWER';
      } else {
        // Natural cycling based on 15-minute game intervals
        const weatherCycleIndex = Math.floor(totalSeconds / 900) % unlockedWeathers.length;
        resolvedWeather = unlockedWeathers[weatherCycleIndex] || 'SUNNY';
      }
    } else {
      resolvedWeather = 'SUNNY';
    }
  }

  // Sun and Moon trajectory (arc across sky from left to right)
  // Sun rises at 5:00 (x=0, y=0.8), peaks at 12:00 (x=0.5, y=0.15), sets at 19:00 (x=1.0, y=0.8)
  let sunX = -0.2;
  let sunY = 1.2;
  if (timeFloat >= 5.0 && timeFloat <= 19.0) {
    const sunProgress = (timeFloat - 5.0) / 14.0; // 0 to 1
    sunX = 0.05 + sunProgress * 0.9;
    sunY = 0.85 - Math.sin(sunProgress * Math.PI) * 0.68;
  }

  // Moon rises at 19:00, peaks at 01:00, sets at 07:00
  let moonX = -0.2;
  let moonY = 1.2;
  let moonTime = timeFloat;
  if (moonTime < 7.0) moonTime += 24.0;
  if (moonTime >= 19.0 && moonTime <= 31.0) {
    const moonProgress = (moonTime - 19.0) / 12.0;
    moonX = 0.05 + moonProgress * 0.9;
    moonY = 0.85 - Math.sin(moonProgress * Math.PI) * 0.65;
  }

  // Ambient lighting brightness and colors
  let ambientBrightness = 1.0;
  let ambientColor = 'rgba(255, 255, 255, 1)';

  switch (dayPhase) {
    case 'DAWN':
      ambientBrightness = 0.65 + phaseProgress * 0.35;
      ambientColor = 'rgba(255, 220, 200, 0.9)';
      break;
    case 'DAY':
      ambientBrightness = 1.0;
      ambientColor = 'rgba(255, 255, 255, 1)';
      break;
    case 'SUNSET':
      ambientBrightness = 0.95 - phaseProgress * 0.45;
      ambientColor = 'rgba(255, 180, 140, 0.85)';
      break;
    case 'NIGHT':
      ambientBrightness = 0.4;
      ambientColor = 'rgba(120, 140, 200, 0.5)';
      break;
  }
  
  return {
    mode,
    hour,
    minute,
    second,
    displayTime,
    dayPhase,
    phaseProgress,
    sunPosition: { x: sunX, y: sunY },
    moonPosition: { x: moonX, y: moonY },
    ambientColor,
    ambientBrightness,
    isNight,
    activeWeather: resolvedWeather,
    unlockedWeathers: unlockedWeathers && unlockedWeathers.length > 0 ? unlockedWeathers : ['SUNNY'],
    weatherMode,
    totalPlayTimeSeconds,
  };
}

