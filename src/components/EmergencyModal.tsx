import React from 'react';
import { TrainState, PlayerProfile } from '../types';
import { AlertTriangle, Wrench, Fuel, Truck } from 'lucide-react';
import { audioSynthesizer } from '../utils/audioSynthesizer';

interface EmergencyModalProps {
  trainState: TrainState;
  playerProfile: PlayerProfile;
  onEmergencyRescue: (fuelGranted: number, hpGranted: number, cost: number) => void;
  onClose: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  trainState,
  playerProfile,
  onEmergencyRescue,
  onClose,
}) => {
  const isOutOfFuel = trainState.current_fuel <= 0.1;
  const isBrokenHull = trainState.current_hp <= 0;

  const rescueCost = Math.min(Math.floor(playerProfile.gold_balance * 0.5), 100);

  const handleRescue = () => {
    audioSynthesizer.playRepairSound();
    setTimeout(() => audioSynthesizer.playFuelRefill(), 300);
    onEmergencyRescue(30, 40, rescueCost);
  };

  return (
    <div
      id="emergency-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-rose-950/80 backdrop-blur-md animate-in fade-in"
    >
      <div
        id="emergency-modal-card"
        className="w-full max-w-md bg-slate-900 border-2 border-rose-500 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-rose-900/60 border-b border-rose-600/60 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-400/40">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-base text-rose-200">Đội Cứu Hộ Đường Ray Khẩn Cấp</h3>
            <p className="text-xs text-rose-300">
              {isOutOfFuel && isBrokenHull
                ? 'Tàu đã cạn kiệt nhiên liệu và hỏng vỏ tàu trên đường chạy!'
                : isOutOfFuel
                ? 'Đoàn tàu đã hết sạch nhiên liệu giữa chặng!'
                : 'Vỏ tàu đã bị hao mòn hoàn toàn (0 HP)!'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-sm">
          <p className="text-slate-300 text-xs leading-relaxed">
            Đội cứu hộ khẩn cấp của Tổng công ty Đường sắt Nông Trại đã phát hiện tín hiệu SOS của bạn. Họ sẽ cấp tốc cử xe goòng cứu hộ tiếp tế nhiên liệu và hàn gia cố thân tàu để bạn tiếp tục hành trình.
          </p>

          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-amber-400" />
                <span>Tiếp tế khẩn cấp:</span>
              </span>
              <strong className="text-amber-300 font-mono">+30 đơn vị Nhiên liệu</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-sky-400" />
                <span>Sửa chữa hàn vỏ tàu:</span>
              </span>
              <strong className="text-sky-300 font-mono">+40 HP Độ bền</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300 pt-2 border-t border-slate-800">
              <span>Phí cứu hộ đường sắt:</span>
              <strong className="text-rose-400 font-mono">-{rescueCost} Gold</strong>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Đóng
          </button>

          <button
            id="confirm-rescue-btn"
            onClick={handleRescue}
            className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-lg transition active:scale-95 cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>Gọi Cứu Hộ Tiếp Tế (-{rescueCost} Gold)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
