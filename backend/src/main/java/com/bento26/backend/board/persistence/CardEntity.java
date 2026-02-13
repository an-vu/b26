package com.bento26.backend.board.persistence;

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
@Table(name = "cards")
public class CardEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long pk;

  @Column(nullable = false)
  private String id;

  @Column(nullable = false)
  private String label;

  @Column(nullable = false)
  private String href;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "board_id", nullable = false)
  private BoardEntity board;

  public Long getPk() {
    return pk;
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getLabel() {
    return label;
  }

  public void setLabel(String label) {
    this.label = label;
  }

  public String getHref() {
    return href;
  }

  public void setHref(String href) {
    this.href = href;
  }

  public BoardEntity getBoard() {
    return board;
  }

  public void setBoard(BoardEntity board) {
    this.board = board;
  }
}
