import React, { useState } from 'react';
import { PlayerProfile, TrainState, TimeState, Station } from '../types';
import { audioSynthesizer } from '../utils/audioSynthesizer';
import {
  Play,
  FolderOpen,
  Settings as SettingsIcon,
  Bell,
  Coins,
  MapPin,
  Volume2,
  VolumeX,
  Sparkles,
  RotateCcw,
  Compass,
} from 'lucide-react';

interface StartScreenProps {
  playerProfile: PlayerProfile;
  trainState: TrainState;
  timeState: TimeState;
  currentStation: Station;
  isMuted: boolean;
  onToggleMute: () => void;
  onPlayGame: () => void;
  onOpenSaveLoad: () => void;
  onOpenSettings: () => void;
  onNewGame: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  playerProfile,
  trainState,
  timeState,
  currentStation,
  isMuted,
  onToggleMute,
  onPlayGame,
  onOpenSaveLoad,
  onOpenSettings,
  onNewGame,
}) => {
  const [showNewGameConfirm, setShowNewGameConfirm] = useState<boolean>(false);

  const hasProgress =
    (playerProfile.current_distance_km || 0) > 0.05 ||
    (playerProfile.trips_completed || 0) > 0 ||
    playerProfile.gold_balance !== 500;

  const handleStartPlay = () => {
    audioSynthesizer.playWhistle();
    audioSynthesizer.playChuff(1.0);
    onPlayGame();
  };

  const handleWhistleClick = () => {
    audioSynthesizer.playWhistle();
  };

  return (
    <div
      id="start-screen-overlay"
      className="absolute inset-0 z-30 flex flex-col justify-between p-4 sm:p-8 select-none pointer-events-auto bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950/85 backdrop-blur-[2px]"
    >
      {/* Top Bar: Audio & Quick Status */}
      <header className="w-full flex items-center justify-between z-20">
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-md text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono text-slate-300">
            {timeState.displayTime} • {timeState.dayPhase}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-400 font-semibold">{currentStation.station_name}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Whistle Button for quick interaction */}
          <button
            onClick={handleWhistleClick}
            className="flex items-center gap-1.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-lg backdrop-blur-md"
            title="Kéo còi tàu hơi nước"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span className="hidden sm:inline">Kéo Còi Tàu</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 hover:text-white transition cursor-pointer shadow-md backdrop-blur-md"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Center: Hero Title & Brand Identity */}
      <div className="flex flex-col items-center justify-center text-center my-auto z-20 max-w-2xl mx-auto space-y-4">
        {/* Vintage Train Icon Badge */}
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-amber-600/40 via-amber-500/20 to-amber-400/30 border-2 border-amber-400/60 shadow-[0_0_50px_rgba(245,158,11,0.3)] flex items-center justify-center backdrop-blur-md transform hover:scale-105 transition-transform duration-300">
            <span className="text-4xl sm:text-5xl select-none filter drop-shadow-lg">🚂</span>
          </div>
          <div className="absolute -top-1 -right-1 p-1.5 rounded-full bg-amber-500 text-amber-950 shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Game Title */}
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] font-serif uppercase">
            TRAIN WORLD
          </h1>
          <p className="text-base sm:text-lg font-bold text-amber-200/90 tracking-widest uppercase drop-shadow">
            Hành Trình Đường Sắt 
          </p>
        </div>

        {/* Active Journey Snapshot Badge (If progress exists) */}
        {hasProgress && (
          <div className="bg-slate-900/85 border border-amber-500/40 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <MapPin className="w-3.5 h-3.5" />
              <span>{currentStation.station_name}</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1 text-amber-300 font-mono font-bold">
              <Coins className="w-3.5 h-3.5" />
              <span>{Math.floor(playerProfile.gold_balance).toLocaleString('vi-VN')} G</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="text-slate-300 font-mono">
              <span>{playerProfile.current_distance_km.toFixed(1)} km</span>
            </div>
          </div>
        )}

        {/* Main Action Buttons Grid: Play, Save/Load, Settings */}
        <div className="w-full max-w-md pt-3 space-y-3">
          {/* Primary Action: PLAY / CONTINUE */}
          <button
            id="start-menu-play-btn"
            onClick={handleStartPlay}
            className="w-full group relative overflow-hidden bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base sm:text-lg py-3.5 px-6 rounded-2xl shadow-[0_8px_25px_rgba(245,158,11,0.4)] transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-3 border-2 border-amber-300/80"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <span className="tracking-wide uppercase">
              {hasProgress ? 'Tiếp Tục Hành Trình (Play)' : 'Bắt Đầu Chuyến Đi (Play)'}
            </span>
          </button>

          {/* Secondary Actions: Save/Load and Settings */}
          <div className="grid grid-cols-2 gap-3">
            {/* SAVE / LOAD BUTTON */}
            <button
              id="start-menu-save-load-btn"
              onClick={() => {
                audioSynthesizer.playChuff(0.5);
                onOpenSaveLoad();
              }}
              className="flex items-center justify-center gap-2 bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-700/80 hover:border-amber-500/60 text-slate-200 hover:text-amber-300 font-bold py-3 px-4 rounded-xl shadow-lg transition active:scale-95 cursor-pointer text-xs sm:text-sm backdrop-blur-md"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>Save / Load</span>
            </button>

            {/* SETTINGS BUTTON */}
            <button
              id="start-menu-settings-btn"
              onClick={() => {
                audioSynthesizer.playChuff(0.5);
                onOpenSettings();
              }}
              className="flex items-center justify-center gap-2 bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-700/80 hover:border-amber-500/60 text-slate-200 hover:text-amber-300 font-bold py-3 px-4 rounded-xl shadow-lg transition active:scale-95 cursor-pointer text-xs sm:text-sm backdrop-blur-md"
            >
              <SettingsIcon className="w-4 h-4 text-amber-400" />
              <span>Cài Đặt</span>
            </button>
          </div>

          {/* Optional: New Game confirmation trigger */}
          {hasProgress && (
            <div className="pt-1">
              {!showNewGameConfirm ? (
                <button
                  onClick={() => setShowNewGameConfirm(true)}
                  className="text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer flex items-center justify-center gap-1.5 mx-auto py-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Chơi Lại Từ Đầu (New Game)</span>
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 bg-rose-950/80 border border-rose-600/60 p-2 rounded-xl text-xs">
                  <span className="text-rose-200 font-semibold">Chắc chắn chơi lại từ đầu?</span>
                  <button
                    onClick={() => {
                      setShowNewGameConfirm(false);
                      onNewGame();
                      handleStartPlay();
                    }}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Đồng ý
                  </button>
                  <button
                    onClick={() => setShowNewGameConfirm(false)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer: Feature Hints & Version info */}
      <footer className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400/80 z-20 border-t border-slate-800/40 pt-3">
        <div className="flex items-center gap-2">
          <span>🚂 Xe lửa đang chạy trong thế giới mở thời gian thực</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Phiên bản v2.5 Cinematic Title</span>
          <span>•</span>
          <span className="text-amber-400/90 font-medium">Sẵn sàng khởi hành!</span>
        </div>
      </footer>
    </div>
  );
};
