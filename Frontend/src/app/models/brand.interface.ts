export interface Brand {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
} 