import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlayerProfile,
  TrainState,
  Station,
  TimeSyncMode,
  CarTypeId,
  JourneyStats,
  WeatherType,
  WeatherSelectionMode,
  SaveData,
  RuntimeStationState,
  Customer,
} from './types';
import {
  ENGINE_CONFIGS,
  WHEELS_CONFIGS,
  HULL_CONFIGS,
  CAR_CONFIGS,
  STATIONS,
  ITEMS,
} from './data/gameConfig';
import { WEATHER_CONFIGS, WEATHER_UNLOCK_ORDER } from './data/weatherConfig';
import { loadGameSave, saveGameData, getDefaultSaveData, resetGameSave } from './utils/storage';
import { calculateTimeState } from './utils/timeEngine';
import { audioSynthesizer } from './utils/audioSynthesizer';
import { CustomerSystem } from './utils/customerSystem';
import { generateStation, getRandomStationDistanceKm } from './utils/stationGenerator';
import { TrainCanvas } from './components/TrainCanvas';
import { HUD } from './components/HUD';
import { StationModal } from './components/StationModal';
import { CargoSheet } from './components/CargoSheet';
import { TimeSettingsModal } from './components/TimeSettingsModal';
import { WeatherModal } from './components/WeatherModal';
import { EmergencyModal } from './components/EmergencyModal';
import { StartScreen } from './components/StartScreen';
import { SaveLoadModal } from './components/SaveLoadModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // -------------------------------------------------------------
  // Initial State Loading
  // -------------------------------------------------------------
  const [saveData] = useState(() => loadGameSave());

  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(saveData.player_profile);
  const [stations, setStations] = useState<Station[]>(STATIONS);
  const [currentStationIndex, setCurrentStationIndex] = useState<number>(
    saveData.player_profile.current_station_index || 0
  );

  const [timeMode, setTimeMode] = useState<TimeSyncMode>(saveData.time_mode || 'REALTIME');
  const [manualHour, setManualHour] = useState<number>(saveData.manual_hour ?? 12);
  const [fastForwardSeconds, setFastForwardSeconds] = useState<number>(0);

  // Weather System State
  const [totalPlayTimeSeconds, setTotalPlayTimeSeconds] = useState<number>(
    saveData.total_playtime_seconds || 0
  );
  const [unlockedWeathers, setUnlockedWeathers] = useState<WeatherType[]>(
    saveData.unlocked_weathers && saveData.unlocked_weathers.length > 0
      ? saveData.unlocked_weathers
      : ['SUNNY']
  );
  const [activeWeather, setActiveWeather] = useState<WeatherType>(
    saveData.active_weather || 'SUNNY'
  );
  const [weatherMode, setWeatherMode] = useState<WeatherSelectionMode>(
    saveData.weather_mode || 'AUTO'
  );
  const [weatherUnlockToast, setWeatherUnlockToast] = useState<{
    name: string;
    icon: string;
    desc: string;
  } | null>(null);

  // Derive initial target distance (ngẫu nhiên trong bán kính 15km, ngắn nhất 3km)
  const initialNextStation = STATIONS[currentStationIndex + 1] || STATIONS[1];
  const initialCurrentStation = STATIONS[currentStationIndex] || STATIONS[0];
  const initialDistanceToNext = Math.max(
    3.0,
    Math.min(15.0, Number((initialNextStation.distance_from_start_km - initialCurrentStation.distance_from_start_km).toFixed(1)))
  );

  const [trainState, setTrainState] = useState<TrainState>(() => {
    const engCfg = ENGINE_CONFIGS[saveData.train_state.engine_level || 1];
    const hullCfg = HULL_CONFIGS[saveData.train_state.hull_level || 1];

    // Compute initial weight
    let initialWeight = 20; // Locomotive base
    saveData.train_state.car_list.forEach((c) => {
      const cfg = CAR_CONFIGS[c.car_type_id];
      initialWeight += cfg?.empty_weight_tons || 8;
      if (c.cargo_inventory) {
        Object.values(c.cargo_inventory).forEach((w) => {
          initialWeight += (Number(w) || 0) / 1000;
        });
      }
    });

    const isFirstTime = (saveData.player_profile.trips_completed || 0) === 0;

    return {
      engine_level: saveData.train_state.engine_level || 1,
      wheels_level: saveData.train_state.wheels_level || 1,
      hull_level: saveData.train_state.hull_level || 1,
      current_fuel: saveData.train_state.current_fuel ?? engCfg.max_fuel,
      max_fuel: engCfg.max_fuel,
      current_hp: saveData.train_state.current_hp ?? hullCfg.max_hp,
      max_hp: hullCfg.max_hp,
      speed_kmh: 0,
      target_speed_kmh: 0,
      throttle: 1.0, // Running by default
      car_list: saveData.train_state.car_list,
      is_at_station: isFirstTime,
      distance_to_next_station_km: initialDistanceToNext,
      total_weight_tons: initialWeight,
    };
  });

  const [stageStats, setStageStats] = useState<JourneyStats>(saveData.journey_stats);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Title Screen State (App starts at StartScreen)
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [showSaveLoadModal, setShowSaveLoadModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [saveLoadInitialTab, setSaveLoadInitialTab] = useState<'SAVE' | 'LOAD'>('LOAD');

  // Procedural Station and Customer System State
  const [runtimeStation, setRuntimeStation] = useState<RuntimeStationState>(() => {
    const initialStationNum = Math.max(1, (saveData.player_profile.trips_completed || 0) + 1);
    const isFirstTime = (saveData.player_profile.trips_completed || 0) === 0;
    return {
      active: true,
      x: isFirstTime ? 100 : 1280,
      dwell: 0,
      departing: false,
      number: initialStationNum,
      awarded: false,
      customers: CustomerSystem.create(4, initialStationNum),
    };
  });

  const [nextStationAtDistance, setNextStationAtDistance] = useState<number>(() => {
    return saveData.player_profile.current_distance_km + initialDistanceToNext;
  });

  // Modals - Station modal will be opened once player enters game if at origin
  const [showStationModal, setShowStationModal] = useState<boolean>(false);
  const [showCargoSheet, setShowCargoSheet] = useState<boolean>(false);
  const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
  const [showWeatherModal, setShowWeatherModal] = useState<boolean>(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);

  const lastTickTimeRef = useRef<number>(Date.now());

  // -------------------------------------------------------------
  // Current Station and Next Station pointers
  // -------------------------------------------------------------
  const currentStation = stations[currentStationIndex] || stations[0];
  const nextStation = stations[currentStationIndex + 1] || {
    station_id: `ST_${currentStationIndex + 2}`,
    station_name: `Trạm Tuyến Mới Km ${(currentStation.distance_from_start_km + 10).toFixed(1)}`,
    distance_from_start_km: Number((currentStation.distance_from_start_km + 10).toFixed(1)),
    market_prices: {
      potato: 8.0 + Math.random() * 8,
      egg: 16.0 + Math.random() * 12,
      bio_fuel: 10.0 + Math.random() * 10,
      passenger_ticket: 20.0 + Math.random() * 20,
    },
    fuel_refill_price_per_unit: 2.5 + Math.random() * 1.5,
    repair_price_per_hp: 2.0 + Math.random() * 1.0,
    description: 'Trạm ga trên tuyến đường sắt mới mở rộng.',
    biome: 'plains',
  };

  const stageTotalDistance = Math.max(1, nextStation.distance_from_start_km - currentStation.distance_from_start_km);
  const progressToNext = Math.max(0, Math.min(1, 1 - trainState.distance_to_next_station_km / stageTotalDistance));

  // Time & Weather state computation
  const timeState = calculateTimeState(
    timeMode,
    fastForwardSeconds,
    manualHour,
    activeWeather,
    unlockedWeathers,
    weatherMode,
    totalPlayTimeSeconds
  );

  // Synchronize active weather if weather mode is AUTO
  useEffect(() => {
    if (weatherMode === 'AUTO' && timeState.activeWeather !== activeWeather) {
      setActiveWeather(timeState.activeWeather);
    }
  }, [weatherMode, timeState.activeWeather, activeWeather]);

  // -------------------------------------------------------------
  // Calculate aggregated cargo metrics
  // -------------------------------------------------------------
  let totalCargoKg = 0;
  let maxCargoCapacityKg = 0;
  let totalPassengers = 0;

  trainState.car_list.forEach((car) => {
    if (car.car_type_id === 'STORAGE') {
      const cfg = CAR_CONFIGS['STORAGE'];
      maxCargoCapacityKg += cfg.max_capacity_kg;
      if (car.cargo_inventory) {
        Object.values(car.cargo_inventory).forEach((w) => {
          totalCargoKg += Number(w) || 0;
        });
      }
    }
    if (car.car_type_id === 'PASSENGER') {
      totalPassengers += car.passengers_count || 0;
    }
  });

  // -------------------------------------------------------------
  // Core Game Loop Simulation (Tick every 60ms)
  // -------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const dt = Math.min((now - lastTickTimeRef.current) / 1000, 0.5);
      lastTickTimeRef.current = now;

      // 1. Playtime accumulation & Weather Unlocking
      setTotalPlayTimeSeconds((prevPlayTime) => {
        const nextPlayTime = prevPlayTime + dt;

        // Check Playtime Unlocks (Every 2 hours = 7200s per tier)
        const earnedTierCount = Math.min(
          WEATHER_UNLOCK_ORDER.length,
          1 + Math.floor(nextPlayTime / 7200)
        );

        setUnlockedWeathers((prevUnlocked) => {
          let updatedUnlocked = [...prevUnlocked];
          let newlyUnlockedName: string | null = null;
          let newlyUnlockedIcon: string | null = null;
          let newlyUnlockedDesc: string | null = null;

          // Check standard 2-hour progressive unlocks
          for (let i = 0; i < earnedTierCount; i++) {
            const wType = WEATHER_UNLOCK_ORDER[i];
            if (!updatedUnlocked.includes(wType)) {
              updatedUnlocked.push(wType);
              const cfg = WEATHER_CONFIGS[wType];
              newlyUnlockedName = cfg.name;
              newlyUnlockedIcon = cfg.icon;
              newlyUnlockedDesc = cfg.description;
            }
          }

          // Check Special 9 PM (21:00) condition for Meteor Shower
          const currentRealHour = new Date().getHours();
          const isAt9PM = currentRealHour === 21 || manualHour === 21;
          if (isAt9PM && !updatedUnlocked.includes('METEOR_SHOWER')) {
            updatedUnlocked.push('METEOR_SHOWER');
            const cfg = WEATHER_CONFIGS['METEOR_SHOWER'];
            newlyUnlockedName = cfg.name;
            newlyUnlockedIcon = cfg.icon;
            newlyUnlockedDesc = 'Mở khóa đặc biệt khi lái tàu lúc 9 giờ tối!';
          }

          if (newlyUnlockedName) {
            audioSynthesizer.playChimeSuccess();
            setWeatherUnlockToast({
              name: newlyUnlockedName,
              icon: newlyUnlockedIcon || '✨',
              desc: newlyUnlockedDesc || 'Kiểu thời tiết mới đã sẵn sàng!',
            });
            setTimeout(() => setWeatherUnlockToast(null), 6000);
          }

          return updatedUnlocked;
        });

        return nextPlayTime;
      });

      // Update Fast-forward timer if enabled
      if (timeMode === 'FAST_FORWARD') {
        setFastForwardSeconds((prev) => prev + dt);
      }

      setTrainState((prev) => {
        // If at station, train is stationary
        if (prev.is_at_station) {
          return { ...prev, speed_kmh: 0 };
        }

        const engineCfg = ENGINE_CONFIGS[prev.engine_level];
        const wheelsCfg = WHEELS_CONFIGS[prev.wheels_level];
        const hullCfg = HULL_CONFIGS[prev.hull_level];

        // 1. Calculate weight
        let weight = 20; // Locomotive
        prev.car_list.forEach((c) => {
          const cfg = CAR_CONFIGS[c.car_type_id];
          weight += cfg?.empty_weight_tons || 8;
          if (c.cargo_inventory) {
            Object.values(c.cargo_inventory).forEach((w) => {
              weight += (Number(w) || 0) / 1000;
            });
          }
        });

        // 2. Weight load penalty (if weight > max_weight_tons)
        const weightRatio = Math.max(1, weight / engineCfg.max_weight_tons);
        const effectiveMaxSpeed = engineCfg.max_speed_kmh / (weightRatio > 1.2 ? 1.4 : 1.0);

        // Check if out of fuel or broken down
        const canRun = prev.current_fuel > 0.1 && prev.current_hp > 0 && prev.throttle > 0;

        // 3. Accelerate / Decelerate
        let newSpeed = prev.speed_kmh;
        if (canRun) {
          // Check if the train is currently departing and clearing the station platform
          const distFromStationKm = stageTotalDistance - prev.distance_to_next_station_km;
          const isClearingStation = distFromStationKm < 0.12; // First 120m alongside station platform
          const departureCrawlingSpeed = 16.0; // km/h steady platform departure rollout speed

          if (isClearingStation) {
            // Hold constant steady departure speed (~16 km/h) while moving along platform
            const targetDepartureSpeed = Math.min(departureCrawlingSpeed, effectiveMaxSpeed);
            const accel = 14.0;
            if (prev.speed_kmh < targetDepartureSpeed) {
              newSpeed = Math.min(targetDepartureSpeed, prev.speed_kmh + accel * dt);
            } else if (prev.speed_kmh > targetDepartureSpeed) {
              newSpeed = Math.max(targetDepartureSpeed, prev.speed_kmh - 8.0 * dt);
            } else {
              newSpeed = targetDepartureSpeed;
            }
          } else {
            // Once the station is completely passed, accelerate smoothly and progressively to cruising speed!
            const accel = wheelsCfg.acceleration;
            newSpeed = Math.min(effectiveMaxSpeed, prev.speed_kmh + accel * dt);
          }
        } else {
          // Coasting deceleration
          const decel = 8.0;
          newSpeed = Math.max(0, prev.speed_kmh - decel * dt);
        }

        // 4. Distance traveled in dt
        const distDeltaKm = (newSpeed / 3600) * dt;

        // 5. Fuel consumption & generation
        const efficiency = wheelsCfg.fuel_efficiency_bonus || 0;
        const fuelConsumed = engineCfg.fuel_consumption_per_km * (1 - efficiency) * distDeltaKm;
        let bonusFuel = 0;
        let bonusHp = 0;

        // 6. Hull wear: wear_rate_per_km * distDeltaKm
        const hpLost = hullCfg.wear_rate_per_km * distDeltaKm;

        // 7. Update Car Production & Harvesting
        const updatedCarList = prev.car_list.map((car) => {
          const cfg = CAR_CONFIGS[car.car_type_id];
          if (!cfg || cfg.harvest_time_sec <= 0) return car;

          let newTimer = car.growth_timer - dt;
          let newInventory = car.cargo_inventory ? { ...car.cargo_inventory } : undefined;
          let newPassengerCount = car.passengers_count;

          // When production timer finishes, produce goods into first storage car with space!
          if (newTimer <= 0 && newSpeed > 0) {
            newTimer = cfg.harvest_time_sec;

            if (car.car_type_id === 'GREENHOUSE_POTATO') {
              // Yield potato
              const outputItem = cfg.output_item_id || 'potato';
              const yieldAmount = cfg.output_amount_kg || 10;
              pushCargoToStorage(prev.car_list, outputItem, yieldAmount);
              audioSynthesizer.playHarvestSound();
            } else if (car.car_type_id === 'BARN_CHICKEN') {
              // Yield eggs & biofuel
              const eggItem = cfg.output_item_id || 'egg';
              const eggYield = cfg.output_amount_kg || 5;
              pushCargoToStorage(prev.car_list, eggItem, eggYield);

              if (cfg.secondary_output_item_id) {
                pushCargoToStorage(prev.car_list, cfg.secondary_output_item_id, cfg.secondary_output_amount || 2);
              }
              audioSynthesizer.playHarvestSound();
            } else if (car.car_type_id === 'PASSENGER') {
              // Pick up passengers along route
              const maxPassengers = cfg.max_capacity_kg || 20;
              const currentP = newPassengerCount || 0;
              if (currentP < maxPassengers) {
                newPassengerCount = Math.min(maxPassengers, currentP + (cfg.output_amount_kg || 2));
              }
            } else if (car.car_type_id === 'FUEL_GENERATOR') {
              bonusFuel += cfg.fuel_generation_rate || 0.5;
            } else if (car.car_type_id === 'MAINTENANCE') {
              bonusHp += cfg.repair_generation_rate || 0.3;
            }
          }

          return {
            ...car,
            growth_timer: Math.max(0, newTimer),
            cargo_inventory: newInventory,
            passengers_count: newPassengerCount,
          };
        });

        const newFuel = Math.min(prev.max_fuel, Math.max(0, prev.current_fuel - fuelConsumed + bonusFuel));
        const newHp = Math.min(prev.max_hp, Math.max(0, prev.current_hp - hpLost + bonusHp));

        // 8. Distance to next station
        const newDistToStation = prev.distance_to_next_station_km - distDeltaKm;

        // Check if arrived at next station
        if (newDistToStation <= 0) {
          audioSynthesizer.playStationBell();
          setShowStationModal(true);
          setRuntimeStation((st) => ({
            ...st,
            dwell: st.dwell + dt,
            awarded: true,
          }));

          return {
            ...prev,
            speed_kmh: 0,
            is_at_station: true,
            distance_to_next_station_km: 0,
            current_fuel: newFuel,
            current_hp: newHp,
            car_list: updatedCarList,
            total_weight_tons: weight,
          };
        }

        return {
          ...prev,
          speed_kmh: newSpeed,
          current_fuel: newFuel,
          current_hp: newHp,
          distance_to_next_station_km: newDistToStation,
          car_list: updatedCarList,
          total_weight_tons: weight,
        };
      });

      // Update Player Profile overall distance
      setPlayerProfile((prev) => ({
        ...prev,
        current_distance_km: prev.current_distance_km + (trainState.speed_kmh / 3600) * dt,
      }));
    }, 60);

    return () => clearInterval(interval);
  }, [timeMode, manualHour, trainState.speed_kmh, stations, currentStationIndex]);

  // Helper to push items to the first storage car with available capacity
  const pushCargoToStorage = (carList: typeof trainState.car_list, itemId: string, amount: number) => {
    for (const car of carList) {
      if (car.car_type_id === 'STORAGE') {
        if (!car.cargo_inventory) car.cargo_inventory = {};
        const currentCarWeight = Object.values(car.cargo_inventory).reduce<number>((sum, val) => sum + (Number(val) || 0), 0);
        const maxCap = CAR_CONFIGS['STORAGE'].max_capacity_kg;
        if (currentCarWeight + amount <= maxCap) {
          car.cargo_inventory[itemId] = (car.cargo_inventory[itemId] || 0) + amount;
          return;
        }
      }
    }
  };

  // -------------------------------------------------------------
  // Auto-Save Game State every 5 seconds
  // -------------------------------------------------------------
  useEffect(() => {
    const saveInterval = setInterval(() => {
      saveGameData({
        player_profile: {
          ...playerProfile,
          current_station_index: currentStationIndex,
        },
        train_state: {
          engine_level: trainState.engine_level,
          wheels_level: trainState.wheels_level,
          hull_level: trainState.hull_level,
          current_fuel: trainState.current_fuel,
          current_hp: trainState.current_hp,
          car_list: trainState.car_list,
        },
        current_station_id: currentStation.station_id,
        journey_stats: stageStats,
        time_mode: timeMode,
        manual_hour: manualHour,
        total_playtime_seconds: totalPlayTimeSeconds,
        unlocked_weathers: unlockedWeathers,
        active_weather: activeWeather,
        weather_mode: weatherMode,
      });
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [
    playerProfile,
    trainState,
    currentStationIndex,
    currentStation,
    stageStats,
    timeMode,
    manualHour,
    totalPlayTimeSeconds,
    unlockedWeathers,
    activeWeather,
    weatherMode,
  ]);

  // -------------------------------------------------------------
  // User Actions & Handlers
  // -------------------------------------------------------------
  const handleToggleMute = useCallback(() => {
    const muted = audioSynthesizer.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleToggleThrottle = useCallback(() => {
    setTrainState((prev) => {
      const nextThrottle = prev.throttle > 0 ? 0 : 1.0;
      if (nextThrottle > 0) {
        audioSynthesizer.playChuff(0.8);
      } else {
        audioSynthesizer.playSteamHiss();
      }
      return { ...prev, throttle: nextThrottle };
    });
  }, []);

  const handlePullWhistle = useCallback(() => {
    audioSynthesizer.playWhistle();
  }, []);

  // Station Trade: Sell all cargo and passenger tickets
  const handleSellAllCargo = useCallback(
    (payout: number, itemsSold: Record<string, number>, passengersServed: number) => {
      setPlayerProfile((prev) => ({
        ...prev,
        gold_balance: prev.gold_balance + payout,
        total_earnings: prev.total_earnings + payout,
        passengers_served: prev.passengers_served + passengersServed,
      }));

      // Clear storage inventories and passenger counts
      setTrainState((prev) => ({
        ...prev,
        car_list: prev.car_list.map((car) => {
          if (car.car_type_id === 'STORAGE') {
            return { ...car, cargo_inventory: {} };
          }
          if (car.car_type_id === 'PASSENGER') {
            return { ...car, passengers_count: 0 };
          }
          return car;
        }),
      }));

      setStageStats((prev) => ({
        ...prev,
        stage_gold_earned: payout,
        items_sold: itemsSold,
        passengers_transported: passengersServed,
      }));
    },
    []
  );

  // Station Service: Refuel
  const handleRefuel = useCallback((units: number, cost: number) => {
    setPlayerProfile((prev) => ({
      ...prev,
      gold_balance: Math.max(0, prev.gold_balance - cost),
    }));
    setTrainState((prev) => ({
      ...prev,
      current_fuel: Math.min(prev.max_fuel, prev.current_fuel + units),
    }));
  }, []);

  // Station Service: Repair Hull
  const handleRepair = useCallback((hp: number, cost: number) => {
    setPlayerProfile((prev) => ({
      ...prev,
      gold_balance: Math.max(0, prev.gold_balance - cost),
    }));
    setTrainState((prev) => ({
      ...prev,
      current_hp: Math.min(prev.max_hp, prev.current_hp + hp),
    }));
  }, []);

  // Station Shop: Upgrade Part (Engine, Wheels, Hull)
  const handleUpgradePart = useCallback(
    (partType: 'ENGINE' | 'WHEELS' | 'HULL', targetLevel: number, cost: number) => {
      setPlayerProfile((prev) => ({
        ...prev,
        gold_balance: Math.max(0, prev.gold_balance - cost),
      }));

      setTrainState((prev) => {
        if (partType === 'ENGINE') {
          const cfg = ENGINE_CONFIGS[targetLevel];
          return {
            ...prev,
            engine_level: targetLevel,
            max_fuel: cfg.max_fuel,
            current_fuel: Math.max(prev.current_fuel, cfg.max_fuel * 0.75),
          };
        } else if (partType === 'WHEELS') {
          return {
            ...prev,
            wheels_level: targetLevel,
          };
        } else {
          const cfg = HULL_CONFIGS[targetLevel];
          return {
            ...prev,
            hull_level: targetLevel,
            max_hp: cfg.max_hp,
            current_hp: cfg.max_hp,
          };
        }
      });
    },
    []
  );

  // Station Shop: Buy New Train Car
  const handleBuyCar = useCallback((carTypeId: CarTypeId, cost: number) => {
    setPlayerProfile((prev) => ({
      ...prev,
      gold_balance: Math.max(0, prev.gold_balance - cost),
    }));

    const cfg = CAR_CONFIGS[carTypeId];
    setTrainState((prev) => ({
      ...prev,
      car_list: [
        ...prev.car_list,
        {
          id: `car_${carTypeId}_${Date.now()}`,
          car_type_id: carTypeId,
          growth_timer: cfg.harvest_time_sec || 0,
          cargo_inventory: carTypeId === 'STORAGE' ? {} : undefined,
          passengers_count: carTypeId === 'PASSENGER' ? 0 : undefined,
        },
      ],
    }));
  }, []);

  // Station Shop: Remove/Dismantle Car
  const handleRemoveCar = useCallback((carIndex: number, refund: number) => {
    setPlayerProfile((prev) => ({
      ...prev,
      gold_balance: prev.gold_balance + refund,
    }));
    setTrainState((prev) => ({
      ...prev,
      car_list: prev.car_list.filter((_, idx) => idx !== carIndex),
    }));
  }, []);

  // Procedural Station Start logic provided by user:
  // start(distance, customerCount) {
  //   this.station = {
  //     active: true, x: this.gameWidth + 80, dwell: 0, departing: false,
  //     number: this.station.number + 1, awarded: false,
  //     customers: CustomerSystem.create(customerCount)
  //   };
  //   this.nextStationAt = distance + 2200 + Math.random() * 1600;
  // }
  const startNextStation = useCallback((distance: number, customerCount: number) => {
    const gameWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const nextNumber = runtimeStation.number + 1;
    const newCustomers = CustomerSystem.create(customerCount, nextNumber);

    setRuntimeStation({
      active: true,
      x: gameWidth + 80,
      dwell: 0,
      departing: false,
      number: nextNumber,
      awarded: false,
      customers: newCustomers,
    });

    // Khoảng cách trạm dừng chân ngẫu nhiên: ngắn nhất 3 km, dài nhất trong bán kính 15 km
    const stageDistKm = getRandomStationDistanceKm();
    const nextStationAtKm = Number((distance + stageDistKm).toFixed(1));

    setNextStationAtDistance(nextStationAtKm);

    // Procedural station metadata
    const generatedSt = generateStation(nextNumber, nextStationAtKm);
    setStations((prev) => {
      const list = [...prev];
      if (currentStationIndex + 1 < list.length) {
        list[currentStationIndex + 1] = generatedSt;
      } else {
        list.push(generatedSt);
      }
      return list;
    });

    setTrainState((prev) => ({
      ...prev,
      is_at_station: false,
      throttle: 1.0,
      distance_to_next_station_km: stageDistKm,
    }));

    return { nextStationAtKm, stageDistKm };
  }, [runtimeStation.number, currentStationIndex]);

  // Station Departure: Depart to next station
  const handleDepartStation = useCallback(() => {
    setShowStationModal(false);

    // Calculate customer count based on train passenger cars
    const passengerCarCount = trainState.car_list.filter((c) => c.car_type_id === 'PASSENGER').length;
    const customerCount = Math.max(3, Math.min(8, 2 + passengerCarCount * 3));

    // If departing from initial origin (Station 0) towards Station 1
    if (playerProfile.trips_completed === 0 && trainState.distance_to_next_station_km === initialDistanceToNext) {
      setTrainState((prev) => ({
        ...prev,
        is_at_station: false,
        throttle: 1.0,
        distance_to_next_station_km: initialDistanceToNext,
      }));
      return;
    }

    // Mark previous station departing
    setRuntimeStation((prev) => ({
      ...prev,
      departing: true,
    }));

    const nextIdx = currentStationIndex + 1;
    setCurrentStationIndex(nextIdx);

    setPlayerProfile((prev) => ({
      ...prev,
      trips_completed: prev.trips_completed + 1,
      current_station_index: nextIdx,
    }));

    // Trigger start(distance, customerCount)
    startNextStation(playerProfile.current_distance_km, customerCount);
  }, [
    currentStationIndex,
    trainState.car_list,
    trainState.distance_to_next_station_km,
    initialDistanceToNext,
    playerProfile.trips_completed,
    playerProfile.current_distance_km,
    startNextStation,
  ]);

  // Board single customer
  const handleBoardCustomer = useCallback((customer: Customer) => {
    let spaceFound = false;
    setTrainState((prev) => {
      let filled = false;
      const updatedList = prev.car_list.map((c) => {
        if (!filled && c.car_type_id === 'PASSENGER') {
          const cap = CAR_CONFIGS['PASSENGER']?.max_capacity_kg || 20;
          const cur = c.passengers_count || 0;
          if (cur < cap) {
            filled = true;
            spaceFound = true;
            return { ...c, passengers_count: cur + 1 };
          }
        }
        return c;
      });
      if (!filled) return prev;
      return { ...prev, car_list: updatedList };
    });

    if (spaceFound) {
      setRuntimeStation((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === customer.id ? { ...c, boarded: true } : c
        ),
      }));

      const fare = Math.round(customer.ticketPrice * customer.tipMultiplier);
      setPlayerProfile((prev) => ({
        ...prev,
        gold_balance: prev.gold_balance + fare,
        passengers_served: prev.passengers_served + 1,
      }));

      audioSynthesizer.playCoinSound();
    }
  }, []);

  // Board all waiting customers
  const handleBoardAllCustomers = useCallback(() => {
    const unboarded = runtimeStation.customers.filter((c) => !c.boarded);
    if (unboarded.length === 0) return;

    let totalFare = 0;
    let boardedCount = 0;
    const boardedIds = new Set<string>();

    setTrainState((prev) => {
      const updatedList = [...prev.car_list];
      for (const cust of unboarded) {
        let placed = false;
        for (let i = 0; i < updatedList.length; i++) {
          const car = updatedList[i];
          if (car.car_type_id === 'PASSENGER') {
            const cap = CAR_CONFIGS['PASSENGER']?.max_capacity_kg || 20;
            const cur = car.passengers_count || 0;
            if (cur < cap) {
              updatedList[i] = { ...car, passengers_count: cur + 1 };
              placed = true;
              boardedIds.add(cust.id);
              totalFare += Math.round(cust.ticketPrice * cust.tipMultiplier);
              boardedCount += 1;
              break;
            }
          }
        }
        if (!placed) break;
      }
      return { ...prev, car_list: updatedList };
    });

    if (boardedCount > 0) {
      setRuntimeStation((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          boardedIds.has(c.id) ? { ...c, boarded: true } : c
        ),
      }));

      setPlayerProfile((prev) => ({
        ...prev,
        gold_balance: prev.gold_balance + totalFare,
        passengers_served: prev.passengers_served + boardedCount,
      }));

      audioSynthesizer.playCoinSound();
    }
  }, [runtimeStation.customers]);

  // Emergency Rescue
  const handleEmergencyRescue = useCallback((fuelGranted: number, hpGranted: number, cost: number) => {
    setPlayerProfile((prev) => ({
      ...prev,
      gold_balance: Math.max(0, prev.gold_balance - cost),
    }));
    setTrainState((prev) => ({
      ...prev,
      current_fuel: Math.min(prev.max_fuel, prev.current_fuel + fuelGranted),
      current_hp: Math.min(prev.max_hp, prev.current_hp + hpGranted),
      throttle: 1.0,
    }));
    setShowEmergencyModal(false);
  }, []);

  // Save / Load handlers
  const handleLoadSave = useCallback((data: SaveData) => {
    setPlayerProfile(data.player_profile);
    const stationIdx = data.player_profile.current_station_index || 0;
    setCurrentStationIndex(stationIdx);
    setTimeMode(data.time_mode || 'REALTIME');
    setManualHour(data.manual_hour ?? 12);
    setTotalPlayTimeSeconds(data.total_playtime_seconds || 0);
    if (data.unlocked_weathers && data.unlocked_weathers.length > 0) {
      setUnlockedWeathers(data.unlocked_weathers);
    }
    if (data.active_weather) {
      setActiveWeather(data.active_weather);
    }
    if (data.weather_mode) {
      setWeatherMode(data.weather_mode);
    }
    setStageStats(data.journey_stats);

    const engCfg = ENGINE_CONFIGS[data.train_state.engine_level || 1];
    const hullCfg = HULL_CONFIGS[data.train_state.hull_level || 1];

    let weight = 20;
    data.train_state.car_list.forEach((c) => {
      const cfg = CAR_CONFIGS[c.car_type_id];
      weight += cfg?.empty_weight_tons || 8;
      if (c.cargo_inventory) {
        Object.values(c.cargo_inventory).forEach((w) => {
          weight += (Number(w) || 0) / 1000;
        });
      }
    });

    const currSt = stations[stationIdx] || stations[0];
    const nxtSt = stations[stationIdx + 1] || stations[1] || currSt;
    const distNext = Math.max(1, nxtSt.distance_from_start_km - currSt.distance_from_start_km);
    const isFirstTime = (data.player_profile.trips_completed || 0) === 0;

    setTrainState({
      engine_level: data.train_state.engine_level || 1,
      wheels_level: data.train_state.wheels_level || 1,
      hull_level: data.train_state.hull_level || 1,
      current_fuel: data.train_state.current_fuel ?? engCfg.max_fuel,
      max_fuel: engCfg.max_fuel,
      current_hp: data.train_state.current_hp ?? hullCfg.max_hp,
      max_hp: hullCfg.max_hp,
      speed_kmh: 0,
      target_speed_kmh: 0,
      throttle: 1.0,
      car_list: data.train_state.car_list,
      is_at_station: isFirstTime,
      distance_to_next_station_km: distNext,
      total_weight_tons: weight,
    });

    const stNum = Math.max(1, (data.player_profile.trips_completed || 0) + 1);
    setRuntimeStation({
      active: true,
      x: isFirstTime ? 100 : 1280,
      dwell: 0,
      departing: false,
      number: stNum,
      awarded: false,
      customers: CustomerSystem.create(4, stNum),
    });
  }, [stations]);

  const handleNewGame = useCallback(() => {
    const def = resetGameSave();
    handleLoadSave(def);
  }, [handleLoadSave]);

  const handleStartGame = useCallback(() => {
    setIsGameStarted(true);
    if (playerProfile.trips_completed === 0 && trainState.is_at_station) {
      setShowStationModal(true);
    }
  }, [playerProfile.trips_completed, trainState.is_at_station]);

  const currentSaveData: SaveData = {
    player_profile: {
      ...playerProfile,
      current_station_index: currentStationIndex,
    },
    train_state: {
      engine_level: trainState.engine_level,
      wheels_level: trainState.wheels_level,
      hull_level: trainState.hull_level,
      current_fuel: trainState.current_fuel,
      current_hp: trainState.current_hp,
      car_list: trainState.car_list,
    },
    current_station_id: currentStation.station_id,
    journey_stats: stageStats,
    time_mode: timeMode,
    manual_hour: manualHour,
    total_playtime_seconds: totalPlayTimeSeconds,
    unlocked_weathers: unlockedWeathers,
    active_weather: activeWeather,
    weather_mode: weatherMode,
  };

  const isAtInitialOrigin =
    playerProfile.trips_completed === 0 && trainState.distance_to_next_station_km === initialDistanceToNext;

  // Background train presentation: when on StartScreen, keep train animated and running
  const visualTrainState: TrainState = !isGameStarted
    ? {
        ...trainState,
        speed_kmh: Math.max(38, trainState.speed_kmh),
        throttle: 1.0,
        is_at_station: false,
      }
    : trainState;

  return (
    <div className="relative w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. TOP HUD (Header & Gauges) - Only visible when inside active game */}
      {isGameStarted && (
        <HUD
          playerProfile={playerProfile}
          trainState={trainState}
          timeState={timeState}
          currentStation={currentStation}
          nextStation={nextStation}
          totalCargoKg={totalCargoKg}
          maxCargoCapacityKg={maxCargoCapacityKg}
          totalPassengers={totalPassengers}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenCargo={() => setShowCargoSheet(true)}
          onOpenTimeModal={() => setShowTimeModal(true)}
          onOpenWeatherModal={() => setShowWeatherModal(true)}
          onOpenSaveLoad={() => {
            setSaveLoadInitialTab('SAVE');
            setShowSaveLoadModal(true);
          }}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenMenu={() => setIsGameStarted(false)}
          onToggleThrottle={handleToggleThrottle}
          onPullWhistle={handlePullWhistle}
          onEmergencyCall={() => setShowEmergencyModal(true)}
        />
      )}

      {/* 2. MAIN VIEWPORT: PARALLAX TRAIN CANVAS */}
      <main className="flex-1 relative w-full h-full min-h-0 overflow-hidden">
        <TrainCanvas
          trainState={visualTrainState}
          timeState={timeState}
          currentStation={currentStation}
          nextStation={nextStation}
          progressToNext={progressToNext}
          runtimeStation={runtimeStation}
          onPullWhistle={handlePullWhistle}
          onOpenWeatherModal={() => setShowWeatherModal(true)}
        />

        {/* Start Screen Overlay (Title Screen) with Moving Train & Buttons Play, Save/Load, Settings */}
        {!isGameStarted && (
          <StartScreen
            playerProfile={playerProfile}
            trainState={trainState}
            timeState={timeState}
            currentStation={currentStation}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onPlayGame={handleStartGame}
            onOpenSaveLoad={() => {
              setSaveLoadInitialTab('LOAD');
              setShowSaveLoadModal(true);
            }}
            onOpenSettings={() => setShowSettingsModal(true)}
            onNewGame={handleNewGame}
          />
        )}

        {/* Dynamic Weather Unlock Toast Banner */}
        {weatherUnlockToast && isGameStarted && (
          <div
            id="weather-unlock-toast"
            className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border-2 border-amber-400/80 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3.5 animate-bounce max-w-md pointer-events-auto"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl">
              {weatherUnlockToast.icon}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                  🎉 MỞ KHÓA THỜI TIẾT MỚI!
                </span>
              </div>
              <span className="text-sm font-bold text-slate-100">{weatherUnlockToast.name}</span>
              <span className="text-xs text-slate-300">{weatherUnlockToast.desc}</span>
            </div>
            <button
              onClick={() => {
                setWeatherUnlockToast(null);
                setShowWeatherModal(true);
              }}
              className="ml-auto bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition active:scale-95"
            >
              Xem ngay
            </button>
          </div>
        )}
      </main>

      {/* 3. MODALS & POPUPS */}
      {/* Save / Load Manager Modal */}
      {showSaveLoadModal && (
        <SaveLoadModal
          isOpen={showSaveLoadModal}
          currentSaveData={currentSaveData}
          onLoadSave={handleLoadSave}
          onClose={() => setShowSaveLoadModal(false)}
          onNewGame={handleNewGame}
          initialTab={saveLoadInitialTab}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          timeState={timeState}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onSetTimeMode={(mode) => setTimeMode(mode)}
          onSetManualHour={(h) => setManualHour(h)}
          onSelectWeather={(w) => setActiveWeather(w)}
          onSetWeatherMode={(m) => setWeatherMode(m)}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Station Modal (Only when in game) */}
      {isGameStarted && showStationModal && (
        <StationModal
          station={isAtInitialOrigin ? currentStation : nextStation}
          nextStation={isAtInitialOrigin ? nextStation : stations[currentStationIndex + 2] || nextStation}
          stageDistanceKm={isAtInitialOrigin ? 0 : stageTotalDistance}
          playerProfile={playerProfile}
          trainState={trainState}
          runtimeStation={runtimeStation}
          onBoardCustomer={handleBoardCustomer}
          onBoardAllCustomers={handleBoardAllCustomers}
          onSellAllCargo={handleSellAllCargo}
          onRefuel={handleRefuel}
          onRepair={handleRepair}
          onUpgradePart={handleUpgradePart}
          onBuyCar={handleBuyCar}
          onRemoveCar={handleRemoveCar}
          onDepartStation={handleDepartStation}
        />
      )}

      {/* Cargo Inspection Sheet Drawer */}
      {isGameStarted && showCargoSheet && (
        <CargoSheet
          trainState={trainState}
          onClose={() => setShowCargoSheet(false)}
        />
      )}

      {/* Real-Time Sync & Day/Night Settings Modal */}
      {showTimeModal && (
        <TimeSettingsModal
          timeState={timeState}
          onSetTimeMode={(mode) => setTimeMode(mode)}
          onSetManualHour={(h) => setManualHour(h)}
          onClose={() => setShowTimeModal(false)}
        />
      )}

      {/* Weather System Customization Modal */}
      {showWeatherModal && (
        <WeatherModal
          isOpen={showWeatherModal}
          timeState={timeState}
          onSelectWeather={(w) => setActiveWeather(w)}
          onToggleWeatherMode={(m) => setWeatherMode(m)}
          onUnlockAllWeathersForTesting={() => {
            setUnlockedWeathers(['SUNNY', 'CLOUDY', 'RAINY', 'THUNDERSTORM', 'COLD', 'FOGGY', 'METEOR_SHOWER']);
          }}
          onClose={() => setShowWeatherModal(false)}
        />
      )}

      {/* Emergency Breakdown / Rescue Modal */}
      {isGameStarted && showEmergencyModal && (
        <EmergencyModal
          trainState={trainState}
          playerProfile={playerProfile}
          onEmergencyRescue={handleEmergencyRescue}
          onClose={() => setShowEmergencyModal(false)}
        />
      )}
    </div>
  );
}
