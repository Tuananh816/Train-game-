import React, { useState } from 'react';
import { TimeSyncMode, WeatherType, WeatherSelectionMode, TimeState } from '../types';
import { audioSynthesizer } from '../utils/audioSynthesizer';
import { WEATHER_CONFIGS } from '../data/weatherConfig';
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  Clock,
  CloudSun,
  Bell,
  Sparkles,
  Check,
  RotateCcw,
  Sliders,
  Wind,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  timeState: TimeState;
  isMuted: boolean;
  onToggleMute: () => void;
  onSetTimeMode: (mode: TimeSyncMode) => void;
  onSetManualHour: (hour: number) => void;
  onSelectWeather: (weather: WeatherType) => void;
  onSetWeatherMode: (mode: WeatherSelectionMode) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  timeState,
  isMuted,
  onToggleMute,
  onSetTimeMode,
  onSetManualHour,
  onSelectWeather,
  onSetWeatherMode,
  onClose,
}) => {
  const [currentVolume, setCurrentVolume] = useState<number>(80);
  const [activeTab, setActiveTab] = useState<'AUDIO' | 'TIME' | 'WEATHER'>('AUDIO');

  if (!isOpen) return null;

  const handleVolumeChange = (newVal: number) => {
    setCurrentVolume(newVal);
    audioSynthesizer.setVolume(newVal / 100);
  };

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="settings-modal-card"
        className="w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-slate-950/80 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-amber-300 tracking-wide flex items-center gap-2">
                CÀI ĐẶT TRÒ CHƠI
              </h2>
              <p className="text-xs text-slate-400">
                Tùy biến âm thanh, chu kỳ thời gian và hiệu ứng thời tiết đoàn tàu.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('AUDIO')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl font-bold text-xs sm:text-sm transition cursor-pointer border-t border-x ${
              activeTab === 'AUDIO'
                ? 'bg-slate-900 border-amber-500/50 text-amber-300 shadow-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Âm Thanh</span>
          </button>

          <button
            onClick={() => setActiveTab('TIME')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl font-bold text-xs sm:text-sm transition cursor-pointer border-t border-x ${
              activeTab === 'TIME'
                ? 'bg-slate-900 border-amber-500/50 text-amber-300 shadow-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Thời Gian & Chu Kỳ</span>
          </button>

          <button
            onClick={() => setActiveTab('WEATHER')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl font-bold text-xs sm:text-sm transition cursor-pointer border-t border-x ${
              activeTab === 'WEATHER'
                ? 'bg-slate-900 border-amber-500/50 text-amber-300 shadow-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CloudSun className="w-4 h-4" />
            <span>Thời Tiết</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. AUDIO TAB */}
          {activeTab === 'AUDIO' && (
            <div className="space-y-4">
              {/* Mute toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isMuted ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'}`}>
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-200">Âm thanh hiệu ứng đoàn tàu</span>
                    <p className="text-xs text-slate-400">Tiếng còi tàu, tiếng xả hơi nước và tiếng bánh xe lăn</p>
                  </div>
                </div>
                <button
                  onClick={onToggleMute}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                    isMuted
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md'
                  }`}
                >
                  {isMuted ? 'Đang Tắt (Muted)' : 'Đang Bật'}
                </button>
              </div>

              {/* Volume Slider */}
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-200">Âm lượng tổng (Master Volume)</span>
                  <span className="font-mono text-xs font-bold text-amber-400">{currentVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentVolume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Sound Test Buttons */}
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Kiểm tra âm thanh trực tiếp</span>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => audioSynthesizer.playWhistle()}
                    className="flex items-center gap-1.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-300 px-3 py-2 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Thử Còi Hơi Nước</span>
                  </button>

                  <button
                    onClick={() => audioSynthesizer.playSteamHiss()}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
                  >
                    <Wind className="w-3.5 h-3.5" />
                    <span>Thử Tiếng Xả Hơi</span>
                  </button>

                  <button
                    onClick={() => audioSynthesizer.playStationBell()}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
                  >
                    <span>🔔 Chuông Nhà Ga</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. TIME TAB */}
          {activeTab === 'TIME' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Realtime Mode */}
                <div
                  onClick={() => onSetTimeMode('REALTIME')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    timeState.mode === 'REALTIME'
                      ? 'bg-indigo-950/60 border-indigo-500 shadow-md text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-indigo-300">🔴 Thời Gian Thực</span>
                      {timeState.mode === 'REALTIME' && <Check className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Đồng bộ 1:1 theo giờ trên máy tính của bạn (Sáng, trưa, chiều, tối).
                    </p>
                  </div>
                </div>

                {/* Fast Forward Mode */}
                <div
                  onClick={() => onSetTimeMode('FAST_FORWARD')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    timeState.mode === 'FAST_FORWARD'
                      ? 'bg-amber-950/60 border-amber-500 shadow-md text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-amber-300">⏩ Tua Nhanh 24H</span>
                      {timeState.mode === 'FAST_FORWARD' && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      1 ngày trôi qua nhanh trong 12 phút để chiêm ngưỡng toàn bộ chu kỳ ngày đêm.
                    </p>
                  </div>
                </div>

                {/* Manual Mode */}
                <div
                  onClick={() => onSetTimeMode('MANUAL')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    timeState.mode === 'MANUAL'
                      ? 'bg-emerald-950/60 border-emerald-500 shadow-md text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-emerald-300">🎛️ Tùy Chỉnh Giờ</span>
                      {timeState.mode === 'MANUAL' && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Tự do chỉnh giờ yêu thích (ngắm bình minh 6h hay bầu trời sao 22h).
                    </p>
                  </div>
                </div>
              </div>

              {/* Hour slider if manual */}
              {timeState.mode === 'MANUAL' && (
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">Chọn mốc thời gian</span>
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {timeState.hour.toString().padStart(2, '0')}:00 ({timeState.dayPhase})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="23"
                    value={timeState.hour}
                    onChange={(e) => onSetManualHour(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0:00 (Đêm)</span>
                    <span>6:00 (Rạng đông)</span>
                    <span>12:00 (Trưa)</span>
                    <span>18:00 (Hoàng hôn)</span>
                    <span>23:00 (Đêm muộn)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. WEATHER TAB */}
          {activeTab === 'WEATHER' && (
            <div className="space-y-4">
              {/* Weather Mode selector */}
              <div className="flex items-center justify-between p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                <div>
                  <span className="text-sm font-bold text-slate-200">Cơ chế thời tiết</span>
                  <p className="text-xs text-slate-400">
                    {timeState.weatherMode === 'AUTO'
                      ? 'Tự động luân chuyển thời tiết theo chu kỳ và mốc thời gian'
                      : 'Đang áp dụng thời tiết cố định theo lựa chọn'}
                  </p>
                </div>
                <button
                  onClick={() => onSetWeatherMode(timeState.weatherMode === 'AUTO' ? 'CUSTOM' : 'AUTO')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    timeState.weatherMode === 'AUTO'
                      ? 'bg-amber-600 text-slate-950 font-extrabold hover:bg-amber-500'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {timeState.weatherMode === 'AUTO' ? '🔄 Tự Động (Auto)' : '✋ Cố Định'}
                </button>
              </div>

              {/* Weather Icons Grid */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Chọn thời tiết nhanh
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(Object.keys(WEATHER_CONFIGS) as WeatherType[]).map((wKey) => {
                    const cfg = WEATHER_CONFIGS[wKey];
                    const isSelected = timeState.activeWeather === wKey;
                    return (
                      <button
                        key={wKey}
                        onClick={() => {
                          onSelectWeather(wKey);
                          onSetWeatherMode('CUSTOM');
                        }}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer text-center ${
                          isSelected
                            ? 'bg-amber-950/60 border-amber-500 text-amber-200 shadow-md'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-2xl">{cfg.icon}</span>
                        <span className="text-xs font-bold">{cfg.name}</span>
                        <span className="text-[10px] text-slate-500">{cfg.temperature_celsius}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950/90 border-t border-slate-800 p-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold px-5 py-2 rounded-xl text-sm transition active:scale-95 cursor-pointer shadow-lg"
          >
            Đóng & Tiếp Tục
          </button>
        </div>
      </div>
    </div>
  );
};
