package com.example.backend.repository;

import com.example.backend.model.PopularSearch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PopularSearchRepository extends JpaRepository<PopularSearch, Long> {
    
    Optional<PopularSearch> findByText(String text);
    
    @Query("SELECT p FROM PopularSearch p ORDER BY p.count DESC")
    List<PopularSearch> findTopSearches();
    
    @Query(value = "SELECT * FROM popular_searches ORDER BY count DESC LIMIT :limit", nativeQuery = true)
    List<PopularSearch> findTopSearchesByLimit(@Param("limit") int limit);
} 