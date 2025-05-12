package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "popular_searches")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PopularSearch {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String text;
    
    @Column(nullable = false)
    private Integer count = 0;
} 