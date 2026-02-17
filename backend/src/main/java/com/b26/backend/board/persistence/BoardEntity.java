package com.b26.backend.board.persistence;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "boards")
public class BoardEntity {
  @Id
  @Column(nullable = false, updatable = false)
  private String id;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private String headline;

  @Column(name = "board_name", nullable = false)
  private String boardName;

  @Column(name = "board_url", nullable = false, unique = true)
  private String boardUrl;

  @Column(name = "owner_user_id", nullable = false)
  private String ownerUserId;

  @Version private Long version;

  @OneToMany(mappedBy = "board", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderColumn(name = "position")
  private List<CardEntity> cards = new ArrayList<>();

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getHeadline() {
    return headline;
  }

  public void setHeadline(String headline) {
    this.headline = headline;
  }

  public String getBoardName() {
    return boardName;
  }

  public void setBoardName(String boardName) {
    this.boardName = boardName;
  }

  public String getBoardUrl() {
    return boardUrl;
  }

  public void setBoardUrl(String boardUrl) {
    this.boardUrl = boardUrl;
  }

  public String getOwnerUserId() {
    return ownerUserId;
  }

  public void setOwnerUserId(String ownerUserId) {
    this.ownerUserId = ownerUserId;
  }

  public Long getVersion() {
    return version;
  }

  public List<CardEntity> getCards() {
    return cards;
  }

  public void setCards(List<CardEntity> cards) {
    this.cards = cards;
  }
}
