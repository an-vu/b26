package com.bento26.backend.widget.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WidgetRepository extends JpaRepository<WidgetEntity, Long> {
  List<WidgetEntity> findByBoard_IdOrderBySortOrderAsc(String boardId);

  Optional<WidgetEntity> findByIdAndBoard_Id(Long id, String boardId);
}
