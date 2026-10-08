package com.b26.backend;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class BoardEditIntegrationTest extends ApiIntegrationTestSupport {
  private String createBoard(String token) throws Exception {
    var result = mockMvc.perform(post(API_BOARD).header(AUTHORIZATION_HEADER, token))
        .andExpect(status().isOk()).andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("boardUrl").asText();
  }

  private ObjectNode snapshot(String slug) throws Exception {
    var result = mockMvc.perform(auth(get(API_BOARD + "/" + slug + "/editor")))
        .andExpect(status().isOk()).andReturn();
    return (ObjectNode) objectMapper.readTree(result.getResponse().getContentAsString());
  }

  private ObjectNode payload(ObjectNode snapshot) {
    var payload = objectMapper.createObjectNode();
    payload.put("version", snapshot.get("board").get("version").asLong());
    payload.put("name", "Updated title");
    payload.put("headline", "Updated description");
    payload.set("widgets", snapshot.get("widgets").deepCopy());
    return payload;
  }

  @Test
  void savesMetadataAndWidgetsTogetherAndRejectsStaleRevision() throws Exception {
    String token = authAnvu();
    String slug = createBoard(token);
    var before = snapshot(slug);
    var request = payload(before);
    ((ObjectNode) request.get("widgets").get(0)).put("title", "Updated widget");
    mockMvc.perform(put(API_BOARD + "/" + slug + "/editor")
        .header(AUTHORIZATION_HEADER, token).contentType(MediaType.APPLICATION_JSON).content(request.toString()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.board.name").value("Updated title"))
        .andExpect(jsonPath("$.widgets[0].title").value("Updated widget"));
    var after = snapshot(slug);
    assertTrue(after.get("board").get("version").asLong() > before.get("board").get("version").asLong());
    request.put("name", "Stale overwrite");
    mockMvc.perform(put(API_BOARD + "/" + slug + "/editor")
        .header(AUTHORIZATION_HEADER, token).contentType(MediaType.APPLICATION_JSON).content(request.toString()))
        .andExpect(status().isConflict());
    assertEquals(after, snapshot(slug));
  }

  @Test
  void invalidLaterWidgetRollsBackEarlierWidgetWritesAndMetadata() throws Exception {
    String token = authAnvu();
    String slug = createBoard(token);
    var before = snapshot(slug);
    var request = payload(before);
    ((ObjectNode) request.get("widgets").get(0)).put("title", "Must roll back");
    var invalid = ((com.fasterxml.jackson.databind.node.ArrayNode) request.get("widgets")).addObject();
    invalid.put("type", "link").put("title", "Invalid URL").put("layout", "span-1")
        .put("enabled", true).put("order", 1);
    invalid.putObject("config").put("url", "http-not-a-url");
    mockMvc.perform(put(API_BOARD + "/" + slug + "/editor")
        .header(AUTHORIZATION_HEADER, token).contentType(MediaType.APPLICATION_JSON).content(request.toString()))
        .andExpect(status().isBadRequest());
    assertEquals(before, snapshot(slug));
  }

  @Test
  void rejectsBlankMetadataAndDuplicateWidgetIdsWithoutChangingBoard() throws Exception {
    String token = authAnvu();
    String slug = createBoard(token);
    var before = snapshot(slug);
    var request = payload(before).put("name", " ");
    mockMvc.perform(put(API_BOARD + "/" + slug + "/editor")
        .header(AUTHORIZATION_HEADER, token).contentType(MediaType.APPLICATION_JSON).content(request.toString()))
        .andExpect(status().isBadRequest());
    request.put("name", "Valid title");
    var widgets = (com.fasterxml.jackson.databind.node.ArrayNode) request.get("widgets");
    widgets.add(widgets.get(0).deepCopy());
    mockMvc.perform(put(API_BOARD + "/" + slug + "/editor")
        .header(AUTHORIZATION_HEADER, token).contentType(MediaType.APPLICATION_JSON).content(request.toString()))
        .andExpect(status().isBadRequest());
    assertEquals(before, snapshot(slug));
  }

  @Test
  void legacyMetadataWriteInvalidatesEditorRevision() throws Exception {
    String token = authAnvu();
    String slug = createBoard(token);
    var request = payload(snapshot(slug));
    mockMvc.perform(patch(API_BOARD + "/" + slug + "/meta").header(AUTHORIZATION_HEADER, token)
        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Other tab\",\"headline\":\"Changed\"}"))
        .andExpect(status().isOk());
    mockMvc.perform(put(API_BOARD + "/" + slug + "/editor")
        .header(AUTHORIZATION_HEADER, token).contentType(MediaType.APPLICATION_JSON).content(request.toString()))
        .andExpect(status().isConflict());
  }

  @Test
  void saveRequiresAnOwnerOrAdmin() throws Exception {
    String slug = createBoard(authAnvu());
    var request = payload(snapshot(slug));
    mockMvc.perform(put(API_BOARD + "/" + slug + "/editor")
        .contentType(MediaType.APPLICATION_JSON).content(request.toString()))
        .andExpect(status().isUnauthorized());
    var signup = mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"editor-outsider@example.com\",\"password\":\"test-password-123\"}"))
        .andExpect(status().isCreated()).andReturn();
    String token = "Bearer " + objectMapper.readTree(signup.getResponse().getContentAsString()).get("accessToken").asText();
    mockMvc.perform(put(API_BOARD + "/" + slug + "/editor").header(AUTHORIZATION_HEADER, token)
        .contentType(MediaType.APPLICATION_JSON).content(request.toString()))
        .andExpect(status().isForbidden());
  }
  @Test
  void identitySaveRejectsAnOutdatedRevision() throws Exception {
    String token = authAnvu();
    String slug = createBoard(token);
    long version = snapshot(slug).get("board").get("version").asLong();
    String request = objectMapper.writeValueAsString(java.util.Map.of(
        "boardName", "Renamed", "boardUrl", slug, "version", version));
    mockMvc.perform(patch(API_BOARD + "/" + slug + "/identity").header(AUTHORIZATION_HEADER, token)
        .contentType(MediaType.APPLICATION_JSON).content(request)).andExpect(status().isOk());
    mockMvc.perform(patch(API_BOARD + "/" + slug + "/identity").header(AUTHORIZATION_HEADER, token)
        .contentType(MediaType.APPLICATION_JSON).content(request)).andExpect(status().isConflict());
  }

}
