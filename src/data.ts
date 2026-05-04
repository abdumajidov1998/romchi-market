export type Worker = {
  id: string;
  name: string;
  initials: string;
  color: 'blue' | 'amber' | 'green';
  specs: string[];
  experience: number;
  city: string;
  district: string;
  rating: number;
  jobs: number;
  active: 'now' | 'today' | 'week';
  verified: boolean;
  top: boolean;
  expectedSalary?: string;
  about: string;
  distanceKm: number;
  phone?: string;
};

export type Job = {
  id: string;
  title: string;
  company: string;
  type: 'Factory' | 'Workshop';
  workType: 'Full-time' | 'Part-time' | 'Project';
  city: string;
  district: string;
  experience: string;
  salaryFrom: number;
  salaryTo: number;
  badge?: 'New' | 'Top' | 'Verified' | 'Urgent';
  specs: string[];
  description: string;
};

export const workers: Worker[] = [
  {
    id: 'w1', name: 'Sardor Rahimov', initials: 'SR', color: 'blue',
    specs: ['PVX', 'Termo'], experience: 5,
    city: 'Toshkent', district: 'Yunusobod', rating: 4.9, jobs: 87,
    active: 'now', verified: true, top: true, expectedSalary: '6 000 000',
    about: '5 yillik PVX deraza ustanovkasi tajribasi. Uy-joy va savdo binolari uchun. O‘z asboblari bor, Toshkent viloyati bo‘ylab tayyor.',
    distanceKm: 1.2,
  },
  {
    id: 'w2', name: 'Jamshid Mirzoyev', initials: 'JM', color: 'amber',
    specs: ['Alyumin'], experience: 3,
    city: 'Toshkent', district: 'Chilonzor', rating: 4.6, jobs: 34,
    active: 'now', verified: false, top: false, expectedSalary: '5 000 000',
    about: 'Aluminiy fasad bo‘yicha mutaxassis. Loyiha ishlari uchun mavjud.',
    distanceKm: 2.5,
  },
  {
    id: 'w3', name: 'Bekzod Umarov', initials: 'BU', color: 'green',
    specs: ['PVX', 'Alyumin'], experience: 7,
    city: 'Toshkent', district: 'Mirzo Ulug‘bek', rating: 5.0, jobs: 142,
    active: 'today', verified: true, top: true, expectedSalary: '7 000 000',
    about: '7 yillik o‘lchov tajribasi. Aniq, tez va ishonchli.',
    distanceKm: 4,
  },
  {
    id: 'w4', name: 'Diyor Xolmatov', initials: 'DX', color: 'blue',
    specs: ['PVX'], experience: 2,
    city: 'Samarqand', district: 'Markaz', rating: 4.4, jobs: 21,
    active: 'week', verified: false, top: false, expectedSalary: '4 000 000',
    about: 'Yosh PVX o‘rnatuvchi, tez o‘rganmoqda.',
    distanceKm: 14,
  },
  {
    id: 'w5', name: 'Akmal Karimov', initials: 'AK', color: 'blue',
    specs: ['PVX', 'Termo'], experience: 4,
    city: 'Toshkent', district: 'Sergeli', rating: 4.7, jobs: 56,
    active: 'today', verified: true, top: false, expectedSalary: '5 500 000',
    about: 'O‘z transporti bo‘lgan PVX o‘rnatuvchi.',
    distanceKm: 6,
  },
  {
    id: 'w6', name: 'Otabek Yusupov', initials: 'OY', color: 'amber',
    specs: ['Alyumin', 'Termo'], experience: 6,
    city: 'Toshkent', district: 'Yashnobod', rating: 4.8, jobs: 92,
    active: 'now', verified: true, top: true, expectedSalary: '7 500 000',
    about: 'Aluminiy eshiklar va vitrajli fasadlar.',
    distanceKm: 3.1,
  },
];

export const jobs: Job[] = [
  {
    id: 'j1', title: 'PVX deraza yasovchi usta', company: 'Oyna Plast MChJ', type: 'Factory',
    workType: 'Full-time', city: 'Toshkent', district: 'Chilonzor', experience: '3+ yil',
    salaryFrom: 5000000, salaryTo: 8000000, badge: 'New',
    specs: ['PVX'],
    description: '3+ yil tajriba, o‘z asboblari, shahar bo‘ylab harakatlanish imkoniyati.',
  },
  {
    id: 'j2', title: 'Alyumin fasad yasovchi usta', company: 'AluTech', type: 'Workshop',
    workType: 'Project', city: 'Toshkent', district: 'Yunusobod', experience: '5+ yil',
    salaryFrom: 9000000, salaryTo: 12000000, badge: 'Top',
    specs: ['Alyumin'],
    description: 'Shoshilinch loyiha — katta fasadni o‘rnatish, 6 hafta.',
  },
  {
    id: 'j3', title: 'Termo deraza yasovchi usta', company: 'Doors24', type: 'Factory',
    workType: 'Part-time', city: 'Toshkent', district: 'Mirzo Ulug‘bek', experience: '2+ yil',
    salaryFrom: 3000000, salaryTo: 5000000, badge: 'Verified',
    specs: ['Termo'],
    description: 'Termo profil deraza va eshiklar yasash bo‘yicha usta kerak.',
  },
  {
    id: 'j4', title: 'PVX usta (brigada boshlig‘i)', company: 'WindowPro', type: 'Factory',
    workType: 'Full-time', city: 'Toshkent', district: 'Yashnobod', experience: '5+ yil',
    salaryFrom: 8000000, salaryTo: 11000000, badge: 'Urgent',
    specs: ['PVX'],
    description: '4 kishilik ustalar guruhini boshqarish. Boshqaruv tajribasi talab etiladi.',
  },
];

export const regions: Record<string, string[]> = {
  'Toshkent': ['Bektemir', 'Chilonzor', 'Mirobod', 'Mirzo Ulug‘bek', 'Olmazor', 'Sergeli', 'Shayxontohur', 'Uchtepa', 'Yakkasaroy', 'Yashnobod', 'Yunusobod', 'Yangihayot'],
  'Toshkent viloyati': ['Angren', 'Bekobod', 'Bo‘ka', 'Bo‘stonliq', 'Chinoz', 'Chirchiq', 'Ohangaron', 'Olmaliq', 'Parkent', 'Piskent', 'Quyi Chirchiq', 'O‘rta Chirchiq', 'Yuqori Chirchiq', 'Yangiyo‘l', 'Zangiota'],
  'Samarqand': ['Bulung‘ur', 'Ishtixon', 'Jomboy', 'Kattaqo‘rg‘on', 'Narpay', 'Nurobod', 'Oqdaryo', 'Paxtachi', 'Payariq', 'Pastdarg‘om', 'Qo‘shrabot', 'Samarqand sh.', 'Tayloq', 'Urgut'],
  'Buxoro': ['Buxoro sh.', 'G‘ijduvon', 'Jondor', 'Kogon', 'Olot', 'Peshku', 'Qorako‘l', 'Qorovulbozor', 'Romitan', 'Shofirkon', 'Vobkent'],
  'Andijon': ['Andijon sh.', 'Asaka', 'Baliqchi', 'Bo‘ston', 'Buloqboshi', 'Izboskan', 'Jalaquduq', 'Xo‘jaobod', 'Marhamat', 'Oltinko‘l', 'Paxtaobod', 'Qo‘rg‘ontepa', 'Shahrixon', 'Ulug‘nor'],
  'Namangan': ['Chortoq', 'Chust', 'Kosonsoy', 'Mingbuloq', 'Namangan sh.', 'Norin', 'Pop', 'To‘raqo‘rg‘on', 'Uchqo‘rg‘on', 'Uychi', 'Yangiqo‘rg‘on'],
  'Farg‘ona': ['Bag‘dod', 'Beshariq', 'Buvayda', 'Dang‘ara', 'Farg‘ona sh.', 'Furqat', 'Qo‘qon', 'Qo‘shtepa', 'Marg‘ilon', 'Oltiariq', 'Quva', 'Rishton', 'So‘x', 'Toshloq', 'Uchko‘prik', 'O‘zbekiston', 'Yozyovon'],
  'Qashqadaryo': ['Chiroqchi', 'Dehqonobod', 'G‘uzor', 'Kasbi', 'Kitob', 'Koson', 'Mirishkor', 'Muborak', 'Nishon', 'Qamashi', 'Qarshi', 'Shahrisabz', 'Yakkabog‘'],
  'Surxondaryo': ['Angor', 'Bandixon', 'Boysun', 'Denov', 'Jarqo‘rg‘on', 'Muzrabot', 'Oltinsoy', 'Qiziriq', 'Qumqo‘rg‘on', 'Sariosiyo', 'Sherobod', 'Sho‘rchi', 'Termiz', 'Uzun'],
  'Xorazm': ['Bog‘ot', 'Gurlan', 'Xiva', 'Xonqa', 'Hazorasp', 'Qo‘shko‘pir', 'Shovot', 'Urganch', 'Yangiariq', 'Yangibozor'],
  'Navoiy': ['Konimex', 'Qiziltepa', 'Xatirchi', 'Karmana', 'Navbahor', 'Navoiy sh.', 'Nurota', 'Tomdi', 'Uchquduq', 'Zarafshon'],
  'Jizzax': ['Arnasoy', 'Baxmal', 'Do‘stlik', 'Forish', 'G‘allaorol', 'Jizzax sh.', 'Mirzacho‘l', 'Paxtakor', 'Yangiobod', 'Zafarobod', 'Zarbdor', 'Zomin'],
  'Sirdaryo': ['Boyovut', 'Guliston', 'Mirzaobod', 'Oqoltin', 'Sayxunobod', 'Sardoba', 'Sirdaryo', 'Xovos', 'Shirin', 'Yangiyer'],
  'Qoraqalpog‘iston': ['Amudaryo', 'Beruniy', 'Chimboy', 'Ellikqala', 'Kegeyli', 'Mo‘ynoq', 'Nukus', 'Qonliko‘l', 'Qorao‘zak', 'Qo‘ng‘irot', 'Shumanay', 'Taxiatosh', 'Taxtako‘pir', 'To‘rtko‘l', 'Xo‘jayli'],
};
export const cities = Object.keys(regions);
export { WORKER_SPECS as allSpecs } from './constants';

export type Sex = {
  id: string;
  name: string;
  owner: string;
  initials: string;
  city: string;
  district: string;
  rating: number;
  orders: number;
  verified: boolean;
  top: boolean;
  phone: string;
  prices: Partial<Record<'Termo' | 'PVX' | 'Alyumin', number>>;
};

export const sexlar: Sex[] = [
  {
    id: 's1', name: 'Oyna Plast sexi', owner: 'Rustam Aliyev', initials: 'OP',
    city: 'Toshkent', district: 'Chilonzor', rating: 4.9, orders: 312, verified: true, top: true,
    phone: '+998 90 111 22 33',
    prices: { Termo: 650000, PVX: 480000, Alyumin: 720000 },
  },
  {
    id: 's2', name: 'AluTech sexi', owner: 'Sherzod Karimov', initials: 'AT',
    city: 'Toshkent', district: 'Yunusobod', rating: 4.7, orders: 184, verified: true, top: false,
    phone: '+998 90 222 33 44',
    prices: { Alyumin: 700000, PVX: 460000 },
  },
  {
    id: 's3', name: 'Deraza Master', owner: 'Abror Yusupov', initials: 'DM',
    city: 'Samarqand', district: 'Samarqand sh.', rating: 4.8, orders: 256, verified: true, top: true,
    phone: '+998 91 333 44 55',
    prices: { Termo: 620000, PVX: 450000, Alyumin: 690000 },
  },
  {
    id: 's4', name: 'Window Pro', owner: 'Dilshod Ergashev', initials: 'WP',
    city: 'Toshkent', district: 'Yashnobod', rating: 4.5, orders: 98, verified: false, top: false,
    phone: '+998 93 444 55 66',
    prices: { PVX: 470000 },
  },
];
