package com.example.backend.repository;

import com.example.backend.model.Ilce;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface IlceRepository extends JpaRepository<Ilce, Integer> {
    List<Ilce> findByIlIlId(Integer ilId);
} 