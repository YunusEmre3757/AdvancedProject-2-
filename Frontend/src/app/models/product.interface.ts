import { Brand } from './brand.interface';
import { Store } from './store.interface';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  image?: string;
  category: string | any;
  categoryId?: number;
  brand?: Brand;
  storeId: string;
  store?: Store;
  stock: number;
  totalStock?: number;
  rating: number;
  reviews: number;
  reviewCount: number;
  featured?: boolean;
  isActive?: boolean;
  slug?: string;
  status?: string;
  discount?: number;
  discountedPrice?: number;
  specifications?: { [key: string]: string };
  createdAt: Date;
  updatedAt: Date;
  productType?: ProductType;
  variants?: ProductVariant[];
  attributes?: ProductAttribute[];
}

export enum ProductType {
  CLOTHING = 'CLOTHING',
  FOOTWEAR = 'FOOTWEAR',
  ELECTRONICS = 'ELECTRONICS',
  FURNITURE = 'FURNITURE',
  BOOK = 'BOOK',
  FOOD = 'FOOD',
  BEAUTY = 'BEAUTY',
  TOY = 'TOY',
  DEFAULT = 'DEFAULT'
}

export interface ProductAttribute {
  id: number;
  name: string;
  type: AttributeType;
  values: AttributeValue[];
}

export enum AttributeType {
  COLOR = 'COLOR',
  SIZE = 'SIZE',
  NUMERIC = 'NUMERIC',
  MATERIAL = 'MATERIAL',
  WEIGHT = 'WEIGHT',
  VOLUME = 'VOLUME',
  OPTION = 'OPTION'
}

export interface AttributeValue {
  id: number;
  value: string;
  displayText: string;
  colorCode?: string;
  imageUrl?: string;
  inStock: boolean;
  priceAdjustment?: number;
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  price: number;
  salePrice?: number;
  stock: number;
  active: boolean;
  status?: string;
  variantDescription?: string;
  attributes: { [key: string]: string };
  attributesWithIds?: Array<{
    attribute_id: number;
    key: string;
    value: string;
  }>;
  imageUrls: string[];
}  