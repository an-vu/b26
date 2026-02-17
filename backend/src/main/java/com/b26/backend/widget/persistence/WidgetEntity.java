package com.b26.backend.widget.persistence;

import com.b26.backend.board.persistence.BoardEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "widgets")
public class WidgetEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "board_id", nullable = false)
  private BoardEntity board;

  @Column(nullable = false)
  private String type;

  @Column(nullable = false)
  private String title;

  @Column(nullable = false)
  private String layout;

  @Column(nullable = false, length = 4000)
  private String configJson;

  @Column(nullable = false)
  private boolean enabled;

  @Column(nullable = false)
  private int sortOrder;

  public Long getId() {
    return id;
  }

  public BoardEntity getBoard() {
    return board;
  }

  public void setBoard(BoardEntity board) {
    this.board = board;
  }

  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getLayout() {
    return layout;
  }

  public void setLayout(String layout) {
    this.layout = layout;
  }

  public String getConfigJson() {
    return configJson;
  }

  public void setConfigJson(String configJson) {
    this.configJson = configJson;
  }

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public int getSortOrder() {
    return sortOrder;
  }

  public void setSortOrder(int sortOrder) {
    this.sortOrder = sortOrder;
  }
}
