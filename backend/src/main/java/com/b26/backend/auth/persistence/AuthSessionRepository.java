package com.b26.backend.auth.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthSessionRepository extends JpaRepository<AuthSessionEntity, String> {
  Optional<AuthSessionEntity> findByTokenHashAndRevokedAtIsNull(String tokenHash);
}
