package com.b26.backend.system.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemSettingsRepository extends JpaRepository<SystemSettingsEntity, Short> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @org.springframework.data.jpa.repository.Query("select s from SystemSettingsEntity s where s.id = 1")
  java.util.Optional<SystemSettingsEntity> lockSettings();
}
