package com.b26.backend.user.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUserEntity, String> {
  Optional<AppUserEntity> findByUsername(String username);

  Optional<AppUserEntity> findByEmailIgnoreCase(String email);

  boolean existsByUsernameAndIdNot(String username, String id);

  boolean existsByUsernameIgnoreCase(String username);

  boolean existsByEmailIgnoreCase(String email);
}
