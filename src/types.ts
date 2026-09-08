export type PartType = 'ENGINE' | 'WHEELS' | 'HULL';

export interface EngineConfig {
  level: number;
  name: string;
  cost_gold: number;
  max_speed_kmh: number;
  max_weight_tons: number;
  max_fuel: number;
  fuel_consumption_per_km: number;
  description: string;
}

export interface WheelsConfig {
  level: number;
  name: string;
  cost_gold: number;
  friction_coefficient: number;
  acceleration: number; // km/h/s
  fuel_efficiency_bonus: number; // e.g. 0.1 for 10%
  description: string;
}

export interface HullConfig {
  level: number;
  name: string;
  cost_gold: number;
  max_hp: number;
  wear_rate_per_km: number; // HP lost per km (e.g. 0.5 for 1 HP per 2km)
  weather_resistance: number; // e.g. 0.3 for 30%
  description: string;
}

export type CarTypeId =
  | 'GREENHOUSE_POTATO'
  | 'BARN_CHICKEN'
  | 'STORAGE'
  | 'FUEL_GENERATOR'
  | 'MAINTENANCE'
  | 'PASSENGER'
  | 'RESTAURANT';

export interface CarConfig {
  car_type_id: CarTypeId;
  category: 'PRODUCE_STORAGE' | 'SUPPORT_FUNCTION' | 'PASSENGER_SERVICE';
  name: string;
  description: string;
  empty_weight_tons: number;
  max_capacity_kg: number;
  harvest_time_sec: number;
  output_item_id?: string;
  output_amount_kg?: number;
  secondary_output_item_id?: string;
  secondary_output_amount?: number;
  fuel_generation_rate?: number; // Fuel generated per cycle
  repair_generation_rate?: number; // HP repaired per cycle
  tip_bonus_percent?: number; // e.g. 0.5 for +50% tip
  buy_cost_gold: number;
}

export interface ItemConfig {
  item_id: string;
  name: string;
  icon: string;
  unit: string;
  base_price: number;
}

export interface CarState {
  id: string;
  car_type_id: CarTypeId;
  growth_timer: number; // seconds remaining until harvest
  cargo_inventory?: Record<string, number>; // item_id -> weight_kg
  passengers_count?: number; // for PASSENGER car
}

export interface Customer {
  id: string;
  name: string;
  role: string;
  avatar: string;
  coatColor: string;
  hat: boolean;
  ticketPrice: number;
  luggageKg: number;
  tipMultiplier: number;
  boarded?: boolean;
  waving?: boolean;
}

export interface RuntimeStationState {
  active: boolean;
  x: number;
  dwell: number;
  departing: boolean;
  number: number;
  awarded: boolean;
  customers: Customer[];
}

export interface Station {
  station_id: string;
  station_name: string;
  station_number?: number;
  distance_from_start_km: number;
  market_prices: Record<string, number>; // item_id -> price_per_unit
  fuel_refill_price_per_unit: number;
  repair_price_per_hp: number;
  description: string;
  biome: 'plains' | 'mountains' | 'snow' | 'forest' | 'coastal' | 'city';
}

export interface PlayerProfile {
  player_id: string;
  gold_balance: number;
  current_distance_km: number;
  current_station_index: number;
  total_earnings: number;
  trips_completed: number;
  passengers_served: number;
  created_at: string;
}

export interface TrainState {
  engine_level: number;
  wheels_level: number;
  hull_level: number;
  current_fuel: number;
  max_fuel: number;
  current_hp: number;
  max_hp: number;
  speed_kmh: number;
  target_speed_kmh: number;
  throttle: number; // 0 to 1
  car_list: CarState[];
  is_at_station: boolean;
  distance_to_next_station_km: number;
  total_weight_tons: number;
}

export type TimeSyncMode = 'REALTIME' | 'FAST_FORWARD' | 'MANUAL';

export type DayPhase = 'DAWN' | 'DAY' | 'SUNSET' | 'NIGHT';

export type WeatherType =
  | 'SUNNY'
  | 'CLOUDY'
  | 'RAINY'
  | 'THUNDERSTORM'
  | 'COLD'
  | 'FOGGY'
  | 'METEOR_SHOWER';

export type WeatherSelectionMode = 'AUTO' | 'CUSTOM';

export interface WeatherConfig {
  id: WeatherType;
  name: string;
  vietnamese_title: string;
  icon: string;
  description: string;
  temperature_celsius: string;
  humidity_percent: number;
  visibility: string;
  wind_speed_kmh: number;
  unlock_hours_required: number; // e.g. 0, 2, 4, 6, 8, 10
  special_condition?: string;
  is_special?: boolean;
}

export interface TimeState {
  mode: TimeSyncMode;
  hour: number;
  minute: number;
  second: number;
  displayTime: string;
  dayPhase: DayPhase;
  phaseProgress: number; // 0 to 1 within current phase
  sunPosition: { x: number; y: number }; // normalized 0 to 1
  moonPosition: { x: number; y: number };
  ambientColor: string;
  ambientBrightness: number;
  isNight: boolean;
  activeWeather: WeatherType;
  unlockedWeathers: WeatherType[];
  weatherMode: 'AUTO' | 'CUSTOM';
  totalPlayTimeSeconds: number;
}

export interface JourneyStats {
  stage_distance_km: number;
  stage_gold_earned: number;
  items_sold: Record<string, number>;
  passengers_transported: number;
  fuel_spent: number;
  hp_lost: number;
}

export interface SaveData {
  player_profile: PlayerProfile;
  train_state: {
    engine_level: number;
    wheels_level: number;
    hull_level: number;
    current_fuel: number;
    current_hp: number;
    car_list: CarState[];
  };
  current_station_id: string;
  journey_stats: JourneyStats;
  time_mode: TimeSyncMode;
  manual_hour?: number;
  total_playtime_seconds?: number;
  unlocked_weathers?: WeatherType[];
  active_weather?: WeatherType;
  weather_mode?: 'AUTO' | 'CUSTOM';
}
