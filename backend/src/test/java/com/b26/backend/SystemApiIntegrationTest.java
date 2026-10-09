package com.b26.backend;

import org.junit.jupiter.api.Test;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SystemApiIntegrationTest extends ApiIntegrationTestSupport {
  @Test
  void retiredRoutesReturnGoneForReadersAndWriters() throws Exception {
    mockMvc.perform(get(API_SYSTEM_ROUTES)).andExpect(status().isGone());
    mockMvc.perform(patch(API_SYSTEM_ROUTES)).andExpect(status().isGone());
    mockMvc.perform(auth(patch(API_SYSTEM_ROUTES))).andExpect(status().isGone());
    mockMvc.perform(put(API_BOARD_DEFAULT)).andExpect(status().isGone());
    mockMvc.perform(post("/api/click/github")).andExpect(status().isGone());
  }
}
