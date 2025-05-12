export interface PendingUser {
  id: number;
  email: string;
  name?: string;
  surname?: string;
  phoneNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
  verificationToken?: string;
  tokenExpireDate?: Date;
} 