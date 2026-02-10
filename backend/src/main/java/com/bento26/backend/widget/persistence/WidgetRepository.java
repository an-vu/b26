package com.bento26.backend.widget.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WidgetRepository extends JpaRepository<WidgetEntity, Long> {
  List<WidgetEntity> findByProfile_IdOrderBySortOrderAsc(String profileId);
}
