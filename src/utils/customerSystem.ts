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

const CUSTOMER_POOL = [
  { name: 'Bác Ba Nông Dân', role: 'Nông dân mang nông sản lên chợ thị trấn', avatar: '🌾', coatColor: '#1e3a5f', hat: true },
  { name: 'Cô Mai Dược Sĩ', role: 'Chuyên gia tìm kiếm thảo mộc vùng núi', avatar: '🌿', coatColor: '#831843', hat: false },
  { name: 'Kỹ Sư Tuấn', role: 'Thợ trưởng cơ khí tuyến đường sắt cao nguyên', avatar: '🔧', coatColor: '#14532d', hat: true },
  { name: 'Họa Sĩ Phong', role: 'Du khách ký họa phong cảnh thiên nhiên', avatar: '🎨', coatColor: '#7c2d12', hat: true },
  { name: 'Tiểu Thư Ngọc', role: 'Thương nhân tơ lụa & hàng mỹ nghệ', avatar: '👘', coatColor: '#4338ca', hat: false },
  { name: 'Bé An & Mèo Mun', role: 'Học sinh đến trường liên tỉnh', avatar: '🎒', coatColor: '#0369a1', hat: false },
  { name: 'Cụ Đồ Nguyễn', role: 'Nhà nghiên cứu lịch sử các nhà ga xưa', avatar: '📜', coatColor: '#475569', hat: true },
  { name: 'Đầu Bếp Lâm', role: 'Bếp trưởng đi tìm nguồn gia vị đặc sản', avatar: '🍳', coatColor: '#b45309', hat: true },
  { name: 'Nhạc Công Hải', role: 'Nghệ sĩ biểu diễn violin trên chuyến tàu', avatar: '🎻', coatColor: '#6d28d9', hat: true },
  { name: 'Thợ Mộc Toàn', role: 'Nghệ nhân phục dựng toa tàu cổ', avatar: '🪵', coatColor: '#365314', hat: true },
  { name: 'Nhiếp Ảnh Gia Linh', role: 'Săn ảnh bình minh và hoàng hôn trên ray', avatar: '📷', coatColor: '#0f766e', hat: false },
  { name: 'Bác Sĩ Hoàng', role: 'Bác sĩ lưu động hỗ trợ y tế trạm xa xôi', avatar: '🩺', coatColor: '#1d4ed8', hat: false },
];

export const CustomerSystem = {
  create: (count: number = 4, stationLevel: number = 1): Customer[] => {
    const shuffled = [...CUSTOMER_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.max(1, Math.min(count, CUSTOMER_POOL.length)));

    return selected.map((proto, index) => {
      const baseTicket = 15 + Math.floor(Math.random() * 10) + stationLevel * 3;
      const luggage = Number((4 + Math.random() * 8).toFixed(1));
      const tipMult = Number((1.0 + (Math.random() > 0.6 ? 0.3 : 0)).toFixed(1));

      return {
        id: `cust_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
        name: proto.name,
        role: proto.role,
        avatar: proto.avatar,
        coatColor: proto.coatColor,
        hat: proto.hat,
        ticketPrice: baseTicket,
        luggageKg: luggage,
        tipMultiplier: tipMult,
        boarded: false,
        waving: Math.random() > 0.4,
      };
    });
  },
};
