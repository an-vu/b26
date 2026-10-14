package com.b26.backend.widget.social;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class InstagramProvider {
  private final String token;
  private final ObjectMapper mapper;
  private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
  public InstagramProvider(@Value("${app.instagram.apify-token:}") String token, ObjectMapper mapper) {
    this.token = token; this.mapper = mapper;
  }
  public boolean configured() { return !token.isBlank(); }
  public InstagramProfile fetch(String username) throws Exception {
    // Profile requests use a fixed destination; image fetching is separately restricted to Instagram CDNs.
    var request = HttpRequest.newBuilder(URI.create("https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?timeout=60&maxItems=1&maxTotalChargeUsd=0.02"))
        .timeout(Duration.ofSeconds(70)).header("Authorization", "Bearer " + token)
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(Map.of("usernames", List.of(username), "includeAboutSection", false)))).build();
    var response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
    try (var stream = response.body()) {
      if (response.statusCode() != 200 && response.statusCode() != 201) throw new IllegalStateException("Instagram provider unavailable");
      byte[] body = stream.readNBytes(2_000_001);
      if (body.length > 2_000_000) throw new IllegalStateException("Instagram response too large");
      return parse(mapper.readTree(body), username);
    }
  }
  static InstagramProfile parse(JsonNode data, String username) {
    if (!data.isArray() || data.isEmpty()) return InstagramProfile.state("unavailable");
    JsonNode profile = data.get(0);
    if (!profile.path("username").asText().equalsIgnoreCase(username) || profile.has("error")) return InstagramProfile.state("unavailable");
    if (!profile.path("private").isBoolean()) return InstagramProfile.state("unavailable");
    if (profile.path("private").asBoolean()) return InstagramProfile.state("private");
    Long followers = profile.path("followersCount").isIntegralNumber() && profile.path("followersCount").canConvertToLong()
        && profile.path("followersCount").asLong() >= 0 ? profile.path("followersCount").asLong() : null;
    List<InstagramProfile.Post> posts = new ArrayList<>();
    for (JsonNode post : profile.path("latestPosts")) {
      String url = post.path("url").asText(), image = post.path("displayUrl").asText(), time = post.path("timestamp").asText();
      try {
        URI link = URI.create(url), photo = URI.create(image);
        if (!safe(link) || !Set.of("instagram.com", "www.instagram.com").contains(link.getHost()) || !link.getPath().matches("/(p|reel|tv)/[A-Za-z0-9_-]+/?")) continue;
        if (!safeImage(photo)) continue;
        Instant.parse(time);
        if (posts.stream().noneMatch(p -> p.url().equals(url))) posts.add(new InstagramProfile.Post(url, image, time));
      } catch (RuntimeException ignored) { /* Ignore malformed provider data. */ }
    }
    posts.sort(Comparator.comparing((InstagramProfile.Post p) -> Instant.parse(p.timestamp())).reversed());
    return new InstagramProfile("ready", followers, posts.stream().limit(9).toList());
  }
  private static final HttpClient IMAGE_CLIENT = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(10)).followRedirects(HttpClient.Redirect.NEVER).build();
  static byte[] image(String url) throws Exception {
    URI uri = URI.create(url);
    if (!safeImage(uri))
      throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_GATEWAY);
    var response = IMAGE_CLIENT.send(HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(20)).GET().build(), HttpResponse.BodyHandlers.ofInputStream());
    try (var stream = response.body()) {
      byte[] bytes = stream.readNBytes(4_000_001);
      // Only serve JPEG media, never provider HTML or arbitrary executable content.
      if (response.statusCode() != 200 || bytes.length > 4_000_000 || bytes.length < 3
          || (bytes[0] & 255) != 255 || (bytes[1] & 255) != 216 || (bytes[2] & 255) != 255)
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_GATEWAY);
      return bytes;
    }
  }
  private static boolean safeImage(URI uri) {
    return safe(uri) && (uri.getHost().endsWith(".cdninstagram.com") || uri.getHost().endsWith(".fbcdn.net"));
  }
  private static boolean safe(URI uri) { return "https".equals(uri.getScheme()) && uri.getHost() != null && uri.getUserInfo() == null && uri.getPort() == -1; }
}
