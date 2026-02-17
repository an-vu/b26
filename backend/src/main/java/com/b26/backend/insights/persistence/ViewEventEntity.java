package com.b26.backend.insights.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "view_events")
public class ViewEventEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String boardId;

  @Column(nullable = false)
  private Instant occurredAt;

  @Column(nullable = false)
  private String sourceIp;

  @Column(nullable = false)
  private String source;

  @Column(nullable = false)
  private String deviceType;

  public Long getId() {
    return id;
  }

  public String getBoardId() {
    return boardId;
  }

  public void setBoardId(String boardId) {
    this.boardId = boardId;
  }

  public Instant getOccurredAt() {
    return occurredAt;
  }

  public void setOccurredAt(Instant occurredAt) {
    this.occurredAt = occurredAt;
  }

  public String getSourceIp() {
    return sourceIp;
  }

  public void setSourceIp(String sourceIp) {
    this.sourceIp = sourceIp;
  }

  public String getSource() {
    return source;
  }

  public void setSource(String source) {
    this.source = source;
  }

  public String getDeviceType() {
    return deviceType;
  }

  public void setDeviceType(String deviceType) {
    this.deviceType = deviceType;
  }
}
