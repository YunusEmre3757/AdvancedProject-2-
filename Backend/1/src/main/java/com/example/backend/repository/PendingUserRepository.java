package com.example.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.model.PendingUser;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PendingUserRepository extends JpaRepository<PendingUser, Long> {
    Optional<PendingUser> findByEmail(String email);
    Optional<PendingUser> findByVerificationToken(String verificationToken);
    List<PendingUser> findByExpiresAtBefore(LocalDateTime dateTime);
    void deleteByExpiresAtBefore(LocalDateTime dateTime);
    
    /**
     * Find pending users by name, surname, or email containing the given query
     */
    @Query("SELECT p FROM PendingUser p WHERE " +
           "LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.surname) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.email) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<PendingUser> searchByNameSurnameOrEmail(@Param("query") String query, Pageable pageable);
} 