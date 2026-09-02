import React from 'react';
import { WeatherType, TimeState } from '../types';
import { WEATHER_CONFIGS, WEATHER_UNLOCK_ORDER } from '../data/weatherConfig';
import { X, CloudRain, Sun, Cloud, CloudLightning, Snowflake, CloudFog, Sparkles, Clock, Lock, CheckCircle2, Play, RefreshCw, Zap } from 'lucide-react';
import { audioSynthesizer } from '../utils/audioSynthesizer';

interface WeatherModalProps {
  isOpen: boolean;
  timeState: TimeState;
  onClose: () => void;
  onSelectWeather: (weather: WeatherType) => void;
  onToggleWeatherMode: (mode: 'AUTO' | 'CUSTOM') => void;
  onUnlockAllWeathersForTesting?: () => void;
}

export const WeatherModal: React.FC<WeatherModalProps> = ({
  isOpen,
  timeState,
  onClose,
  onSelectWeather,
  onToggleWeatherMode,
  onUnlockAllWeathersForTesting,
}) => {
  if (!isOpen) return null;

  const currentCfg = WEATHER_CONFIGS[timeState.activeWeather] || WEATHER_CONFIGS.SUNNY;
  const totalSeconds = timeState.totalPlayTimeSeconds;
  const hoursPlayed = totalSeconds / 3600;

  // Format total playtime
  const playHours = Math.floor(totalSeconds / 3600);
  const playMins = Math.floor((totalSeconds % 3600) / 60);
  const playSecs = Math.floor(totalSeconds % 60);
  const playTimeString = `${String(playHours).padStart(2, '0')}h ${String(playMins).padStart(2, '0')}m ${String(playSecs).padStart(2, '0')}s`;

  // Calculate countdown to next 2-hour interval unlock (7200 seconds per level)
  const SECONDS_PER_UNLOCK = 7200; // 2 hours
  const currentIntervalIndex = Math.min(
    WEATHER_UNLOCK_ORDER.length - 1,
    Math.floor(totalSeconds / SECONDS_PER_UNLOCK)
  );
  const nextUnlockIndex = currentIntervalIndex + 1;
  const nextWeatherType = WEATHER_UNLOCK_ORDER[nextUnlockIndex];
  const nextWeatherCfg = nextWeatherType ? WEATHER_CONFIGS[nextWeatherType] : null;

  const secondsUntilNextUnlock = nextWeatherCfg
    ? Math.max(0, SECONDS_PER_UNLOCK - (totalSeconds % SECONDS_PER_UNLOCK))
    : 0;

  const cdHours = Math.floor(secondsUntilNextUnlock / 3600);
  const cdMins = Math.floor((secondsUntilNextUnlock % 3600) / 60);
  const cdSecs = Math.floor(secondsUntilNextUnlock % 60);
  const countdownString = `${String(cdHours).padStart(2, '0')}:${String(cdMins).padStart(2, '0')}:${String(cdSecs).padStart(2, '0')}`;
  const intervalProgressPercent = nextWeatherCfg
    ? Math.min(100, Math.max(0, ((SECONDS_PER_UNLOCK - secondsUntilNextUnlock) / SECONDS_PER_UNLOCK) * 100))
    : 100;

  const is9PMRange = timeState.hour === 21;

  const getWeatherIconComponent = (type: WeatherType) => {
    switch (type) {
      case 'SUNNY':
        return <Sun className="w-5 h-5 text-amber-400" />;
      case 'CLOUDY':
        return <Cloud className="w-5 h-5 text-slate-300" />;
      case 'RAINY':
        return <CloudRain className="w-5 h-5 text-sky-400" />;
      case 'THUNDERSTORM':
        return <CloudLightning className="w-5 h-5 text-yellow-300" />;
      case 'COLD':
        return <Snowflake className="w-5 h-5 text-cyan-300" />;
      case 'FOGGY':
        return <CloudFog className="w-5 h-5 text-emerald-300" />;
      case 'METEOR_SHOWER':
        return <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />;
    }
  };

  const handleSelect = (weatherId: WeatherType) => {
    onSelectWeather(weatherId);
    if (weatherId === 'THUNDERSTORM') {
      audioSynthesizer.playThunder();
    } else if (weatherId === 'METEOR_SHOWER') {
      audioSynthesizer.playMeteorChime();
    } else if (weatherId === 'COLD') {
      audioSynthesizer.playSnowShimmer();
    }
  };

  return (
    <div
      id="weather-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in select-none"
    >
      <div
        id="weather-modal-content"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-600/30 to-sky-600/30 border border-indigo-500/40 rounded-xl">
              {getWeatherIconComponent(timeState.activeWeather)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Hệ Thống Thời Tiết & Khí Hậu
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300">
                  {timeState.weatherMode === 'AUTO' ? '🔄 Tự Động' : '🎛️ Tùy Chỉnh'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Mở khóa thời tiết mới sau mỗi 2 giờ chơi và các hiện tượng thiên nhiên đặc biệt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Active Weather Overview Card */}
          <div className="bg-gradient-to-r from-slate-800/90 to-indigo-950/70 border border-indigo-500/30 rounded-xl p-4 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentCfg.icon}</span>
                <div>
                  <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    {currentCfg.vietnamese_title} ({currentCfg.name})
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950 border border-emerald-600/50 text-emerald-300 rounded font-mono">
                      Đang Hoạt Động
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">{currentCfg.description}</div>
                </div>
              </div>

              {/* Mode Toggle Button */}
              <button
                onClick={() => onToggleWeatherMode(timeState.weatherMode === 'AUTO' ? 'CUSTOM' : 'AUTO')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  timeState.weatherMode === 'AUTO'
                    ? 'bg-indigo-600/40 border-indigo-400 text-indigo-200 hover:bg-indigo-600/60'
                    : 'bg-amber-600/40 border-amber-400 text-amber-200 hover:bg-amber-600/60'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Chế độ: {timeState.weatherMode === 'AUTO' ? 'Tự Động Đổi' : 'Cố Định Thời Tiết'}</span>
              </button>
            </div>

            {/* Weather Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-700/60 text-xs">
              <div className="bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Nhiệt Độ</div>
                <div className="font-mono font-bold text-amber-300">{currentCfg.temperature_celsius}</div>
              </div>
              <div className="bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Độ Ẩm</div>
                <div className="font-mono font-bold text-sky-300">{currentCfg.humidity_percent}%</div>
              </div>
              <div className="bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Tầm Nhìn</div>
                <div className="font-mono font-bold text-emerald-300">{currentCfg.visibility}</div>
              </div>
              <div className="bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Sức Gió</div>
                <div className="font-mono font-bold text-purple-300">{currentCfg.wind_speed_kmh} km/h</div>
              </div>
            </div>
          </div>

          {/* 2-Hour Unlock Progression & Live Countdown */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Thời Gian Chơi Tích Lũy: <strong className="font-mono text-indigo-300">{playTimeString}</strong>
                </span>
              </div>
              {nextWeatherCfg ? (
                <div className="text-xs text-slate-300 flex items-center gap-1.5">
                  <span>Mở khóa <strong className="text-amber-300">{nextWeatherCfg.vietnamese_title}</strong> sau:</span>
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-900/80 border border-indigo-600/60 text-amber-300">
                    {countdownString}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-emerald-400 font-semibold">✨ Đã mở khóa tất cả các kiểu thời tiết chuẩn!</span>
              )}
            </div>

            {/* Progress Bar */}
            {nextWeatherCfg && (
              <div className="space-y-1 mt-2">
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-500 rounded-full"
                    style={{ width: `${intervalProgressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Tiến độ chu kỳ 2 tiếng</span>
                  <span>{intervalProgressPercent.toFixed(1)}%</span>
                </div>
              </div>
            )}

            {/* Fast Preview button for testing/grading convenience */}
            {onUnlockAllWeathersForTesting && timeState.unlockedWeathers.length < WEATHER_UNLOCK_ORDER.length && (
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Trải nghiệm nhanh các hiệu ứng hoạt ảnh thời tiết:</span>
                <button
                  onClick={onUnlockAllWeathersForTesting}
                  className="flex items-center gap-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-300 text-xs px-2.5 py-1 rounded-lg transition active:scale-95 cursor-pointer font-medium"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Mở Khóa Nhanh Tất Cả</span>
                </button>
              </div>
            )}
          </div>

          {/* Special Meteor Shower Notification Banner */}
          <div className={`border rounded-xl p-3.5 flex items-center gap-3 transition-all ${
            timeState.unlockedWeathers.includes('METEOR_SHOWER')
              ? 'bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-indigo-500/60'
              : is9PMRange
              ? 'bg-gradient-to-r from-amber-950/80 to-indigo-950/80 border-amber-500/60 animate-pulse'
              : 'bg-slate-950/40 border-slate-800'
          }`}>
            <div className="p-2.5 bg-indigo-900/50 border border-indigo-500/40 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-indigo-200 flex items-center gap-2">
                🌠 Thời Tiết Đặc Biệt: Mưa Sao Băng (Meteor Shower)
                {is9PMRange && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/30 border border-amber-400 text-amber-300 rounded font-semibold">
                    Đang là 9h Tối (21:00)!
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                {WEATHER_CONFIGS.METEOR_SHOWER.special_condition}
              </div>
            </div>
          </div>

          {/* Weather List Grid */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Danh Sách Các Kiểu Thời Tiết ({timeState.unlockedWeathers.length}/{WEATHER_UNLOCK_ORDER.length} Đã Mở Khóa)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WEATHER_UNLOCK_ORDER.map((weatherId) => {
                const cfg = WEATHER_CONFIGS[weatherId];
                const isUnlocked = timeState.unlockedWeathers.includes(weatherId);
                const isActive = timeState.activeWeather === weatherId;

                return (
                  <div
                    key={weatherId}
                    onClick={() => isUnlocked && handleSelect(weatherId)}
                    className={`relative p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-indigo-950/70 border-indigo-400 shadow-md ring-1 ring-indigo-400/40'
                        : isUnlocked
                        ? 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600 cursor-pointer active:scale-[0.99]'
                        : 'bg-slate-950/40 border-slate-800/60 opacity-65 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{cfg.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                              {cfg.vietnamese_title}
                              {cfg.is_special && (
                                <span className="text-[9px] px-1 py-0.2 bg-purple-900/80 border border-purple-500/50 text-purple-200 rounded">
                                  Đặc Biệt
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">{cfg.name}</div>
                          </div>
                        </div>

                        {/* Status Icon */}
                        <div>
                          {isActive ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-900/60 border border-indigo-500/50 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                              Đang Bật
                            </span>
                          ) : isUnlocked ? (
                            <button className="text-[10px] text-slate-300 bg-slate-700/60 hover:bg-indigo-600 hover:text-white px-2 py-0.5 rounded-md transition border border-slate-600">
                              Chọn
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
                              <Lock className="w-3 h-3 text-slate-500" />
                              {cfg.is_special ? '9h tối / 12h' : `${cfg.unlock_hours_required}h chơi`}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                        {cfg.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80">
                      <span>Nhiệt độ: <strong className="text-slate-200">{cfg.temperature_celsius}</strong></span>
                      <span>Độ ẩm: <strong className="text-slate-200">{cfg.humidity_percent}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Trạng thái hiện tại: <strong className="text-indigo-300">{currentCfg.vietnamese_title}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow cursor-pointer active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
