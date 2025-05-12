export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  parent?: Category;
  subcategories?: Category[];
  level?: number;
  active?: boolean;
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategoryHierarchy extends Category {
  children?: CategoryHierarchy[];
} 