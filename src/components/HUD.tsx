import React from 'react';
import { TrainState, PlayerProfile, TimeState, Station } from '../types';
import {
  Volume2,
  VolumeX,
  Clock,
  Fuel,
  Shield,
  Coins,
  Gauge,
  Package,
  Bell,
  Play,
  Pause,
  AlertTriangle,
  FolderOpen,
  Settings as SettingsIcon,
  Home,
} from 'lucide-react';
import { audioSynthesizer } from '../utils/audioSynthesizer';

interface HUDProps {
  playerProfile: PlayerProfile;
  trainState: TrainState;
  timeState: TimeState;
  currentStation: Station;
  nextStation: Station;
  totalCargoKg: number;
  maxCargoCapacityKg: number;
  totalPassengers: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenCargo: () => void;
  onOpenTimeModal: () => void;
  onOpenWeatherModal: () => void;
  onOpenSaveLoad: () => void;
  onOpenSettings: () => void;
  onOpenMenu: () => void;
  onToggleThrottle: () => void;
  onPullWhistle: () => void;
  onEmergencyCall: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  playerProfile,
  trainState,
  timeState,
  currentStation,
  nextStation,
  totalCargoKg,
  maxCargoCapacityKg,
  totalPassengers,
  isMuted,
  onToggleMute,
  onOpenCargo,
  onOpenTimeModal,
  onOpenWeatherModal,
  onOpenSaveLoad,
  onOpenSettings,
  onOpenMenu,
  onToggleThrottle,
  onPullWhistle,
  onEmergencyCall,
}) => {
  const fuelPercent = Math.max(0, Math.min(100, (trainState.current_fuel / trainState.max_fuel) * 100));
  const hpPercent = Math.max(0, Math.min(100, (trainState.current_hp / trainState.max_hp) * 100));
  const isLowFuel = fuelPercent < 20;
  const isLowHp = hpPercent < 25;

  const totalTripDistance = nextStation.distance_from_start_km - (currentStation ? currentStation.distance_from_start_km : 0);
  const remainingDistance = Math.max(0, trainState.distance_to_next_station_km);
  const tripProgress = totalTripDistance > 0 ? Math.max(0, Math.min(1, 1 - remainingDistance / totalTripDistance)) : 0;

  return (
    <header className="w-full bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md px-3 py-2 z-30 flex flex-col gap-2 select-none shadow-md">
      {/* Top Row: Resources & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4">
        {/* Left: Gold & Train Vital Gauges */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Gold Badge */}
          <div
            id="gold-display"
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-950/80 to-amber-900/60 border border-amber-500/40 px-3 py-1 rounded-lg text-amber-300 font-bold shadow-inner"
            title="Số tiền vàng hiện có"
          >
            <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-sm sm:text-base font-mono font-extrabold tracking-wide">
              {Math.floor(playerProfile.gold_balance).toLocaleString('vi-VN')}
            </span>
            <span className="text-xs text-amber-400 font-normal">G</span>
          </div>

          {/* Fuel Gauge */}
          <div
            id="fuel-gauge"
            className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
              isLowFuel
                ? 'bg-rose-950/80 border-rose-500/70 text-rose-300 animate-pulse'
                : 'bg-slate-800/70 border-slate-700/60 text-slate-200'
            }`}
            title={`Nhiên liệu: ${trainState.current_fuel.toFixed(1)} / ${trainState.max_fuel} đơn vị`}
          >
            <Fuel className={`w-3.5 h-3.5 ${isLowFuel ? 'text-rose-400' : 'text-amber-400'}`} />
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-[10px] leading-tight">
                <span>Nhiên liệu</span>
                <span>{trainState.current_fuel.toFixed(0)}/{trainState.max_fuel}</span>
              </div>
              <div className="w-16 sm:w-20 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isLowFuel ? 'bg-rose-500' : fuelPercent < 45 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${fuelPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Hull HP Gauge */}
          <div
            id="hp-gauge"
            className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
              isLowHp
                ? 'bg-rose-950/80 border-rose-500/70 text-rose-300 animate-pulse'
                : 'bg-slate-800/70 border-slate-700/60 text-slate-200'
            }`}
            title={`Độ bền thân tàu (HP): ${trainState.current_hp.toFixed(0)} / ${trainState.max_hp}`}
          >
            <Shield className={`w-3.5 h-3.5 ${isLowHp ? 'text-rose-400' : 'text-sky-400'}`} />
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-[10px] leading-tight">
                <span>Vỏ tàu (HP)</span>
                <span>{trainState.current_hp.toFixed(0)}/{trainState.max_hp}</span>
              </div>
              <div className="w-16 sm:w-20 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isLowHp ? 'bg-rose-500' : hpPercent < 50 ? 'bg-amber-500' : 'bg-sky-500'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Emergency Alert Button if Breakdown */}
          {(trainState.current_fuel <= 0.1 || trainState.current_hp <= 0) && (
            <button
              id="emergency-btn"
              onClick={onEmergencyCall}
              className="flex items-center gap-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg animate-bounce border border-rose-400 shadow-lg cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cứu Hộ Khẩn Cấp!</span>
            </button>
          )}
        </div>

        {/* Center/Right: Speed, Real-Time Clock, Audio & Cargo controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Cargo & Passenger Summary Button */}
          <button
            id="quick-cargo-btn"
            onClick={onOpenCargo}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
            title="Xem kho hàng & kiểm tra tiến độ sản xuất"
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            {maxCargoCapacityKg > 0 ? (
              <>
                <span className="hidden md:inline">Kho:</span>
                <span className="font-mono text-amber-300 font-bold">
                  {totalCargoKg.toFixed(0)}/{maxCargoCapacityKg}kg
                </span>
              </>
            ) : (
              <span className="text-slate-300">Toa Tàu</span>
            )}
            {totalPassengers > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-900/70 border border-blue-600/50 rounded-md text-[10px] text-blue-300 font-mono">
                👥 {totalPassengers}
              </span>
            )}
          </button>

          {/* Real-Time Sync Clock Badge (Clickable to open Time Settings) */}
          <button
            id="time-sync-btn"
            onClick={onOpenTimeModal}
            className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 border border-indigo-500/40 hover:border-indigo-400 text-slate-100 px-2.5 py-1.5 rounded-lg text-xs font-mono transition active:scale-95 cursor-pointer"
            title="Đồng bộ thời gian thực & Chu kỳ ngày đêm (Bấm để tùy chỉnh)"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-bold text-indigo-200">{timeState.displayTime}</span>
            <span className="hidden sm:inline text-[10px] px-1 py-0.5 rounded bg-indigo-950 border border-indigo-700/50 text-indigo-300 font-sans">
              {timeState.mode === 'REALTIME' ? '🔴 Giờ Thực' : timeState.mode === 'FAST_FORWARD' ? '⏩ Tua 24h' : '🎛️ Tùy Chỉnh'}
            </span>
          </button>

          {/* Weather Status & Customization Button */}
          <button
            id="hud-weather-btn"
            onClick={onOpenWeatherModal}
            className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 border border-amber-500/40 hover:border-amber-400 text-slate-100 px-2.5 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 cursor-pointer"
            title="Hệ thống thời tiết & Mở khóa (Mỗi 2 giờ chơi mở 1 kiểu thời tiết)"
          >
            <span className="text-sm">
              {timeState.activeWeather === 'SUNNY'
                ? '☀️'
                : timeState.activeWeather === 'CLOUDY'
                ? '⛅'
                : timeState.activeWeather === 'RAINY'
                ? '🌧️'
                : timeState.activeWeather === 'THUNDERSTORM'
                ? '⛈️'
                : timeState.activeWeather === 'COLD'
                ? '❄️'
                : timeState.activeWeather === 'FOGGY'
                ? '🌫️'
                : '🌠'}
            </span>
            <span className="hidden md:inline text-amber-200">
              {timeState.activeWeather === 'SUNNY'
                ? 'Nắng'
                : timeState.activeWeather === 'CLOUDY'
                ? 'Mây'
                : timeState.activeWeather === 'RAINY'
                ? 'Mưa'
                : timeState.activeWeather === 'THUNDERSTORM'
                ? 'Bão'
                : timeState.activeWeather === 'COLD'
                ? 'Lạnh'
                : timeState.activeWeather === 'FOGGY'
                ? 'Sương'
                : 'Sao Băng'}
            </span>
          </button>

          {/* Audio Whistle & Mute Buttons */}
          <button
            id="hud-whistle-btn"
            onClick={() => {
              audioSynthesizer.playWhistle();
              onPullWhistle();
            }}
            className="flex items-center gap-1 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-300 px-2 py-1.5 rounded-lg text-xs transition active:scale-95 cursor-pointer"
            title="Kéo còi tàu hơi nước"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline text-[11px] font-bold">Còi Tàu</span>
          </button>

          <button
            id="audio-mute-btn"
            onClick={onToggleMute}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 hover:text-slate-100 transition cursor-pointer"
            title={isMuted ? 'Bật âm thanh hiệu ứng' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Quick Save/Load Button */}
          <button
            id="hud-save-load-btn"
            onClick={onOpenSaveLoad}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer"
            title="Mở quản lý Lưu & Tải game (Save / Load)"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Save/Load</span>
          </button>

          {/* Settings Button */}
          <button
            id="hud-settings-btn"
            onClick={onOpenSettings}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 rounded-lg transition active:scale-95 cursor-pointer"
            title="Cài đặt âm thanh, thời gian & thời tiết"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* Title Screen / Main Menu Button */}
          <button
            id="hud-main-menu-btn"
            onClick={onOpenMenu}
            className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
            title="Quay lại Màn hình Mở Đầu (Title Screen)"
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Menu</span>
          </button>

          {/* Throttle Play / Pause button */}
          {!trainState.is_at_station && (
            <button
              id="throttle-btn"
              onClick={onToggleThrottle}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                trainState.throttle > 0
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              title={trainState.throttle > 0 ? 'Hãm phanh / Tạm dừng tàu' : 'Tăng tốc khởi hành'}
            >
              {trainState.throttle > 0 ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Phanh Tàu</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Chạy Tàu</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Bottom Sub-Row: Trip Route Progress Bar */}
      <div className="flex items-center gap-3 pt-1 border-t border-slate-800/60 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 min-w-max">
          <span className="text-slate-300 font-semibold">{currentStation?.station_name.split('(')[0] || 'Trạm Khởi Hành'}</span>
        </div>

        {/* Dynamic Route Progress Bar */}
        <div className="flex-1 relative flex items-center">
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-sky-400 rounded-full transition-all duration-300"
              style={{ width: `${tripProgress * 100}%` }}
            />
          </div>
          {/* Animated Train Marker */}
          <div
            className="absolute -top-1.5 transform -translate-x-1/2 text-sm select-none transition-all duration-300"
            style={{ left: `${Math.max(2, Math.min(98, tripProgress * 100))}%` }}
            title={`Khoảng cách còn lại: ${remainingDistance.toFixed(1)} km`}
          >
            🚂
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-300 min-w-max font-medium">
          <span>🚉 {nextStation.station_name}</span>
          <span className="text-amber-400 font-mono text-[11px] font-bold">({remainingDistance.toFixed(1)} km)</span>
        </div>
      </div>
    </header>
  );
};
