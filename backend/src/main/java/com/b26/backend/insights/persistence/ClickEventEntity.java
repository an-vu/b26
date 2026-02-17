package com.b26.backend.insights.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "click_events")
public class ClickEventEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String boardId;

  @Column(nullable = false)
  private String cardId;

  @Column(nullable = false)
  private Instant occurredAt;

  @Column(nullable = false)
  private String sourceIp;

  public Long getId() {
    return id;
  }

  public String getBoardId() {
    return boardId;
  }

  public void setBoardId(String boardId) {
    this.boardId = boardId;
  }

  public String getCardId() {
    return cardId;
  }

  public void setCardId(String cardId) {
    this.cardId = cardId;
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
}
