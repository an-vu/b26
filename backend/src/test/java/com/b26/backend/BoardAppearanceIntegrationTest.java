package com.b26.backend;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class BoardAppearanceIntegrationTest extends ApiIntegrationTestSupport {
  private ObjectNode create(String token) throws Exception {
    var created = objectMapper.readTree(mockMvc.perform(post(API_BOARD)
        .header(AUTHORIZATION_HEADER, token)).andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString());
    return (ObjectNode) objectMapper.readTree(mockMvc.perform(get(API_BOARD + "/" + created.get("boardUrl").asText()))
        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  }

  private ObjectNode request(ObjectNode board) {
    var request = objectMapper.createObjectNode();
    request.set("version", board.get("version"));
    request.set("boardUrl", board.get("boardUrl"));
    request.put("boardName", "Appearance test");
    request.putObject("appearance").put("theme", "dark").put("radiusStep", 3)
        .put("backgroundColor", "#E6F0FF").put("pattern", "grid");
    return request;
  }

  @Test
  void ownerCanSaveAppearancePublicReadsPersistAndStaleWritesConflict() throws Exception {
    String token = issueAuthTokenForUser("appearance-owner");
    var owner = appUserRepository.findById("appearance-owner").orElseThrow();
    owner.setRole("USER"); appUserRepository.saveAndFlush(owner);
    var board = create(token);
    assertEquals("light", board.at("/appearance/theme").asText());
    assertEquals(2, board.at("/appearance/radiusStep").asInt());
    var request = request(board);
    String url = API_BOARD + "/" + board.get("boardUrl").asText();
    mockMvc.perform(patch(url + "/identity").header(AUTHORIZATION_HEADER, token)
        .contentType(MediaType.APPLICATION_JSON).content(request.toString()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.appearance.backgroundColor").value("#e6f0ff"));
    mockMvc.perform(get(url)).andExpect(jsonPath("$.appearance.theme").value("dark"))
        .andExpect(jsonPath("$.appearance.radiusStep").value(3)).andExpect(jsonPath("$.appearance.pattern").value("grid"));
    mockMvc.perform(patch(url + "/identity").header(AUTHORIZATION_HEADER, token)
        .contentType(MediaType.APPLICATION_JSON).content(request.toString())).andExpect(status().isConflict());
    // Legacy name-only clients preserve saved appearance.
    request.remove("appearance"); request.remove("version"); request.put("boardName", "Legacy rename");
    mockMvc.perform(patch(url + "/identity").header(AUTHORIZATION_HEADER, token)
        .contentType(MediaType.APPLICATION_JSON).content(request.toString()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.appearance.theme").value("dark"));
  }

  @Test
  void invalidSettingsAndMissingRevisionDoNotChangeIdentityOrAppearance() throws Exception {
    String token = authAnvu(); var board = create(token);
    String url = API_BOARD + "/" + board.get("boardUrl").asText();
    for (String invalid : new String[]{"{\"theme\":\"unknown\",\"radiusStep\":2,\"backgroundColor\":\"#ffffff\",\"pattern\":\"none\"}",
        "{\"theme\":\"dark\",\"radiusStep\":4,\"backgroundColor\":\"#ffffff\",\"pattern\":\"none\"}",
        "{\"theme\":\"dark\",\"radiusStep\":2,\"backgroundColor\":\"url(x)\",\"pattern\":\"none\"}",
        "{\"theme\":\"dark\",\"radiusStep\":2,\"backgroundColor\":\"#ffffff\",\"pattern\":\"unknown\"}", "{}"}) {
      var request = request(board); request.set("appearance", objectMapper.readTree(invalid));
      mockMvc.perform(patch(url + "/identity").header(AUTHORIZATION_HEADER, token)
          .contentType(MediaType.APPLICATION_JSON).content(request.toString())).andExpect(status().isBadRequest());
    }
    var missingVersion = request(board); missingVersion.remove("version");
    mockMvc.perform(patch(url + "/identity").header(AUTHORIZATION_HEADER, token)
        .contentType(MediaType.APPLICATION_JSON).content(missingVersion.toString())).andExpect(status().isBadRequest());
    var after = objectMapper.readTree(mockMvc.perform(get(url)).andReturn().getResponse().getContentAsString());
    assertEquals(board, after);
  }

  @Test
  void rejectsVisitorsAndOtherUsersButAllowsAdmin() throws Exception {
    String ownerToken = issueAuthTokenForUser("appearance-board-owner"); var board = create(ownerToken);
    String url = API_BOARD + "/" + board.get("boardUrl").asText() + "/identity";
    String payload = request(board).toString();
    mockMvc.perform(patch(url).contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isUnauthorized());
    String outsider = issueAuthTokenForUser("appearance-outsider");
    var user = appUserRepository.findById("appearance-outsider").orElseThrow();
    user.setRole("USER"); appUserRepository.saveAndFlush(user);
    mockMvc.perform(patch(url).header(AUTHORIZATION_HEADER, outsider).contentType(MediaType.APPLICATION_JSON)
        .content(payload)).andExpect(status().isForbidden());
    mockMvc.perform(authJson(patch(url), payload)).andExpect(status().isOk());
  }
}
