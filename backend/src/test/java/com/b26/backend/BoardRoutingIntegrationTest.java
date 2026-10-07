package com.b26.backend;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Transactional
class BoardRoutingIntegrationTest extends ApiIntegrationTestSupport {
  @Test
  void ownerRouteAndLegacyLookupResolveTheSameBoard() throws Exception {
    mockMvc.perform(get("/api/board/by-owner/anvu/default"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.id").value("default"))
        .andExpect(jsonPath("$.ownerUsername").value("anvu"));
    mockMvc.perform(get("/api/board/default"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.id").value("default"))
        .andExpect(jsonPath("$.ownerUsername").value("anvu"));
    mockMvc.perform(get("/api/users/anvu/main-board")).andExpect(status().isOk());
    mockMvc.perform(auth(get("/api/board/mine")))
        .andExpect(status().isOk()).andExpect(jsonPath("$[0].ownerUsername").value("anvu"));
  }

  @Test
  void missingOrMismatchedOwnerNeverFallsBackToAnotherOwnersBoard() throws Exception {
    issueAuthTokenForUser("routing-other");
    for (String path : List.of("nobody/default", "routing-other/default", "anvu/not-here")) {
      mockMvc.perform(get("/api/board/by-owner/" + path)).andExpect(status().isNotFound());
    }
  }

  @Test
  void renamingUsernameUpdatesBoardLinksAndPreservesLegacySlug() throws Exception {
    mockMvc.perform(authJson(patch(API_USERS_ME),
        "{\"displayName\":\"An Vu\",\"username\":\"an-renamed\",\"email\":\"anvu@local\"}"))
        .andExpect(status().isOk());
    mockMvc.perform(get("/api/board/by-owner/an-renamed/default"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.ownerUsername").value("an-renamed"));
    mockMvc.perform(get("/api/board/by-owner/anvu/default")).andExpect(status().isNotFound());
    mockMvc.perform(get("/api/board/default"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.ownerUsername").value("an-renamed"));
    mockMvc.perform(get("/api/users/an-renamed/main-board")).andExpect(status().isOk());
  }

  @Test
  void renamingSlugUpdatesBothRoutesAndKeepsMainBoardById() throws Exception {
    mockMvc.perform(authJson(patch(API_USERS_ME_PREFERENCES), "{\"mainBoardId\":\"default\"}"))
        .andExpect(status().isOk());
    mockMvc.perform(authJson(patch("/api/board/default/identity"),
        "{\"boardName\":\"Renamed\",\"boardUrl\":\"routing-renamed\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.ownerUsername").value("anvu"));
    mockMvc.perform(get("/api/board/by-owner/anvu/routing-renamed"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.id").value("default"));
    mockMvc.perform(get("/api/board/routing-renamed")).andExpect(status().isOk());
    mockMvc.perform(get("/api/users/anvu/main-board"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.mainBoardUrl").value("routing-renamed"));
    mockMvc.perform(get("/api/board/by-owner/anvu/default")).andExpect(status().isNotFound());
    mockMvc.perform(get("/api/board/default")).andExpect(status().isNotFound());
  }

  @Test
  void globalSlugUniquenessAndWritePermissionsRemainEnforced() throws Exception {
    String otherToken = issueAuthTokenForUser("routing-reader");
    var other = appUserRepository.findById("routing-reader").orElseThrow();
    other.setRole("USER");
    appUserRepository.saveAndFlush(other);
    mockMvc.perform(patch("/api/board/default/identity").header("Authorization", otherToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"boardName\":\"Stolen\",\"boardUrl\":\"stolen\"}"))
        .andExpect(status().isForbidden());
    mockMvc.perform(authJson(patch("/api/board/default/url"), "{\"boardUrl\":\"berkshire\"}"))
        .andExpect(status().isBadRequest());
    mockMvc.perform(get("/api/board/by-owner/anvu/default"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.boardUrl").value("default"));
  }

  @Test
  void reservedUsernamesAreRejectedOnProfileEditAndSignup() throws Exception {
    for (String username : List.of("b", "u", "api", "actuator", "insights", "settings", "signin", "signup", "assets")) {
      mockMvc.perform(authJson(patch(API_USERS_ME),
          "{\"displayName\":\"An Vu\",\"username\":\"" + username + "\",\"email\":\"anvu@local\"}"))
          .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].message").value("username is reserved"));
      mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
          .content("{\"username\":\"" + username + "\",\"email\":\"reserved@example.com\",\"password\":\"test-password-123\"}"))
          .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].message").value("username is reserved"));
    }
  }
}
