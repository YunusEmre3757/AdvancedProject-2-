export interface Il {
  ilId: number;
  ilAdi: string;
}

export interface Ilce {
  ilceId: number;
  ilceAdi: string;
  il: Il;
}

export interface Mahalle {
  mahalleId: number;
  mahalleAdi: string;
  ilce: Ilce;
}

export interface AdresRequest {
  adresBasligi: string;
  telefon: string;
  ilId: number;
  ilceId: number;
  mahalleId: number;
  detayAdres: string;
}

export interface Adres {
  id: number;
  adresBasligi: string;
  telefon: string;
  il: Il;
  ilce: Ilce;
  mahalle: Mahalle;
  detayAdres: string;
  varsayilanMi: boolean;
} 