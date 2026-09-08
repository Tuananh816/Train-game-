import { Station } from '../types';

const BIOME_CYCLE: Station['biome'][] = ['plains', 'mountains', 'forest', 'coastal', 'city', 'snow'];

const REGION_NAMES = [
  { name: 'Ga Đồng Xanh', biome: 'plains' as const, desc: 'Trạm dừng chân giữa đồng cỏ lộng gió và các nông trường bát ngát.' },
  { name: 'Ga Đỉnh Tuyết Ngàn', biome: 'snow' as const, desc: 'Ga xe lửa trên đỉnh đèo băng tuyết, lò sưởi ấm áp đón khách đường xa.' },
  { name: 'Ga Rừng Thông Mơ', biome: 'forest' as const, desc: 'Nằm ẩn mình dưới tán thông cổ thụ, hương nhựa thông thơm ngát sớm mai.' },
  { name: 'Ga Hải Cảng Gió Lộng', biome: 'coastal' as const, desc: 'Bến ga sát mép biển xanh với tiếng còi tàu hòa cùng tiếng sóng vỗ.' },
  { name: 'Ga Đô Thị Ánh Sáng', biome: 'city' as const, desc: 'Nhà ga trung tâm sầm uất với các tòa tháp rực rỡ và nhịp sống hiện đại.' },
  { name: 'Ga Suối Mơ Vàng', biome: 'plains' as const, desc: 'Nhà ga ven dòng suối trong vắt, nơi hành khách nghỉ chân uống trà.' },
  { name: 'Ga Đèo Mây Trắng', biome: 'mountains' as const, desc: 'Trạm dừng trên vách đá ngắm biển mây cuồn cuộn kỳ vĩ.' },
  { name: 'Ga Rừng Phong Đỏ', biome: 'forest' as const, desc: 'Cảnh sắc mùa thu lãng mạn với lá phong đỏ rực dọc theo hai bên đường ray.' },
  { name: 'Ga Vịnh Bán Nguyệt', biome: 'coastal' as const, desc: 'Cảng tàu cá tấp nập thuyền bè, hải sản tươi ngon dồi dào.' },
  { name: 'Ga Kim Cương Trung Tâm', biome: 'city' as const, desc: 'Đại sảnh vòm kính tráng lệ với đồng hồ khổng lồ và bảng điện tử.' },
];

export function generateStation(stationNumber: number, distanceFromStartKm: number): Station {
  const templateIndex = (stationNumber - 1) % REGION_NAMES.length;
  const template = REGION_NAMES[templateIndex];
  const biome = template.biome || BIOME_CYCLE[(stationNumber - 1) % BIOME_CYCLE.length];

  // Dynamic pricing based on biome and distance
  const potatoBase = biome === 'snow' || biome === 'city' ? 12 : 6;
  const eggBase = biome === 'mountains' || biome === 'city' ? 24 : 14;
  const fuelBase = biome === 'coastal' || biome === 'snow' ? 15 : 9;
  const ticketBase = 18 + Math.min(30, stationNumber * 2);

  return {
    station_id: `ST_${stationNumber.toString().padStart(3, '0')}`,
    station_name: `${template.name} (#${stationNumber})`,
    station_number: stationNumber,
    distance_from_start_km: Number(distanceFromStartKm.toFixed(1)),
    market_prices: {
      potato: Number((potatoBase + Math.random() * 5).toFixed(1)),
      egg: Number((eggBase + Math.random() * 8).toFixed(1)),
      bio_fuel: Number((fuelBase + Math.random() * 6).toFixed(1)),
      passenger_ticket: ticketBase,
    },
    fuel_refill_price_per_unit: Number((2.0 + Math.random() * 1.5).toFixed(1)),
    repair_price_per_hp: Number((1.5 + Math.random() * 1.2).toFixed(1)),
    description: template.desc,
    biome,
  };
}

export const MIN_STATION_DISTANCE_KM = 3.0;
export const MAX_STATION_DISTANCE_KM = 15.0;

/**
 * Tạo khoảng cách ngẫu nhiên tới trạm tiếp theo:
 * Ngắn nhất 3 km, dài nhất trong bán kính 15 km
 */
export function getRandomStationDistanceKm(): number {
  const dist = MIN_STATION_DISTANCE_KM + Math.random() * (MAX_STATION_DISTANCE_KM - MIN_STATION_DISTANCE_KM);
  return Number(dist.toFixed(1));
}

