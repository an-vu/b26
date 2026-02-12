package com.bento26.backend.profile.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProfileRepository extends JpaRepository<ProfileEntity, String> {
  @Query("select distinct p from ProfileEntity p left join fetch p.cards")
  List<ProfileEntity> findAllWithCards();
}
