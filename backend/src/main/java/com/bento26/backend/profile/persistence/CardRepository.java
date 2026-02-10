package com.bento26.backend.profile.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CardRepository extends JpaRepository<CardEntity, Long> {
  boolean existsByProfile_IdAndId(String profileId, String id);
}
