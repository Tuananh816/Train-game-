import { SaveData, PlayerProfile, CarState, JourneyStats, TimeSyncMode } from '../types';
import { INITIAL_PLAYER_PROFILE, INITIAL_CAR_LIST, STATIONS } from '../data/gameConfig';

const SAVE_STORAGE_KEY = 'TRAIN_WORLD_SAVE_V2';

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

export function resetGameSave(): SaveData {
  const def = getDefaultSaveData();
  saveGameData(def);
  return def;
}
