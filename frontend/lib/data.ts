// Frontend domain types + districts/cities reference data. The seed
// `workers`/`jobs`/`sexlar` arrays from the original CRA project are
// kept for components that fall back to mock data when the backend
// isn't reachable.

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
