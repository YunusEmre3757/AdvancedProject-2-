package com.example.backend.repository;

import com.example.backend.model.Adres;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AdresRepository extends JpaRepository<Adres, Long> {
    List<Adres> findByUserIdAndAktifTrue(Long userId);
} 