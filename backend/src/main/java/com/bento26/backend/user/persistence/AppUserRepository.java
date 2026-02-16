package com.bento26.backend.user.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUserEntity, String> {
  Optional<AppUserEntity> findByUsername(String username);
}
