package com.example.backend.repository;

import com.example.backend.model.DeletedUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface DeletedUserRepository extends JpaRepository<DeletedUser, Long> {
    Optional<DeletedUser> findByOriginalEmail(String email);
    boolean existsByOriginalEmail(String email);
} 