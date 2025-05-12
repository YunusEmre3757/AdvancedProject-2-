package com.example.backend.repository;

import com.example.backend.model.Mahalle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MahalleRepository extends JpaRepository<Mahalle, Integer> {
    List<Mahalle> findByIlceIlceId(Integer ilceId);
} 