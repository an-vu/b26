package com.b26.backend.user.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUserEntity, String> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @org.springframework.data.jpa.repository.Query("select u from AppUserEntity u where u.id = :id")
  Optional<AppUserEntity> lockById(@org.springframework.data.repository.query.Param("id") String id);

  Optional<AppUserEntity> findByUsername(String username);

  Optional<AppUserEntity> findByEmailIgnoreCase(String email);

  boolean existsByUsernameAndIdNot(String username, String id);

  boolean existsByUsernameIgnoreCase(String username);

  boolean existsByEmailIgnoreCase(String email);
}
