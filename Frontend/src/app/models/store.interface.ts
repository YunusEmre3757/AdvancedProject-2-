export interface Store {
  id: number;
  name: string;
  description: string;
  logo: string;
  bannerImage?: string;
  rating?: number;
  status: 'pending' | 'approved' | 'rejected' | 'banned' | 'inactive';
  followers?: number;
  productsCount?: number;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  categories?: string[];
  createdAt: Date;
  updatedAt?: Date;
} 