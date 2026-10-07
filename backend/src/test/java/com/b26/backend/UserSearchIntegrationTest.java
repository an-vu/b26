package com.b26.backend;

import com.b26.backend.user.persistence.AppUserEntity;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.hasSize;

@Transactional
class UserSearchIntegrationTest extends ApiIntegrationTestSupport {
  private void user(String username) {
    AppUserEntity user = new AppUserEntity();
    user.setId(UUID.randomUUID().toString());
    user.setUsername(username);
    user.setDisplayName("Display " + username);
    user.setEmail(username + "@private.example");
    user.setPasswordHash("private-password-hash");
    user.setRole("USER");
    appUserRepository.saveAndFlush(user);
  }

  @Test
  void publicSearchMatchesUsernameCaseInsensitivelyAndReturnsOnlyPublicFields() throws Exception {
    user("search-emma");
    mockMvc.perform(get("/api/search/users").param("q", "  @EMMA  "))
        .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].username").value("search-emma"))
        .andExpect(jsonPath("$[0].displayName").value("Display search-emma"))
        .andExpect(jsonPath("$[0].email").doesNotExist())
        .andExpect(jsonPath("$[0].passwordHash").doesNotExist())
        .andExpect(jsonPath("$[0].role").doesNotExist())
        .andExpect(jsonPath("$[0].id").doesNotExist());
    mockMvc.perform(get("/api/search/users").param("q", "Display"))
        .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
  }

  @Test
  void resultCountIsBoundedAndAlphabetical() throws Exception {
    for (int i = 14; i >= 0; i--) user("search-limit-" + String.format("%02d", i));
    mockMvc.perform(get("/api/search/users").param("q", "search-limit"))
        .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(10)))
        .andExpect(jsonPath("$[0].username").value("search-limit-00"))
        .andExpect(jsonPath("$[9].username").value("search-limit-09"));
  }

  @Test
  void emptyShortInvalidAndMissingQueriesDoNotListEveryUser() throws Exception {
    for (String query : new String[] {"", "a", "@a", "%", "__", "no-such-search-user"}) {
      mockMvc.perform(get("/api/search/users").param("q", query))
          .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
    }
    mockMvc.perform(get("/api/search/users")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
    mockMvc.perform(get("/api/search/users").param("q", "a".repeat(65))).andExpect(status().isBadRequest());
    mockMvc.perform(get("/api/search/users").param("q", "a".repeat(129))).andExpect(status().isBadRequest());
  }
}
