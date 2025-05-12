export interface Order {
  id: number;
  orderNumber: string;
  date: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  items: OrderItem[];
  address: string;
  customerName?: string;
  customerEmail?: string;
  phoneNumber?: string;
  notes?: string;
  paymentIntentId?: string;
  paymentMethod?: string;
  refundId?: string;
  refundStatus?: string;
  refundAmount?: number;
  cancelledAt?: string | Date;
  
  // User details
  userId?: number;
  userName?: string;
  userEmail?: string;
  userPhoneNumber?: string;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  image: string;
  storeId?: number;
  storeName?: string;
  variantInfo?: string;
  status?: string;
  trackingNumber?: string;
}

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SHIPPING: 'SHIPPING',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

export const PAYMENT_STATUS = {
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED'
}; 