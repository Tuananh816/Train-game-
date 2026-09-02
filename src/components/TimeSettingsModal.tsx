import React from 'react';
import { TimeSyncMode, TimeState } from '../types';
import { X, Clock, Sun, Moon, Sunrise, Sunset, Zap } from 'lucide-react';

interface TimeSettingsModalProps {
  timeState: TimeState;
  onSetTimeMode: (mode: TimeSyncMode) => void;
  onSetManualHour: (hour: number) => void;
  onClose: () => void;
}

export const TimeSettingsModal: React.FC<TimeSettingsModalProps> = ({
  timeState,
  onSetTimeMode,
  onSetManualHour,
  onClose,
}) => {
  return (
    <div
      id="time-settings-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in"
    >
      <div
        id="time-settings-card"
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-slate-100 font-sans">
              Đồng Bộ Thời Gian Thực & Chu Kỳ Ngày Đêm
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-6 text-sm">
          {/* Current Live Time Display */}
          <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/40 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-indigo-300 font-medium">Thời Gian Trong Game Hiện Tại:</span>
              <div className="text-2xl sm:text-3xl font-mono font-extrabold text-indigo-100 tracking-wider">
                {timeState.displayTime}
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-indigo-400/30 text-xs font-semibold">
              {timeState.dayPhase === 'DAWN' && (
                <>
                  <Sunrise className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-200">Rạng Sáng (Dawn)</span>
                </>
              )}
              {timeState.dayPhase === 'DAY' && (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-200">Ban Ngày (Day)</span>
                </>
              )}
              {timeState.dayPhase === 'SUNSET' && (
                <>
                  <Sunset className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-200">Hoàng Hôn (Sunset)</span>
                </>
              )}
              {timeState.dayPhase === 'NIGHT' && (
                <>
                  <Moon className="w-4 h-4 text-sky-400" />
                  <span className="text-sky-200">Ban Đêm (Night)</span>
                </>
              )}
            </div>
          </div>

          {/* Mode Selection Options */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Chọn Chế Độ Vận Hành Thời Gian
            </h4>

            {/* Mode 1: REALTIME */}
            <div
              onClick={() => onSetTimeMode('REALTIME')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                timeState.mode === 'REALTIME'
                  ? 'bg-indigo-950/60 border-indigo-400 shadow-md'
                  : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80'
              }`}
            >
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-slate-100">Đồng Bộ Theo Giờ Thực Tế (Live Real-Time)</strong>
                  {timeState.mode === 'REALTIME' && (
                    <span className="text-[11px] bg-indigo-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                      Đang bật
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Đồng bộ chuẩn xác theo giờ địa phương thực tế của bạn. Tàu sẽ trải qua hoàng hôn, đêm đầy sao và bình minh theo đúng đồng hồ máy tính.
                </p>
              </div>
            </div>

            {/* Mode 2: FAST FORWARD */}
            <div
              onClick={() => onSetTimeMode('FAST_FORWARD')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                timeState.mode === 'FAST_FORWARD'
                  ? 'bg-indigo-950/60 border-indigo-400 shadow-md'
                  : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80'
              }`}
            >
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-slate-100">Chu Kỳ Tua Nhanh (Fast-Forward 24H)</strong>
                  {timeState.mode === 'FAST_FORWARD' && (
                    <span className="text-[11px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                      Đang bật
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Chu kỳ 1 ngày 24 giờ diễn ra nhanh chóng trong vòng 12 phút để bạn liên tục chiêm ngưỡng cảnh quan ngày đêm chuyển động.
                </p>
              </div>
            </div>

            {/* Mode 3: MANUAL SLIDER */}
            <div
              onClick={() => onSetTimeMode('MANUAL')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col gap-3 ${
                timeState.mode === 'MANUAL'
                  ? 'bg-indigo-950/60 border-indigo-400 shadow-md'
                  : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 mt-0.5">
                  <Sun className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm text-slate-100">Tùy Chọn Giờ Thủ Công (Manual Hour)</strong>
                    {timeState.mode === 'MANUAL' && (
                      <span className="text-[11px] bg-purple-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                        Đang bật
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Kéo thanh trượt hoặc chọn các mốc thời gian để xem cảnh đẹp mong muốn.
                  </p>
                </div>
              </div>

              {/* Slider Controls */}
              {timeState.mode === 'MANUAL' && (
                <div className="pt-2 border-t border-slate-700/60 space-y-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                    <span>Chọn giờ trong ngày:</span>
                    <span className="font-bold text-amber-300">{timeState.hour}:00</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="23"
                    step="1"
                    value={timeState.hour}
                    onChange={(e) => onSetManualHour(Number(e.target.value))}
                    className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />

                  {/* Preset Quick Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <button
                      onClick={() => onSetManualHour(6)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 font-medium"
                    >
                      🌅 06:00 Sáng
                    </button>
                    <button
                      onClick={() => onSetManualHour(12)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-yellow-300 font-medium"
                    >
                      ☀️ 12:00 Trưa
                    </button>
                    <button
                      onClick={() => onSetManualHour(18)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-orange-300 font-medium"
                    >
                      🌇 18:00 Chiều
                    </button>
                    <button
                      onClick={() => onSetManualHour(23)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-indigo-300 font-medium"
                    >
                      🌙 23:00 Đêm
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            Lưu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
