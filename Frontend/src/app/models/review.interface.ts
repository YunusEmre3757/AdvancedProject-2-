export interface ReviewResponse {
    id: number;
    productId: number;
    userId: number;
    userName: string;
    userAvatar?: string;
    title: string;
    comment: string;
    rating: number;
    verifiedPurchase: boolean;
    isMarkedHelpful: boolean;
    helpfulCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ReviewRequest {
    productId: number;
    title: string;
    comment: string;
    rating: number;
    verifiedPurchase?: boolean;
}

export interface ReviewSummary {
    productId: number;
    averageRating: number;
    totalReviewCount: number;
    ratingDistribution: {[key: number]: number}; // Yıldız sayısı -> Yorum sayısı
    featuredReviews: ReviewResponse[];
} 