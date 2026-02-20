package com.b26.backend.system.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "system_settings")
public class SystemSettingsEntity {
  @Id
  private Short id;

  @Column(name = "global_homepage_board_id", nullable = false)
  private String globalHomepageBoardId;

  @Column(name = "global_insights_board_id", nullable = false)
  private String globalInsightsBoardId;

  @Column(name = "global_settings_board_id", nullable = false)
  private String globalSettingsBoardId;

  @Column(name = "global_signin_board_id", nullable = false)
  private String globalSigninBoardId;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  public Short getId() {
    return id;
  }

  public void setId(Short id) {
    this.id = id;
  }

  public String getGlobalHomepageBoardId() {
    return globalHomepageBoardId;
  }

  public void setGlobalHomepageBoardId(String globalHomepageBoardId) {
    this.globalHomepageBoardId = globalHomepageBoardId;
  }

  public String getGlobalInsightsBoardId() {
    return globalInsightsBoardId;
  }

  public void setGlobalInsightsBoardId(String globalInsightsBoardId) {
    this.globalInsightsBoardId = globalInsightsBoardId;
  }

  public String getGlobalSettingsBoardId() {
    return globalSettingsBoardId;
  }

  public void setGlobalSettingsBoardId(String globalSettingsBoardId) {
    this.globalSettingsBoardId = globalSettingsBoardId;
  }

  public String getGlobalSigninBoardId() {
    return globalSigninBoardId;
  }

  public void setGlobalSigninBoardId(String globalSigninBoardId) {
    this.globalSigninBoardId = globalSigninBoardId;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(OffsetDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }
}
