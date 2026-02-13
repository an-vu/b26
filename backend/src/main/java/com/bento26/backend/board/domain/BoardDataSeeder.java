package com.bento26.backend.board.domain;

import com.bento26.backend.board.persistence.CardEntity;
import com.bento26.backend.board.persistence.BoardEntity;
import com.bento26.backend.board.persistence.BoardRepository;
import com.bento26.backend.widget.persistence.WidgetEntity;
import com.bento26.backend.widget.persistence.WidgetRepository;
import java.util.List;
import java.util.Map;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BoardDataSeeder {
  @Bean
  CommandLineRunner seedBoards(BoardRepository boardRepository, WidgetRepository widgetRepository) {
    return args -> {
      if (boardRepository.count() > 0) {
        ensureHomeBoard(boardRepository, widgetRepository);
        backfillMissingLinkWidgets(boardRepository, widgetRepository);
        return;
      }

      List<BoardEntity> boards =
          boardRepository.saveAll(
              List.of(
              buildBoard(
                  "default",
                  "An Vu",
                  "Software Engineer - Angular + Java",
                  List.of(
                      new CardSeed("github", "GitHub", "https://github.com/"),
                      new CardSeed("linkedin", "LinkedIn", "https://linkedin.com/"),
                      new CardSeed("resume", "Resume", "#"),
                      new CardSeed("projects", "Projects", "#"))),
              buildBoard(
                  "berkshire",
                  "An Vu",
                  "Software Engineering - Angular + Spring Boot",
                  List.of(
                      new CardSeed("github", "GitHub", "https://github.com/"),
                      new CardSeed("linkedin", "LinkedIn", "https://linkedin.com/"),
                      new CardSeed("resume", "Resume", "#"),
                      new CardSeed("projects", "Projects", "#"))),
              buildBoard(
                  "union-pacific",
                  "An Vu",
                  "Software Engineering - Angular + Java",
                  List.of(
                      new CardSeed("github", "GitHub", "https://github.com/"),
                      new CardSeed("linkedin", "LinkedIn", "https://linkedin.com/"),
                      new CardSeed("resume", "Resume", "#"),
                      new CardSeed("projects", "Projects", "#"))),
              buildBoard(
                  "home",
                  "B26",
                  "Angular x Java",
                  List.of(new CardSeed("home", "Home", "https://anvu.tech/")))));

      Map<String, BoardEntity> byId =
          boards.stream().collect(java.util.stream.Collectors.toMap(BoardEntity::getId, p -> p));
      java.util.ArrayList<WidgetEntity> widgets = new java.util.ArrayList<>();

      BoardEntity defaultBoard = byId.get("default");
      if (defaultBoard != null) {
        widgets.add(
            buildWidget(
                defaultBoard,
                "embed",
                "Now Playing",
                "span-2",
                "{\"embedUrl\":\"https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC\"}",
                0));
        widgets.add(
            buildWidget(
                defaultBoard,
                "map",
                "Places Visited",
                "span-2",
                "{\"places\":[\"Omaha, NE\",\"Chicago, IL\",\"San Francisco, CA\"]}",
                1));
      }

      for (BoardEntity board : boards) {
        int baseOrder = "default".equals(board.getId()) ? 2 : 0;
        int offset = 0;
        for (CardEntity card : board.getCards()) {
          widgets.add(
              buildWidget(
                  board,
                  "link",
                  card.getLabel(),
                  "span-1",
                  "{\"url\":\"" + card.getHref() + "\"}",
                  baseOrder + offset));
          offset++;
        }
      }

      widgetRepository.saveAll(widgets);
    };
  }

  private static void ensureHomeBoard(
      BoardRepository boardRepository, WidgetRepository widgetRepository) {
    BoardEntity homeBoard =
        boardRepository
            .findById("home")
            .orElseGet(
                () ->
                    boardRepository.save(
                        buildBoard(
                            "home",
                            "B26",
                            "Angular x Java",
                            List.of(new CardSeed("home", "Home", "https://anvu.tech/")))));

    boolean hasComingSoonWidget =
        widgetRepository.findByBoard_IdOrderBySortOrderAsc("home").stream()
            .anyMatch(widget -> "Coming soon".equals(widget.getTitle()));
    if (!hasComingSoonWidget) {
      int nextOrder =
          widgetRepository.findByBoard_IdOrderBySortOrderAsc("home").stream()
                  .mapToInt(WidgetEntity::getSortOrder)
                  .max()
                  .orElse(-1)
              + 1;
      widgetRepository.save(
          buildWidget(
              homeBoard,
              "link",
              "Coming soon",
              "span-1",
              "{\"url\":\"https://anvu.tech/\"}",
              nextOrder));
    }
  }

  private static void backfillMissingLinkWidgets(
      BoardRepository boardRepository, WidgetRepository widgetRepository) {
    List<BoardEntity> boards = boardRepository.findAllWithCards();
    java.util.ArrayList<WidgetEntity> missingWidgets = new java.util.ArrayList<>();

    for (BoardEntity board : boards) {
      List<WidgetEntity> existing = widgetRepository.findByBoard_IdOrderBySortOrderAsc(board.getId());
      int nextOrder = existing.stream().mapToInt(WidgetEntity::getSortOrder).max().orElse(-1) + 1;
      java.util.Set<String> existingLinkTitles =
          existing.stream()
              .filter(widget -> "link".equals(widget.getType()))
              .map(WidgetEntity::getTitle)
              .collect(java.util.stream.Collectors.toSet());

      for (CardEntity card : board.getCards()) {
        if (existingLinkTitles.contains(card.getLabel())) {
          continue;
        }
        missingWidgets.add(
            buildWidget(
                board,
                "link",
                card.getLabel(),
                "span-1",
                "{\"url\":\"" + card.getHref() + "\"}",
                nextOrder));
        nextOrder++;
      }
    }

    if (!missingWidgets.isEmpty()) {
      widgetRepository.saveAll(missingWidgets);
    }
  }

  private static BoardEntity buildBoard(
      String id, String name, String headline, List<CardSeed> cardSeeds) {
    BoardEntity board = new BoardEntity();
    board.setId(id);
    board.setName(name);
    board.setHeadline(headline);

    for (CardSeed seed : cardSeeds) {
      CardEntity card = new CardEntity();
      card.setId(seed.id());
      card.setLabel(seed.label());
      card.setHref(seed.href());
      card.setBoard(board);
      board.getCards().add(card);
    }
    return board;
  }

  private static WidgetEntity buildWidget(
      BoardEntity board,
      String type,
      String title,
      String layout,
      String configJson,
      int sortOrder) {
    WidgetEntity widget = new WidgetEntity();
    widget.setBoard(board);
    widget.setType(type);
    widget.setTitle(title);
    widget.setLayout(layout);
    widget.setConfigJson(configJson);
    widget.setEnabled(true);
    widget.setSortOrder(sortOrder);
    return widget;
  }

  private record CardSeed(String id, String label, String href) {}
}
