import { EngineConfig, WheelsConfig, HullConfig, CarConfig, ItemConfig, Station, CarTypeId } from './types';

export const ENGINE_CONFIGS: Record<number, EngineConfig> = {
  1: {
    level: 1,
    name: 'Động cơ Hơi nước Cổ',
    cost_gold: 0,
    max_speed_kmh: 40,
    max_weight_tons: 150,
    max_fuel: 100,
    fuel_consumption_per_km: 1.5,
    description: 'Đầu máy hơi nước cổ điển sử dụng than đá, sức kéo cơ bản cho đoàn tàu nông trang.',
  },
  2: {
    level: 2,
    name: 'Động cơ Sinh học Mê-tan',
    cost_gold: 1200,
    max_speed_kmh: 80,
    max_weight_tons: 350,
    max_fuel: 250,
    fuel_consumption_per_km: 0.8,
    description: 'Động cơ hiện đại đốt khí sinh học từ chất thải nông trại, tiết kiệm 46% nhiên liệu.',
  },
  3: {
    level: 3,
    name: 'Động cơ Từ tính Cao cấp',
    cost_gold: 3500,
    max_speed_kmh: 150,
    max_weight_tons: 800,
    max_fuel: 600,
    fuel_consumption_per_km: 0.4,
    description: 'Công nghệ đầu máy điện từ siêu dẫn, sức kéo khổng lồ có thể kéo hơn 15 toa xe!',
  },
};

export const WHEELS_CONFIGS: Record<number, WheelsConfig> = {
  1: {
    level: 1,
    name: 'Bánh xe Thép Thô',
    cost_gold: 0,
    friction_coefficient: 0.05,
    acceleration: 4.5, // km/h/s (Khởi hành dứt khoát, đạt tốc độ hành trình trong 8-9s)
    fuel_efficiency_bonus: 0,
    description: 'Bánh xe thép đúc tiêu chuẩn trên đường ray.',
  },
  2: {
    level: 2,
    name: 'Bánh xe Giảm Chấn',
    cost_gold: 800,
    friction_coefficient: 0.02,
    acceleration: 7.5,
    fuel_efficiency_bonus: 0.1, // giảm 10% tiêu thụ nhiên liệu
    description: 'Hệ thống giảm xóc khí nén, chạy êm ái, giảm rung lắc hàng hóa và tiết kiệm 10% nhiên liệu.',
  },
  3: {
    level: 3,
    name: 'Bánh xe Đệm Từ',
    cost_gold: 2500,
    friction_coefficient: 0.005,
    acceleration: 14.0,
    fuel_efficiency_bonus: 0.25, // giảm 25% tiêu thụ nhiên liệu
    description: 'Hệ thống từ trường nâng giảm tối đa ma sát, bứt tốc cực nhanh và tiết kiệm 25% nhiên liệu.',
  },
};

export const HULL_CONFIGS: Record<number, HullConfig> = {
  1: {
    level: 1,
    name: 'Vỏ Gỗ / Sắt Gia Cường',
    cost_gold: 0,
    max_hp: 100,
    wear_rate_per_km: 0.5, // 1 HP / 2 km
    weather_resistance: 0,
    description: 'Khung gỗ bọc thép bảo vệ thân tàu cơ bản.',
  },
  2: {
    level: 2,
    name: 'Vỏ Hợp Kim Thép',
    cost_gold: 900,
    max_hp: 300,
    wear_rate_per_km: 0.2, // 1 HP / 5 km
    weather_resistance: 0.3, // giảm 30% sát thương thời tiết
    description: 'Thân tàu tôi luyện bằng hợp kim thép chịu lực, bền bỉ gấp 3 lần.',
  },
  3: {
    level: 3,
    name: 'Vỏ Titan Cường Lực',
    cost_gold: 2800,
    max_hp: 1000,
    wear_rate_per_km: 0.0667, // 1 HP / 15 km
    weather_resistance: 0.8, // kháng 80% thời tiết
    description: 'Lớp giáp Titan siêu nhẹ và siêu bền, gần như không bị hao mòn trên đường dài.',
  },
};

export const CAR_CONFIGS: Record<CarTypeId, CarConfig> = {
  GREENHOUSE_POTATO: {
    car_type_id: 'GREENHOUSE_POTATO',
    category: 'PRODUCE_STORAGE',
    name: 'Toa Trồng Trọt (Nhà Kính)',
    description: 'Nhà kính tự động tưới tiêu và thu hoạch khoai tây hữu cơ khi tàu đang chạy trên ray.',
    empty_weight_tons: 8,
    max_capacity_kg: 500,
    harvest_time_sec: 15, // 15s mỗi mẻ
    output_item_id: 'potato',
    output_amount_kg: 10,
    buy_cost_gold: 800,
  },
  BARN_CHICKEN: {
    car_type_id: 'BARN_CHICKEN',
    category: 'PRODUCE_STORAGE',
    name: 'Toa Chăn Nuôi (Chuồng Gà)',
    description: 'Toa chuồng trại sinh thái thu hoạch trứng gà tươi và phụ phẩm Nhiên liệu sinh học.',
    empty_weight_tons: 10,
    max_capacity_kg: 400,
    harvest_time_sec: 20, // 20s mỗi mẻ
    output_item_id: 'egg',
    output_amount_kg: 5,
    secondary_output_item_id: 'bio_fuel',
    secondary_output_amount: 2,
    buy_cost_gold: 1200,
  },
  STORAGE: {
    car_type_id: 'STORAGE',
    category: 'PRODUCE_STORAGE',
    name: 'Toa Kho Chứa Đa Năng',
    description: 'Khoang bảo quản nông sản chuyên dụng với sức chứa lên tới 2,000 kg (2 Tấn).',
    empty_weight_tons: 6,
    max_capacity_kg: 2000,
    harvest_time_sec: 0,
    buy_cost_gold: 500,
  },
  FUEL_GENERATOR: {
    car_type_id: 'FUEL_GENERATOR',
    category: 'SUPPORT_FUNCTION',
    name: 'Toa Máy Phát Nhiên Liệu',
    description: 'Bộ phát điện & ngưng tụ nhiên liệu tự động tạo thêm +0.5 Nhiên liệu mỗi 5 giây khi tàu chạy.',
    empty_weight_tons: 12,
    max_capacity_kg: 0,
    harvest_time_sec: 5, // 5s mỗi chu kỳ sinh Fuel
    fuel_generation_rate: 0.5,
    buy_cost_gold: 1800,
  },
  MAINTENANCE: {
    car_type_id: 'MAINTENANCE',
    category: 'SUPPORT_FUNCTION',
    name: 'Toa Bảo Trì & Sửa Chữa',
    description: 'Xưởng cơ khí di động với cánh tay robot tự động hàn vá, phục hồi +0.3 HP mỗi 5 giây khi tàu chạy.',
    empty_weight_tons: 14,
    max_capacity_kg: 0,
    harvest_time_sec: 5, // 5s mỗi chu kỳ hồi HP
    repair_generation_rate: 0.3,
    buy_cost_gold: 2000,
  },
  PASSENGER: {
    car_type_id: 'PASSENGER',
    category: 'PASSENGER_SERVICE',
    name: 'Toa Chở Khách Thường',
    description: 'Toa hành khách tiện nghi ngắm cảnh dọc tuyến đường, đón khách để thu tiền vé chặng tại nhà ga.',
    empty_weight_tons: 12,
    max_capacity_kg: 20, // 20 hành khách
    harvest_time_sec: 12, // 12s đón 1 đợt khách
    output_item_id: 'passenger_ticket',
    output_amount_kg: 2,
    buy_cost_gold: 1500,
  },
  RESTAURANT: {
    car_type_id: 'RESTAURANT',
    category: 'PASSENGER_SERVICE',
    name: 'Toa Nhà Hàng / Giải Trí',
    description: 'Toa ẩm thực cao cấp phục vụ đồ ăn thức uống cho hành khách, tăng +50% tiền Tip tại mỗi trạm dừng!',
    empty_weight_tons: 15,
    max_capacity_kg: 0,
    harvest_time_sec: 0,
    tip_bonus_percent: 0.5, // +50% tip trên tiền vé
    buy_cost_gold: 2200,
  },
};

export const ITEMS: Record<string, ItemConfig> = {
  potato: {
    item_id: 'potato',
    name: 'Khoai Tây Nông Trường',
    icon: '🥔',
    unit: 'kg',
    base_price: 5.0,
  },
  egg: {
    item_id: 'egg',
    name: 'Trứng Gà Tươi',
    icon: '🥚',
    unit: 'kg',
    base_price: 12.0,
  },
  bio_fuel: {
    item_id: 'bio_fuel',
    name: 'Nhiên Liệu Sinh Học',
    icon: '🧪',
    unit: 'bình',
    base_price: 8.0,
  },
  passenger_ticket: {
    item_id: 'passenger_ticket',
    name: 'Vé Hành Khách',
    icon: '🎫',
    unit: 'vé',
    base_price: 15.0,
  },
};

export const STATIONS: Station[] = [
  {
    station_id: 'ST_001',
    station_name: 'Trạm Dừng Chân',
    distance_from_start_km: 0.0,
    market_prices: {
      potato: 5.0,
      egg: 12.0,
      bio_fuel: 8.0,
      passenger_ticket: 15.0,
    },
    fuel_refill_price_per_unit: 2.0,
    repair_price_per_hp: 1.5,
    description: 'Trạm dừng chân khởi hành đầu tuyến nằm giữa thung lũng màu mỡ với các nông trường trù phú.',
    biome: 'plains',
  },
  {
    station_id: 'ST_002',
    station_name: 'Trạm Băng Giá (Đỉnh Núi)',
    distance_from_start_km: 7.5, // 7.5km từ trạm 1 (ngẫu nhiên trong khoảng 3 - 15km)
    market_prices: {
      potato: 10.0, // Nông sản được giá cao ở xứ lạnh
      egg: 25.0,
      bio_fuel: 14.0,
      passenger_ticket: 25.0,
    },
    fuel_refill_price_per_unit: 3.5,
    repair_price_per_hp: 2.0,
    description: 'Trạm ga trên núi cao tuyết phủ, thực phẩm tươi sống luôn được săn đón với giá cao.',
    biome: 'mountains',
  },
  {
    station_id: 'ST_003',
    station_name: 'Trạm Rừng Thông Xanh',
    distance_from_start_km: 15.5, // 8.0km từ trạm 2
    market_prices: {
      potato: 7.5,
      egg: 18.0,
      bio_fuel: 10.0,
      passenger_ticket: 20.0,
    },
    fuel_refill_price_per_unit: 2.2,
    repair_price_per_hp: 1.8,
    description: 'Trạm dừng chân yên bình giữa rừng thông ngút ngàn, nhiều khách du lịch sinh thái.',
    biome: 'plains',
  },
  {
    station_id: 'ST_004',
    station_name: 'Trạm Cảng Biển Nắng Gió',
    distance_from_start_km: 25.0, // 9.5km từ trạm 3
    market_prices: {
      potato: 12.0,
      egg: 22.0,
      bio_fuel: 15.0,
      passenger_ticket: 30.0,
    },
    fuel_refill_price_per_unit: 2.8,
    repair_price_per_hp: 2.5,
    description: 'Thành phố cảng sầm uất với luồng tàu biển quốc tế, nhu cầu nhiên liệu và nông sản rất lớn.',
    biome: 'coastal',
  },
  {
    station_id: 'ST_005',
    station_name: 'Trạm Đô Thị Ánh Sáng',
    distance_from_start_km: 36.0, // 11.0km từ trạm 4
    market_prices: {
      potato: 15.0,
      egg: 30.0,
      bio_fuel: 20.0,
      passenger_ticket: 40.0,
    },
    fuel_refill_price_per_unit: 4.0,
    repair_price_per_hp: 3.0,
    description: 'Đại đô thị hiện đại bậc nhất, trung tâm tài chính và thị trường tiêu thụ khổng lồ.',
    biome: 'city',
  },
];

export const INITIAL_PLAYER_PROFILE = {
  player_id: 'TRAIN_CONVOY_01',
  gold_balance: 100.0,
  current_distance_km: 0,
  current_station_index: 0,
  total_earnings: 0,
  trips_completed: 0,
  passengers_served: 0,
  created_at: new Date().toISOString(),
};

export const INITIAL_CAR_LIST = [
  {
    id: 'car_passenger_1',
    car_type_id: 'PASSENGER' as const,
    growth_timer: 12.0,
    passengers_count: 0,
  },
];
