package com.b26.backend;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Transactional
class BoardPaginationIntegrationTest extends ApiIntegrationTestSupport {
  @Test
  void pagesAreBoundedStableAndExcludePrivateBoards() throws Exception {
    authAnvu();
    for (int i = 0; i < 3; i++) {
      var board = new com.b26.backend.board.persistence.BoardEntity();
      board.setId("page-test-" + i);
      board.setBoardUrl("page-test-" + i);
      board.setBoardName("000 pagination");
      board.setName("Test");
      board.setHeadline("Test");
      board.setOwnerUserId("anvu");
      board.setVisibility(i == 2 ? "private" : "public");
      board.setUpdatedAt(java.time.OffsetDateTime.now());
      boardRepository.saveAndFlush(board);
    }
    var first = objectMapper.readTree(mockMvc.perform(get(API_BOARD).param("size", "1"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1))
        .andExpect(jsonPath("$.items[0].id").value("page-test-0"))
        .andExpect(jsonPath("$.items[0].ownerUsername").value("anvu"))
        .andReturn().getResponse().getContentAsString());
    mockMvc.perform(get(API_BOARD).param("page", "1").param("size", "1"))
        .andExpect(jsonPath("$.items[0].id").value("page-test-1"));
    long expected = boardRepository.findAll().stream().filter(b -> "public".equals(b.getVisibility())).count();
    assertEquals(expected, first.get("totalElements").asLong());
    mockMvc.perform(get(API_BOARD).param("page", "9999"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
  }

  @Test
  void rejectsInvalidPagination() throws Exception {
    for (String size : new String[]{"0", "-1", "101"}) {
      mockMvc.perform(get(API_BOARD).param("size", size)).andExpect(status().isBadRequest());
    }
    mockMvc.perform(get(API_BOARD).param("page", "-1")).andExpect(status().isBadRequest());
  }
}
