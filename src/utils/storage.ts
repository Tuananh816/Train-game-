import { SaveData, PlayerProfile, CarState, JourneyStats, TimeSyncMode } from '../types';
import { INITIAL_PLAYER_PROFILE, INITIAL_CAR_LIST, STATIONS } from '../data/gameConfig';

const SAVE_STORAGE_KEY = 'TRAIN_WORLD_SAVE_V2';
const SLOT_STORAGE_PREFIX = 'TRAIN_WORLD_SLOT_';

export interface SaveSlotInfo {
  id: string;
  name: string;
  isAutosave: boolean;
  isEmpty: boolean;
  timestamp?: string;
  stationName?: string;
  gold?: number;
  distanceKm?: number;
  engineLevel?: number;
  carCount?: number;
}

export function getDefaultSaveData(): SaveData {
  return {
    player_profile: { ...INITIAL_PLAYER_PROFILE },
    train_state: {
      engine_level: 1,
      wheels_level: 1,
      hull_level: 1,
      current_fuel: 100.0,
      current_hp: 100,
      car_list: JSON.parse(JSON.stringify(INITIAL_CAR_LIST)),
    },
    current_station_id: STATIONS[0].station_id,
    journey_stats: {
      stage_distance_km: 0,
      stage_gold_earned: 0,
      items_sold: {},
      passengers_transported: 0,
      fuel_spent: 0,
      hp_lost: 0,
    },
    time_mode: 'REALTIME',
    manual_hour: 12,
    total_playtime_seconds: 0,
    unlocked_weathers: ['SUNNY'],
    active_weather: 'SUNNY',
    weather_mode: 'AUTO',
  };
}

export function loadGameSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return getDefaultSaveData();
    const data = JSON.parse(raw) as SaveData;
    if (!data.player_profile || !data.train_state || !data.train_state.car_list) {
      return getDefaultSaveData();
    }
    // If player is at origin (0 trips and <= 0.05 km) but has old cars from previous versions, ensure 1 car
    if (
      (data.player_profile.trips_completed || 0) === 0 &&
      (data.player_profile.current_distance_km || 0) <= 0.05 &&
      data.train_state.car_list.length > 1
    ) {
      data.train_state.car_list = JSON.parse(JSON.stringify(INITIAL_CAR_LIST));
      saveGameData(data);
    }
    return data;
  } catch (err) {
    console.warn('Failed to load save data from localStorage, using default:', err);
    return getDefaultSaveData();
  }
}

export function saveGameData(data: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Failed to save game data:', err);
    return false;
  }
}

export function hasExistingSave(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as SaveData;
    return (
      (parsed.player_profile?.current_distance_km || 0) > 0.05 ||
      (parsed.player_profile?.gold_balance || 0) !== INITIAL_PLAYER_PROFILE.gold_balance ||
      (parsed.player_profile?.trips_completed || 0) > 0
    );
  } catch {
    return false;
  }
}

export function resetGameSave(): SaveData {
  const def = getDefaultSaveData();
  saveGameData(def);
  return def;
}

// -------------------------------------------------------------
// Multi-slot management and JSON Backup
// -------------------------------------------------------------
export const DEFAULT_SLOTS = [
  { id: 'autosave', name: 'Tự Động Lưu (Auto-Save)', isAutosave: true },
  { id: 'slot_1', name: 'Khe Lưu 1 (Slot 1)', isAutosave: false },
  { id: 'slot_2', name: 'Khe Lưu 2 (Slot 2)', isAutosave: false },
  { id: 'slot_3', name: 'Khe Lưu 3 (Slot 3)', isAutosave: false },
];

export function getSaveSlots(): SaveSlotInfo[] {
  return DEFAULT_SLOTS.map((slot) => {
    try {
      const storageKey = slot.isAutosave ? SAVE_STORAGE_KEY : `${SLOT_STORAGE_PREFIX}${slot.id}`;
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return {
          id: slot.id,
          name: slot.name,
          isAutosave: slot.isAutosave,
          isEmpty: true,
        };
      }

      const parsed = JSON.parse(raw) as SaveData & { saved_at?: string };
      const station = STATIONS.find((s) => s.station_id === parsed.current_station_id) || STATIONS[0];

      return {
        id: slot.id,
        name: slot.name,
        isAutosave: slot.isAutosave,
        isEmpty: false,
        timestamp: parsed.saved_at || new Date().toLocaleString('vi-VN'),
        stationName: station.station_name,
        gold: Math.floor(parsed.player_profile?.gold_balance || 0),
        distanceKm: Number((parsed.player_profile?.current_distance_km || 0).toFixed(1)),
        engineLevel: parsed.train_state?.engine_level || 1,
        carCount: parsed.train_state?.car_list?.length || 0,
      };
    } catch {
      return {
        id: slot.id,
        name: slot.name,
        isAutosave: slot.isAutosave,
        isEmpty: true,
      };
    }
  });
}

export function saveToSlot(slotId: string, data: SaveData): boolean {
  try {
    const isAutosave = slotId === 'autosave';
    const storageKey = isAutosave ? SAVE_STORAGE_KEY : `${SLOT_STORAGE_PREFIX}${slotId}`;
    const payload = {
      ...data,
      saved_at: new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
    // Also sync to active auto-save if saving directly to active
    if (isAutosave) {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
    }
    return true;
  } catch (err) {
    console.error('Failed to save to slot:', err);
    return false;
  }
}

export function loadFromSlot(slotId: string): SaveData | null {
  try {
    const isAutosave = slotId === 'autosave';
    const storageKey = isAutosave ? SAVE_STORAGE_KEY : `${SLOT_STORAGE_PREFIX}${slotId}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveData;
    if (!parsed.player_profile || !parsed.train_state) return null;
    return parsed;
  } catch (err) {
    console.error('Failed to load from slot:', err);
    return null;
  }
}

export function deleteSlot(slotId: string): boolean {
  try {
    if (slotId === 'autosave') {
      resetGameSave();
      return true;
    }
    localStorage.removeItem(`${SLOT_STORAGE_PREFIX}${slotId}`);
    return true;
  } catch {
    return false;
  }
}

export function exportSaveDataJSON(data: SaveData): string {
  return JSON.stringify(
    {
      app: 'TrainWorld',
      version: '2.0',
      exported_at: new Date().toISOString(),
      data,
    },
    null,
    2
  );
}

export function importSaveDataJSON(jsonStr: string): SaveData | null {
  try {
    const parsed = JSON.parse(jsonStr);
    const data: SaveData = parsed.data || parsed;
    if (!data.player_profile || !data.train_state || !data.train_state.car_list) {
      return null;
    }
    return data;
  } catch (err) {
    console.error('Failed to parse imported save JSON:', err);
    return null;
  }
}

