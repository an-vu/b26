package com.b26.backend.user.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_preferences")
public class UserPreferenceEntity {
  @Id
  @Column(name = "user_id", nullable = false, updatable = false)
  private String userId;

  @Column(name = "main_board_id")
  private String mainBoardId;

  public String getUserId() {
    return userId;
  }

  public void setUserId(String userId) {
    this.userId = userId;
  }

  public String getMainBoardId() {
    return mainBoardId;
  }

  public void setMainBoardId(String mainBoardId) {
    this.mainBoardId = mainBoardId;
  }
}
