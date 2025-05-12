export interface Address {
  id?: number;
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode: string;
  isDefault: boolean;
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER'
}

export interface UpdateProfileRequest {
  name: string;
  surname: string;
  email: string;
  phoneNumber?: string;
  birthDate?: Date;
  gender?: Gender;
  addresses?: Address[];
}

export interface User {
  id: number;
  email: string;
  name: string;
  surname: string;
  phoneNumber?: string;
  birthDate?: Date | null;
  gender?: Gender;
  roles?: string[];
  emailVerified?: boolean;
  addresses?: Address[];
  createdAt?: Date | null;
  updatedAt?: Date | null;
  token?: string;
  isActive?: boolean;
} 

