package com.b26.backend.auth.persistence;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuthSessionRepository extends JpaRepository<AuthSessionEntity, String> {
  Optional<AuthSessionEntity> findByTokenHashAndRevokedAtIsNull(String tokenHash);

  @Modifying
  @Query("delete from AuthSessionEntity s where s.expiresAt < :now or s.revokedAt is not null")
  int deleteInactive(@Param("now") Instant now);
}
