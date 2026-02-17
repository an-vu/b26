package com.b26.backend.user.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserPreferenceRepository extends JpaRepository<UserPreferenceEntity, String> {}
