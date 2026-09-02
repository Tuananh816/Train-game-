import React, { useState } from 'react';
import { Station, TrainState, PlayerProfile, CarTypeId } from '../types';
import {
  ENGINE_CONFIGS,
  WHEELS_CONFIGS,
  HULL_CONFIGS,
  CAR_CONFIGS,
  ITEMS,
} from '../data/gameConfig';
import {
  Store,
  Wrench,
  Sparkles,
  ArrowRight,
  Fuel,
  Shield,
  Coins,
  Plus,
  Trash2,
  CheckCircle2,
  TrendingUp,
  Award,
  Eye,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioSynthesizer } from '../utils/audioSynthesizer';

interface StationModalProps {
  station: Station;
  nextStation: Station;
  stageDistanceKm: number;
  playerProfile: PlayerProfile;
  trainState: TrainState;
  onSellAllCargo: (payout: number, itemsSold: Record<string, number>, passengersServed: number) => void;
  onRefuel: (units: number, cost: number) => void;
  onRepair: (hp: number, cost: number) => void;
  onUpgradePart: (partType: 'ENGINE' | 'WHEELS' | 'HULL', targetLevel: number, cost: number) => void;
  onBuyCar: (carTypeId: CarTypeId, cost: number) => void;
  onRemoveCar: (carIndex: number, refund: number) => void;
  onDepartStation: () => void;
}

export const StationModal: React.FC<StationModalProps> = ({
  station,
  nextStation,
  stageDistanceKm,
  playerProfile,
  trainState,
  onSellAllCargo,
  onRefuel,
  onRepair,
  onUpgradePart,
  onBuyCar,
  onRemoveCar,
  onDepartStation,
}) => {
  const [activeTab, setActiveTab] = useState<'TRADE' | 'SERVICES' | 'UPGRADES'>('TRADE');
  const [tradeClaimed, setTradeClaimed] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // -------------------------------------------------------------
  // 1. Calculate Revenue and Goods on Board
  // -------------------------------------------------------------
  const fixedStageReward = Math.round(stageDistanceKm * 10);

  // Gather all items from storage and passenger cars
  const inventoryItems: Record<string, number> = {};
  let totalPassengers = 0;

  trainState.car_list.forEach((car) => {
    if (car.car_type_id === 'STORAGE' && car.cargo_inventory) {
      Object.entries(car.cargo_inventory).forEach(([itemId, weight]) => {
        const numWeight = Number(weight) || 0;
        inventoryItems[itemId] = (inventoryItems[itemId] || 0) + numWeight;
      });
    }
    if (car.car_type_id === 'PASSENGER') {
      totalPassengers += car.passengers_count || 0;
    }
  });

  // Calculate produce revenue
  let produceRevenue = 0;
  Object.entries(inventoryItems).forEach(([itemId, amount]) => {
    const unitPrice = station.market_prices[itemId] || ITEMS[itemId]?.base_price || 5;
    produceRevenue += amount * unitPrice;
  });

  // Calculate passenger fare revenue
  const passengerTicketPrice = station.market_prices['passenger_ticket'] || 15;
  const passengerRevenue = totalPassengers * passengerTicketPrice;

  // Restaurant Car Tip bonus (+50% tip per restaurant car)
  const restaurantCount = trainState.car_list.filter((c) => c.car_type_id === 'RESTAURANT').length;
  const tipBonusAmount = Math.round(passengerRevenue * restaurantCount * 0.5);

  // Total Stage Revenue
  const totalStageRevenue = fixedStageReward + produceRevenue + passengerRevenue + tipBonusAmount;

  // -------------------------------------------------------------
  // 2. Service Cost Calculations
  // -------------------------------------------------------------
  const neededFuel = Math.max(0, trainState.max_fuel - trainState.current_fuel);
  const fullRefuelCost = Math.round(neededFuel * station.fuel_refill_price_per_unit);

  const neededHp = Math.max(0, trainState.max_hp - trainState.current_hp);
  const fullRepairCost = Math.round(neededHp * station.repair_price_per_hp);

  const handleClaimTrade = () => {
    if (tradeClaimed) return;
    audioSynthesizer.playCoinSound();
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {}
    onSellAllCargo(totalStageRevenue, inventoryItems, totalPassengers);
    setTradeClaimed(true);
  };

  const handleDepart = () => {
    if (!tradeClaimed && totalStageRevenue > 0) {
      onSellAllCargo(totalStageRevenue, inventoryItems, totalPassengers);
      setTradeClaimed(true);
    }
    audioSynthesizer.playWhistle();
    setTimeout(() => {
      audioSynthesizer.playSteamHiss();
    }, 400);
    onDepartStation();
  };

  // Keyboard shortcut: Press Enter to depart
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleDepart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tradeClaimed, totalStageRevenue]);

  if (isMinimized) {
    return (
      <div
        id="station-minimized-dock"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/90 border border-amber-500/50 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-300"
      >
        <div className="flex items-center gap-2 pr-2 border-r border-slate-700">
          <span className="text-xl">🚉</span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-amber-300">{station.station_name}</span>
            <span className="text-[10px] text-slate-400 font-mono">Đang đỗ tại sân ga (Km {station.distance_from_start_km})</span>
          </div>
        </div>

        <button
          id="expand-station-btn"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Mở Chợ & Xưởng Nâng Cấp</span>
        </button>

        <button
          id="quick-depart-btn"
          onClick={handleDepart}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition cursor-pointer"
        >
          <span>🚀 Khởi Hành (Enter)</span>
        </button>
      </div>
    );
  }

  return (
    <div
      id="station-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="station-modal-card"
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-amber-950/90 via-slate-900 to-indigo-950/90 p-4 sm:p-5 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow-inner">
              🚉
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-amber-300 font-sans tracking-wide">
                  {station.station_name}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-900/60 border border-amber-600/50 text-amber-200 text-xs font-mono">
                  Km {station.distance_from_start_km}
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-md mt-0.5">
                {station.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Station / Minimize Button */}
            <button
              id="minimize-station-modal-btn"
              onClick={() => setIsMinimized(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600 text-xs text-slate-200 transition cursor-pointer"
              title="Ẩn bảng để xem toàn cảnh đoàn tàu và sân ga"
            >
              <Eye className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Xem Sân Ga</span>
            </button>

            {/* Player Gold Status */}
            <div className="flex items-center gap-2 bg-slate-950/70 border border-amber-500/30 px-3.5 py-1.5 rounded-xl font-mono text-amber-300 shadow-md">
              <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-base sm:text-lg font-bold">
                {Math.floor(playerProfile.gold_balance).toLocaleString('vi-VN')}
              </span>
              <span className="text-xs text-amber-400">Gold</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/50 px-4 pt-2 gap-2 text-sm font-medium">
          <button
            id="tab-trade-btn"
            onClick={() => setActiveTab('TRADE')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 transition cursor-pointer ${
              activeTab === 'TRADE'
                ? 'border-amber-400 text-amber-300 bg-slate-900 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>1. Bán Hàng & Báo Cáo</span>
            {!tradeClaimed && totalStageRevenue > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            id="tab-services-btn"
            onClick={() => setActiveTab('SERVICES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 transition cursor-pointer ${
              activeTab === 'SERVICES'
                ? 'border-emerald-400 text-emerald-300 bg-slate-900 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>2. Dịch Vụ Trạm</span>
            {(neededFuel > 5 || neededHp > 5) && (
              <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-600/40 text-[10px]">
                Cần bảo dưỡng
              </span>
            )}
          </button>

          <button
            id="tab-upgrades-btn"
            onClick={() => setActiveTab('UPGRADES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 transition cursor-pointer ${
              activeTab === 'UPGRADES'
                ? 'border-indigo-400 text-indigo-300 bg-slate-900 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>3. Xưởng Nâng Cấp Tàu</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ========================================================================= */}
          {/* TAB 1: BÁN HÀNG & THU HOẠCH TẠI TRẠM */}
          {/* ========================================================================= */}
          {activeTab === 'TRADE' && (
            <div className="space-y-5 animate-in fade-in">
              {playerProfile.trips_completed === 0 && totalPassengers === 0 && Object.keys(inventoryItems).length === 0 && (
                <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 border border-amber-500/50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <span className="text-lg">🚂</span>
                    <span>Chào Mừng Trưởng Tàu Đến Với Trạm Khởi Hành Đầu Tiên!</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Bạn đang ở trạm xuất phát với <strong>Đầu kéo cơ bản</strong> và <strong>1 Toa chở khách</strong> cùng <strong>100 Gold</strong> vốn khởi nghiệp. Hãy nhấn nút <strong>[ 🚀 KHỞI HÀNH ĐI TIẾP (Enter) ]</strong> bên dưới để tàu lăn bánh.
                  </p>
                  <p className="text-xs text-amber-200/90 font-mono">
                    💡 Khi tàu chạy, toa khách sẽ đón khách dọc tuyến đường. Khi cập bến các trạm tiếp theo, bạn sẽ nhận tiền vé chặng để tích lũy mua thêm các toa Nông trại, Chuồng gà, Kho hàng, Nhà hàng và nâng cấp động cơ!
                  </p>
                </div>
              )}

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <h3 className="font-bold text-base text-slate-100">
                      Bảng Kê Doanh Thu Chặng (Quãng đường {stageDistanceKm.toFixed(1)} km)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Đơn giá cập nhật theo thị trường trạm
                  </span>
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-2.5 text-sm">
                  {/* Fixed Stage reward */}
                  <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span>🛤️ Tiền chặng đường dài ({stageDistanceKm.toFixed(1)} km × 10 Gold)</span>
                    </div>
                    <span className="font-mono font-bold text-amber-300">
                      +{fixedStageReward} Gold
                    </span>
                  </div>

                  {/* Passenger Fares */}
                  <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span>🎫 Tiền vé hành khách ({totalPassengers} khách × {passengerTicketPrice} Gold)</span>
                    </div>
                    <span className="font-mono font-bold text-amber-300">
                      +{passengerRevenue} Gold
                    </span>
                  </div>

                  {/* Restaurant Car Tip Bonus */}
                  {restaurantCount > 0 && totalPassengers > 0 && (
                    <div className="flex items-center justify-between bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/40 text-rose-200">
                      <div className="flex items-center gap-2">
                        <span>🍷 Tiền Tip Nhà Hàng ({restaurantCount} toa × 50% = +{(restaurantCount * 50)}% tiền vé)</span>
                      </div>
                      <span className="font-mono font-bold text-rose-300">
                        +{tipBonusAmount} Gold
                      </span>
                    </div>
                  )}

                  {/* Cargo Items Sold */}
                  {Object.entries(inventoryItems).length > 0 ? (
                    Object.entries(inventoryItems).map(([itemId, amount]) => {
                      const item = ITEMS[itemId];
                      const unitPrice = station.market_prices[itemId] || item?.base_price || 5;
                      const subtotal = amount * unitPrice;
                      return (
                        <div
                          key={itemId}
                          className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800"
                        >
                          <div className="flex items-center gap-2 text-slate-300">
                            <span>{item?.icon || '📦'} {item?.name || itemId}: {amount.toFixed(1)} {item?.unit || 'kg'} × {unitPrice} Gold</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-400">
                            +{subtotal.toFixed(0)} Gold
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-slate-500 italic p-2">
                      (Không có nông sản tồn trong toa kho hàng)
                    </div>
                  )}

                  {/* Total Summary */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-amber-950/60 to-slate-900 p-3.5 rounded-xl border border-amber-500/40 mt-3 text-base">
                    <span className="font-bold text-amber-200">TỔNG THU NHẬP CHẶNG:</span>
                    <span className="font-mono font-extrabold text-xl text-amber-300">
                      +{totalStageRevenue.toLocaleString('vi-VN')} Gold
                    </span>
                  </div>
                </div>

                {/* Claim Button */}
                <div className="pt-2">
                  {!tradeClaimed ? (
                    <button
                      id="claim-trade-btn"
                      onClick={handleClaimTrade}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-base py-3 px-6 rounded-xl shadow-lg transition active:scale-98 cursor-pointer"
                    >
                      <Coins className="w-5 h-5" />
                      <span>Bán Nông Sản & Nhận Tiền Vé (+{totalStageRevenue} Gold)</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 py-3 px-4 rounded-xl text-sm font-semibold">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Đã giao dịch thành công! Tiền vàng đã được nạp vào tài khoản.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Station Market Price Board */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Bảng Giá Nông Sản & Hàng Hóa Niêm Yết Tại {station.station_name}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Object.entries(station.market_prices).map(([itemId, price]) => {
                    const item = ITEMS[itemId];
                    return (
                      <div
                        key={itemId}
                        className="bg-slate-900/80 border border-slate-700/70 p-2.5 rounded-lg flex flex-col gap-1"
                      >
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <span>{item?.icon || '📦'}</span>
                          <span className="truncate">{item?.name || itemId}</span>
                        </div>
                        <div className="flex items-baseline justify-between font-mono">
                          <span className="text-base font-bold text-amber-300">{price}</span>
                          <span className="text-[10px] text-slate-400">Gold/{item?.unit || 'đơn vị'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: DỊCH VỤ TRẠM (NẠP NHIÊN LIỆU & SỬA CHỮA TÀU) */}
          {/* ========================================================================= */}
          {activeTab === 'SERVICES' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Nạp Nhiên Liệu Card */}
                <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Fuel className="w-5 h-5 text-amber-400" />
                        <h4 className="font-bold text-base text-slate-100">Nạp Nhiên Liệu (Fuel)</h4>
                      </div>
                      <span className="text-xs font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/40">
                        {station.fuel_refill_price_per_unit} Gold / đơn vị
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs font-mono text-slate-300">
                        <span>Mức nhiên liệu hiện tại:</span>
                        <span className="font-bold">{trainState.current_fuel.toFixed(1)} / {trainState.max_fuel}</span>
                      </div>
                      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-300"
                          style={{ width: `${(trainState.current_fuel / trainState.max_fuel) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-400">
                        Cần nạp: <strong className="text-slate-200">{neededFuel.toFixed(1)}</strong> đơn vị
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-700/60">
                    <button
                      id="refuel-full-btn"
                      disabled={neededFuel <= 0.5 || playerProfile.gold_balance < fullRefuelCost}
                      onClick={() => {
                        audioSynthesizer.playFuelRefill();
                        onRefuel(neededFuel, fullRefuelCost);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm transition active:scale-98 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Fuel className="w-4 h-4" />
                      <span>
                        {neededFuel <= 0.5
                          ? 'Bình Nhiên Liệu Đã Đầy'
                          : `Nạp Đầy Bình (-${fullRefuelCost} Gold)`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. Sửa Chữa Vỏ Tàu Card */}
                <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-sky-400" />
                        <h4 className="font-bold text-base text-slate-100">Sửa Chữa Thân Tàu (HP)</h4>
                      </div>
                      <span className="text-xs font-mono text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-600/40">
                        {station.repair_price_per_hp} Gold / HP
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs font-mono text-slate-300">
                        <span>Độ bền vỏ tàu hiện tại:</span>
                        <span className="font-bold">{trainState.current_hp.toFixed(0)} / {trainState.max_hp} HP</span>
                      </div>
                      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-sky-500 rounded-full transition-all duration-300"
                          style={{ width: `${(trainState.current_hp / trainState.max_hp) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-400">
                        Hao mòn cần phục hồi: <strong className="text-slate-200">{neededHp.toFixed(0)}</strong> HP
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-700/60">
                    <button
                      id="repair-full-btn"
                      disabled={neededHp <= 0.5 || playerProfile.gold_balance < fullRepairCost}
                      onClick={() => {
                        audioSynthesizer.playRepairSound();
                        onRepair(neededHp, fullRepairCost);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm transition active:scale-98 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>
                        {neededHp <= 0.5
                          ? 'Vỏ Tàu Hoàn Hảo (100% HP)'
                          : `Sửa Toàn Diện (-${fullRepairCost} Gold)`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick combo full maintenance button */}
              {(neededFuel > 1 || neededHp > 1) && (
                <div className="bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/40 p-4 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-sm text-emerald-300">Gói Bảo Dưỡng Toàn Diện</h5>
                    <p className="text-xs text-slate-400">Nạp đầy nhiên liệu + Phục hồi 100% HP vỏ tàu cùng lúc</p>
                  </div>
                  <button
                    id="combo-maintenance-btn"
                    disabled={playerProfile.gold_balance < fullRefuelCost + fullRepairCost}
                    onClick={() => {
                      audioSynthesizer.playRepairSound();
                      setTimeout(() => audioSynthesizer.playFuelRefill(), 200);
                      onRefuel(neededFuel, fullRefuelCost);
                      onRepair(neededHp, fullRepairCost);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold px-4 py-2 rounded-lg text-xs font-mono shadow transition cursor-pointer"
                  >
                    Bảo Dưỡng Hết (-{fullRefuelCost + fullRepairCost} Gold)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: XƯỞNG NÂNG CẤP & MUA NỐI THÊM TOA */}
          {/* ========================================================================= */}
          {activeTab === 'UPGRADES' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Section 1: Bộ Phận Cơ Bản (Engine, Wheels, Hull) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span>Nâng Cấp Hệ Thống Đầu Máy & Cơ Khí</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Engine Upgrade */}
                  <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-amber-300">🚂 Động Cơ</span>
                        <span className="px-1.5 py-0.5 bg-slate-900 rounded font-mono text-[11px] text-slate-300">
                          Cấp {trainState.engine_level}/3
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-100 mt-1">
                        {ENGINE_CONFIGS[trainState.engine_level]?.name}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Tốc độ max: <strong>{ENGINE_CONFIGS[trainState.engine_level]?.max_speed_kmh} km/h</strong> | Sức kéo: <strong>{ENGINE_CONFIGS[trainState.engine_level]?.max_weight_tons}T</strong>
                      </p>
                    </div>

                    {trainState.engine_level < 3 ? (
                      <button
                        id="upgrade-engine-btn"
                        disabled={playerProfile.gold_balance < ENGINE_CONFIGS[trainState.engine_level + 1].cost_gold}
                        onClick={() => {
                          const nextLvl = trainState.engine_level + 1;
                          const cost = ENGINE_CONFIGS[nextLvl].cost_gold;
                          audioSynthesizer.playUpgradeFanfare();
                          onUpgradePart('ENGINE', nextLvl, cost);
                        }}
                        className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold py-2 rounded-lg text-xs transition cursor-pointer"
                      >
                        Nâng lên Cấp {trainState.engine_level + 1} (-{ENGINE_CONFIGS[trainState.engine_level + 1].cost_gold} Gold)
                      </button>
                    ) : (
                      <div className="text-center text-xs text-emerald-400 font-bold py-1.5 bg-emerald-950/40 rounded-lg border border-emerald-800/50">
                        ⭐ Cấp Tối Đa (Max)
                      </div>
                    )}
                  </div>

                  {/* Wheels Upgrade */}
                  <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-sky-300">⚙️ Bánh Xe</span>
                        <span className="px-1.5 py-0.5 bg-slate-900 rounded font-mono text-[11px] text-slate-300">
                          Cấp {trainState.wheels_level}/3
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-100 mt-1">
                        {WHEELS_CONFIGS[trainState.wheels_level]?.name}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Gia tốc: <strong>{WHEELS_CONFIGS[trainState.wheels_level]?.acceleration} km/h/s</strong> | Giảm tiêu hao: <strong>{(WHEELS_CONFIGS[trainState.wheels_level]?.fuel_efficiency_bonus * 100).toFixed(0)}%</strong>
                      </p>
                    </div>

                    {trainState.wheels_level < 3 ? (
                      <button
                        id="upgrade-wheels-btn"
                        disabled={playerProfile.gold_balance < WHEELS_CONFIGS[trainState.wheels_level + 1].cost_gold}
                        onClick={() => {
                          const nextLvl = trainState.wheels_level + 1;
                          const cost = WHEELS_CONFIGS[nextLvl].cost_gold;
                          audioSynthesizer.playUpgradeFanfare();
                          onUpgradePart('WHEELS', nextLvl, cost);
                        }}
                        className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-slate-950 font-bold py-2 rounded-lg text-xs transition cursor-pointer"
                      >
                        Nâng lên Cấp {trainState.wheels_level + 1} (-{WHEELS_CONFIGS[trainState.wheels_level + 1].cost_gold} Gold)
                      </button>
                    ) : (
                      <div className="text-center text-xs text-emerald-400 font-bold py-1.5 bg-emerald-950/40 rounded-lg border border-emerald-800/50">
                        ⭐ Cấp Tối Đa (Max)
                      </div>
                    )}
                  </div>

                  {/* Hull Upgrade */}
                  <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-emerald-300">🛡️ Vỏ Tàu</span>
                        <span className="px-1.5 py-0.5 bg-slate-900 rounded font-mono text-[11px] text-slate-300">
                          Cấp {trainState.hull_level}/3
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-100 mt-1">
                        {HULL_CONFIGS[trainState.hull_level]?.name}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        HP max: <strong>{HULL_CONFIGS[trainState.hull_level]?.max_hp} HP</strong> | Hao mòn: <strong>{(1 / HULL_CONFIGS[trainState.hull_level]?.wear_rate_per_km).toFixed(0)} km / HP</strong>
                      </p>
                    </div>

                    {trainState.hull_level < 3 ? (
                      <button
                        id="upgrade-hull-btn"
                        disabled={playerProfile.gold_balance < HULL_CONFIGS[trainState.hull_level + 1].cost_gold}
                        onClick={() => {
                          const nextLvl = trainState.hull_level + 1;
                          const cost = HULL_CONFIGS[nextLvl].cost_gold;
                          audioSynthesizer.playUpgradeFanfare();
                          onUpgradePart('HULL', nextLvl, cost);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold py-2 rounded-lg text-xs transition cursor-pointer"
                      >
                        Nâng lên Cấp {trainState.hull_level + 1} (-{HULL_CONFIGS[trainState.hull_level + 1].cost_gold} Gold)
                      </button>
                    ) : (
                      <div className="text-center text-xs text-emerald-400 font-bold py-1.5 bg-emerald-950/40 rounded-lg border border-emerald-800/50">
                        ⭐ Cấp Tối Đa (Max)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Mua Nối Thêm Toa Xe Mới Phân Loại Rõ Ràng */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Mua Nối Thêm Toa Xe Mới Vào Đoàn Tàu</span>
                </h4>

                {/* 1. TOA SẢN XUẤT THÔ & KHO */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <span>🌾 TOA SẢN XUẤT THÔ & KHO</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(['GREENHOUSE_POTATO', 'BARN_CHICKEN', 'STORAGE'] as CarTypeId[]).map((typeId) => {
                      const carConfig = CAR_CONFIGS[typeId];
                      return (
                        <div
                          key={typeId}
                          className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 flex flex-col justify-between space-y-2.5"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-xs text-slate-100">{carConfig.name}</h5>
                              <span className="font-mono text-xs font-bold text-amber-300">
                                {carConfig.buy_cost_gold} G
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">{carConfig.description}</p>
                            <div className="text-[10px] text-slate-300 mt-1.5 font-mono">
                              Trọng lượng: {carConfig.empty_weight_tons}T
                            </div>
                          </div>

                          <button
                            id={`buy-car-${typeId}`}
                            disabled={playerProfile.gold_balance < carConfig.buy_cost_gold}
                            onClick={() => {
                              audioSynthesizer.playUpgradeFanfare();
                              onBuyCar(typeId, carConfig.buy_cost_gold);
                            }}
                            className="w-full flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold py-1.5 px-2.5 rounded-lg text-xs transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Mua Toa ({carConfig.buy_cost_gold}G)</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. TOA CHỨC NĂNG HỖ TRỢ */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <span>🛠️ TOA CHỨC NĂNG HỖ TRỢ (TỰ PHỤC HỒI & TẠO NHIÊN LIỆU)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['FUEL_GENERATOR', 'MAINTENANCE'] as CarTypeId[]).map((typeId) => {
                      const carConfig = CAR_CONFIGS[typeId];
                      return (
                        <div
                          key={typeId}
                          className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 flex flex-col justify-between space-y-2.5"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-xs text-slate-100">{carConfig.name}</h5>
                              <span className="font-mono text-xs font-bold text-amber-300">
                                {carConfig.buy_cost_gold} G
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">{carConfig.description}</p>
                            <div className="text-[10px] text-sky-300 mt-1.5 font-mono">
                              {typeId === 'FUEL_GENERATOR' ? '⚡ +0.5 Fuel / 5s khi chạy' : '🔧 +0.3 HP / 5s khi chạy'}
                            </div>
                          </div>

                          <button
                            id={`buy-car-${typeId}`}
                            disabled={playerProfile.gold_balance < carConfig.buy_cost_gold}
                            onClick={() => {
                              audioSynthesizer.playUpgradeFanfare();
                              onBuyCar(typeId, carConfig.buy_cost_gold);
                            }}
                            className="w-full flex items-center justify-center gap-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-slate-950 font-bold py-1.5 px-2.5 rounded-lg text-xs transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Mua Toa ({carConfig.buy_cost_gold}G)</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. TOA DỊCH VỤ HÀNH KHÁCH */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <span>👥 TOA DỊCH VỤ HÀNH KHÁCH & ẨM THỰC</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['PASSENGER', 'RESTAURANT'] as CarTypeId[]).map((typeId) => {
                      const carConfig = CAR_CONFIGS[typeId];
                      return (
                        <div
                          key={typeId}
                          className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 flex flex-col justify-between space-y-2.5"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-xs text-slate-100">{carConfig.name}</h5>
                              <span className="font-mono text-xs font-bold text-amber-300">
                                {carConfig.buy_cost_gold} G
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">{carConfig.description}</p>
                            <div className="text-[10px] text-indigo-300 mt-1.5 font-mono">
                              {typeId === 'PASSENGER' ? '🎫 Đón 20 khách & thu vé' : '🍷 +50% tiền Tip trên vé khách'}
                            </div>
                          </div>

                          <button
                            id={`buy-car-${typeId}`}
                            disabled={playerProfile.gold_balance < carConfig.buy_cost_gold}
                            onClick={() => {
                              audioSynthesizer.playUpgradeFanfare();
                              onBuyCar(typeId, carConfig.buy_cost_gold);
                            }}
                            className="w-full flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold py-1.5 px-2.5 rounded-lg text-xs transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Mua Toa ({carConfig.buy_cost_gold}G)</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 3: Danh Sách Các Toa Hiện Có (Quản lý / Tháo bớt) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Danh Sách Các Toa Đang Nối Sau Đầu Máy ({trainState.car_list.length} toa)
                </h4>
                <div className="space-y-2">
                  {trainState.car_list.map((car, idx) => {
                    const cfg = CAR_CONFIGS[car.car_type_id];
                    const refund = Math.round(cfg?.buy_cost_gold * 0.6) || 200;
                    return (
                      <div
                        key={car.id || idx}
                        className="flex items-center justify-between bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-500">#{idx + 1}</span>
                          <span className="font-semibold text-slate-200">{cfg?.name || car.car_type_id}</span>
                          <span className="text-slate-400 font-mono text-[11px]">({cfg?.empty_weight_tons}T)</span>
                        </div>
                        {trainState.car_list.length > 1 && (
                          <button
                            onClick={() => {
                              audioSynthesizer.playCoinSound();
                              onRemoveCar(idx, refund);
                            }}
                            className="flex items-center gap-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2 py-1 rounded transition cursor-pointer"
                            title={`Tháo dỡ toa để hoàn trả ${refund} Gold`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Tháo dỡ (+{refund}G)</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Bar: Departure Button */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 font-mono">
            <span>Trạm tiếp theo: </span>
            <strong className="text-slate-200">{nextStation.station_name}</strong>
            <span className="text-amber-400 ml-1">
              ({(nextStation.distance_from_start_km - station.distance_from_start_km).toFixed(1)} km)
            </span>
          </div>

          <button
            id="depart-station-btn"
            onClick={handleDepart}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl shadow-lg transition active:scale-95 cursor-pointer text-sm"
          >
            <span>🚀 KHỞI HÀNH ĐI TIẾP (Enter)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
