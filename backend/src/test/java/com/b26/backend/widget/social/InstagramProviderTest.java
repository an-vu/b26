package com.b26.backend.widget.social;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class InstagramProviderTest {
  private final ObjectMapper mapper = new ObjectMapper();
  @Test void validatesProfileUrls() {
    assertEquals("instagram", InstagramController.username("instagram.com/Instagram/"));
    for (String url : new String[]{"https://instagram.com.evil.test/name", "https://instagram.com/p/ABC", "https://user@instagram.com/name", "javascript:alert(1)", "https://instagram.com:99/name"}) assertNull(InstagramController.username(url));
  }
  @Test void limitsAndSortsPostsWithoutExposingOtherProfileData() throws Exception {
    var data = mapper.createArrayNode(); var profile = data.addObject();
    profile.put("username", "instagram").put("private", false).put("followersCount", 123456).put("profilePicUrl", "unused");
    var posts = profile.putArray("latestPosts");
    for (int i = 1; i <= 12; i++) posts.addObject().put("url", "https://www.instagram.com/p/POST" + i + "/")
      .put("displayUrl", "https://scontent.cdninstagram.com/" + i + ".jpg").put("timestamp", String.format("2026-10-%02dT00:00:00Z", i));
    var result = InstagramProvider.parse(data, "instagram");
    assertEquals(123456L, result.followersCount()); assertEquals(9, result.posts().size());
    assertTrue(result.posts().get(0).url().contains("POST12"));
    assertFalse(mapper.writeValueAsString(result).contains("profilePic"));
  }
  @Test void distinguishesPrivateFromFailedAndRejectsUnsafeImages() throws Exception {
    assertEquals("unavailable", InstagramProvider.parse(mapper.readTree("[{\"error\":\"blocked\"}]"), "instagram").status());
    assertEquals("private", InstagramProvider.parse(mapper.readTree("[{\"username\":\"instagram\",\"private\":true,\"latestPosts\":[{}]}]"), "instagram").status());
    var result = InstagramProvider.parse(mapper.readTree("[{\"username\":\"instagram\",\"private\":false,\"latestPosts\":[{\"url\":\"https://www.instagram.com/p/ABC/\",\"displayUrl\":\"https://evil.test/photo\",\"timestamp\":\"2026-10-01T00:00:00Z\"}]}]"), "instagram");
    assertTrue(result.posts().isEmpty()); assertNull(result.followersCount());
  }
}
