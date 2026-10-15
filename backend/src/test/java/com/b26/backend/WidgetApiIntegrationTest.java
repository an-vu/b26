package com.b26.backend;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WidgetApiIntegrationTest extends ApiIntegrationTestSupport {

  @Test
  void getWidgets_returns200WithSeededData() throws Exception {
    mockMvc
        .perform(get(API_BOARD_DEFAULT_WIDGETS))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$[0].type").isNotEmpty())
        .andExpect(jsonPath("$[0].config").exists());
  }

  @Test
  void getWidgets_missingBoard_returns404() throws Exception {
    mockMvc
        .perform(get("/api/board/not-here/widgets"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.message").value("Board not found: not-here"));
  }

  @Test
  void editorCreatesUpdatesAndDeletesWidgetsWithJsonConfig() throws Exception {
    ObjectNode request = editorRequest("default");
    ArrayNode widgets = (ArrayNode) request.get("widgets");
    int seeded = widgets.size();
    ObjectNode map = widgets.addObject().put("type", "map").put("title", "Places").put("layout", "span-2")
        .put("enabled", true).put("order", 1000);
    map.putObject("config").putArray("places").add("Omaha, NE").add("Austin, TX");
    var saved = save("default", request);
    assertEquals(seeded + 1, saved.get("widgets").size());
    var created = (ObjectNode) saved.get("widgets").get(seeded);
    assertEquals(2, created.at("/config/places").size());

    ObjectNode update = editorRequest("default");
    ((ObjectNode) update.get("widgets").get(seeded)).put("title", "Updated Places");
    var updated = save("default", update);
    assertEquals("Updated Places", updated.get("widgets").get(seeded).get("title").asText());
    assertEquals(created.get("id"), updated.get("widgets").get(seeded).get("id"));

    ObjectNode removal = editorRequest("default");
    ((ArrayNode) removal.get("widgets")).remove(seeded);
    mockMvc.perform(authJson(put("/api/board/default/editor"), removal.toString()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.widgets.length()").value(seeded));
  }

  @Test
  void editorRejectsInvalidConfigAndUnsupportedLayout() throws Exception {
    ObjectNode request = editorRequest("default");
    ObjectNode embed = ((ArrayNode) request.get("widgets")).addObject().put("type", "embed").put("title", "Bad Embed")
        .put("layout", "span-1").put("enabled", true).put("order", 0);
    embed.putObject("config").put("embedUrl", "not-a-url");
    mockMvc.perform(authJson(put("/api/board/default/editor"), request.toString()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].message").value("embed config requires a valid http embedUrl"));
    embed.put("layout", "span-9");
    ((ObjectNode) embed.get("config")).put("embedUrl", "https://example.com/embed");
    mockMvc.perform(authJson(put("/api/board/default/editor"), request.toString()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].message").value("unsupported widget layout: span-9"));
  }

  @Test
  void editorCannotClaimAnotherBoardsWidget() throws Exception {
    long foreign = createLink("berkshire");
    ObjectNode request = editorRequest("default");
    ObjectNode copy = ((ArrayNode) request.get("widgets")).addObject().put("id", foreign).put("type", "link")
        .put("title", "Moved").put("layout", "span-1").put("enabled", true).put("order", 0);
    copy.putObject("config").put("url", "https://example.com/");
    mockMvc.perform(authJson(put("/api/board/default/editor"), request.toString()))
        .andExpect(status().isNotFound());
  }

  @Test
  void singleWidgetWriteEndpointsAreGone() throws Exception {
    long widgetId = createLink("default");
    String payload = "{\"type\":\"link\",\"title\":\"x\",\"layout\":\"span-1\",\"config\":{},\"enabled\":true,\"order\":0}";
    mockMvc.perform(authJson(post(API_BOARD_DEFAULT_WIDGETS), payload)).andExpect(status().is4xxClientError());
    mockMvc.perform(authJson(put(API_BOARD_DEFAULT_WIDGETS + "/" + widgetId), payload)).andExpect(status().is4xxClientError());
    mockMvc.perform(authJson(put(API_BOARD_DEFAULT_WIDGETS + "/sync"), "{\"widgets\":[]}")).andExpect(status().is4xxClientError());
    mockMvc.perform(auth(delete(API_BOARD_DEFAULT_WIDGETS + "/" + widgetId))).andExpect(status().is4xxClientError());
    assertEquals(true, widgetRepository.findById(widgetId).isPresent());
  }

  private ObjectNode editorRequest(String slug) throws Exception {
    var snapshot = objectMapper.readTree(mockMvc.perform(auth(get(API_BOARD + "/" + slug + "/editor")))
        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    ObjectNode request = objectMapper.createObjectNode();
    request.put("version", snapshot.at("/board/version").asLong());
    request.put("name", snapshot.at("/board/name").asText());
    request.put("headline", snapshot.at("/board/headline").asText());
    request.set("widgets", snapshot.get("widgets").deepCopy());
    return request;
  }

  private com.fasterxml.jackson.databind.JsonNode save(String slug, ObjectNode request) throws Exception {
    return objectMapper.readTree(mockMvc.perform(authJson(put(API_BOARD + "/" + slug + "/editor"), request.toString())
            .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  }
}
