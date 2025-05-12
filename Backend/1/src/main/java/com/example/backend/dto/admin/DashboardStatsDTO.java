package com.example.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {
    private long totalUsers;
    private long newUsers;
    private long orders;
    private int ordersPercentage;
    private long stores;
    private long newStores;
    private long products;
    private long newProducts;
} 