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

  @Column(name = "home_radius_step", nullable = false)
  private int homeRadiusStep = 2;

  @Column(name = "home_spacing_step", nullable = false)
  private int homeSpacingStep = 2;

  @Column(name = "home_theme_family", nullable = false)
  private String homeThemeFamily = "default";
  @Column(name = "home_color_mode", nullable = false)
  private String homeColorMode = "light";
  @Column(name = "home_background_color", nullable = false)
  private String homeBackgroundColor = "#f9f8f6";
  @Column(name = "home_pattern", nullable = false)
  private String homePattern = "none";
  @Column(name = "home_pattern_intensity", nullable = false)
  private String homePatternIntensity = "light";

  public String getHomeThemeFamily() { return homeThemeFamily; }
  public void setHomeThemeFamily(String value) { homeThemeFamily = value; }
  public String getHomeColorMode() { return homeColorMode; }
  public void setHomeColorMode(String value) { homeColorMode = value; }
  public String getHomeBackgroundColor() { return homeBackgroundColor; }
  public void setHomeBackgroundColor(String value) { homeBackgroundColor = value; }
  public String getHomePattern() { return homePattern; }
  public void setHomePattern(String value) { homePattern = value; }
  public String getHomePatternIntensity() { return homePatternIntensity; }
  public void setHomePatternIntensity(String value) { homePatternIntensity = value; }

  public int getHomeRadiusStep() { return homeRadiusStep; }
  public void setHomeRadiusStep(int value) { homeRadiusStep = value; }
  public int getHomeSpacingStep() { return homeSpacingStep; }
  public void setHomeSpacingStep(int value) { homeSpacingStep = value; }

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
