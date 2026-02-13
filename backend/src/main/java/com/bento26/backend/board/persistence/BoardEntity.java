package com.bento26.backend.board.persistence;

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
