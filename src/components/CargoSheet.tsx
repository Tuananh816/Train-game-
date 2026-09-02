import React from 'react';
import { TrainState } from '../types';
import { CAR_CONFIGS, ITEMS } from '../data/gameConfig';
import { X, Package, Clock, Users, Weight } from 'lucide-react';

interface CargoSheetProps {
  trainState: TrainState;
  onClose: () => void;
}

export const CargoSheet: React.FC<CargoSheetProps> = ({ trainState, onClose }) => {
  // Aggregate inventory from all storage cars
  const totalInventory: Record<string, number> = {};
  let totalStorageCap = 0;
  let currentStorageWeight = 0;
  let totalPassengers = 0;
  let maxPassengerCapacity = 0;

  trainState.car_list.forEach((car) => {
    if (car.car_type_id === 'STORAGE') {
      const cfg = CAR_CONFIGS['STORAGE'];
      totalStorageCap += cfg.max_capacity_kg;
      if (car.cargo_inventory) {
        Object.entries(car.cargo_inventory).forEach(([itemId, amount]) => {
          const numAmount = Number(amount) || 0;
          totalInventory[itemId] = (totalInventory[itemId] || 0) + numAmount;
          currentStorageWeight += numAmount;
        });
      }
    }
    if (car.car_type_id === 'PASSENGER') {
      const cfg = CAR_CONFIGS['PASSENGER'];
      maxPassengerCapacity += cfg.max_capacity_kg;
      totalPassengers += car.passengers_count || 0;
    }
  });

  return (
    <div
      id="cargo-sheet-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in"
    >
      <div
        id="cargo-sheet-card"
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-slate-100 font-sans">
              Kho Hàng & Dây Chuyền Sản Xuất Đoàn Tàu
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-sm">
          {/* Storage Capacity Gauge */}
          <div className="bg-slate-800/60 border border-slate-700/70 p-4 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">Tổng Dung Lượng Kho Chứa Hàng Hóa:</span>
              <span className="font-mono font-bold text-amber-300">
                {currentStorageWeight.toFixed(1)} / {totalStorageCap} kg
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${totalStorageCap > 0 ? Math.min(100, (currentStorageWeight / totalStorageCap) * 100) : 0}%` }}
              />
            </div>
          </div>

          {/* Current Cargo Breakdown */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Hàng Hóa Hiện Có Trong Kho
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(ITEMS).map(([itemId, item]) => {
                const amount = totalInventory[itemId] || 0;
                return (
                  <div
                    key={itemId}
                    className="bg-slate-800/40 border border-slate-700/60 p-3 rounded-xl flex items-center gap-3"
                  >
                    <div className="text-2xl">{item.icon}</div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-300 font-medium">{item.name}</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        {amount.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">{item.unit}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Passenger Status */}
          {maxPassengerCapacity > 0 && (
            <div className="bg-blue-950/40 border border-blue-800/40 p-3.5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-200">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-xs">Hành khách đang trên tàu:</span>
              </div>
              <span className="font-mono font-bold text-blue-300 text-sm">
                {totalPassengers} / {maxPassengerCapacity} khách
              </span>
            </div>
          )}

          {/* Real-time Production Status of Each Car */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Tiến Độ Canh Tác & Sản Xuất Từng Toa</span>
            </h4>

            <div className="space-y-2">
              {trainState.car_list.map((car, idx) => {
                const cfg = CAR_CONFIGS[car.car_type_id];
                const cycleTime = cfg.harvest_time_sec || 1;
                const progress = car.growth_timer > 0 ? 1 - car.growth_timer / cycleTime : 1;

                return (
                  <div
                    key={car.id || idx}
                    className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono">#{idx + 1}</span>
                        <strong className="text-slate-100">{cfg.name}</strong>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {car.car_type_id === 'FUEL_GENERATOR'
                          ? `⚡ Nạp +0.5 Fuel (${car.growth_timer.toFixed(1)}s)`
                          : car.car_type_id === 'MAINTENANCE'
                          ? `🔧 Vá +0.3 HP (${car.growth_timer.toFixed(1)}s)`
                          : car.car_type_id === 'RESTAURANT'
                          ? '🍷 Thưởng +50% Tip'
                          : car.car_type_id === 'STORAGE'
                          ? '📦 Kho Chứa Đa Năng'
                          : car.growth_timer > 0
                          ? `Chu kỳ: ${car.growth_timer.toFixed(1)}s`
                          : cfg.harvest_time_sec > 0
                          ? 'Đã thu hoạch vào kho'
                          : 'Toa Đoàn Tàu'}
                      </span>
                    </div>

                    {cfg.harvest_time_sec > 0 && (
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-200 ${
                            car.car_type_id === 'FUEL_GENERATOR'
                              ? 'bg-sky-400'
                              : car.car_type_id === 'MAINTENANCE'
                              ? 'bg-amber-400'
                              : car.car_type_id === 'PASSENGER'
                              ? 'bg-indigo-400'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weight Breakdown */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Weight className="w-4 h-4 text-emerald-400" />
              <span>Tổng trọng tải toàn đoàn tàu:</span>
            </div>
            <span className="font-mono font-bold text-emerald-300 text-sm">
              {trainState.total_weight_tons.toFixed(1)} Tấn
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            Đóng Bảng Kho
          </button>
        </div>
      </div>
    </div>
  );
};
