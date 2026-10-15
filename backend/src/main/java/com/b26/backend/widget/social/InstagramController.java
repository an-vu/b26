package com.b26.backend.widget.social;

import com.b26.backend.common.api.NotFoundException;
import com.b26.backend.common.config.ApiAccess;
import com.b26.backend.widget.domain.WidgetService;
import java.net.URI;
import java.util.Locale;
import java.util.Set;
import org.springframework.web.bind.annotation.*;

@RestController
@ApiAccess(value = ApiAccess.Policy.BOARD_READ, byId = true)
@RequestMapping("/api/board/{boardId}/widgets/{widgetId}/instagram")
public class InstagramController {
  private final WidgetService widgets;
  private final InstagramService instagram;
  private final InstagramImageCache images;
  public InstagramController(WidgetService widgets, InstagramService instagram, InstagramImageCache images) {
    this.widgets = widgets;
    this.instagram = instagram;
    this.images = images;
  }
  @GetMapping
  public InstagramProfile get(@PathVariable String boardId, @PathVariable long widgetId, @RequestParam String expectedUsername) {
    var widget = widgets.getWidgetByBoardId(boardId, widgetId);
    if (!widget.enabled() || !widget.type().equals("link")) throw new NotFoundException("Instagram profile not found");
    String username = username(widget.config().path("url").asText());
    if (username == null) throw new NotFoundException("Instagram profile not found");
    if (!username.equalsIgnoreCase(expectedUsername)) return InstagramProfile.state("unavailable");
    return instagram.get(username);
  }
  @GetMapping("/images/{index}")
  public org.springframework.http.ResponseEntity<byte[]> image(@PathVariable String boardId,
      @PathVariable long widgetId, @PathVariable int index, @RequestParam String expectedUsername) throws Exception {
    var profile = get(boardId, widgetId, expectedUsername);
    if (index < 0 || index >= profile.posts().size()) throw new NotFoundException("Instagram post not found");
    return org.springframework.http.ResponseEntity.ok()
        .header("Cache-Control", "private, max-age=300")
        .header("X-Content-Type-Options", "nosniff")
        .contentType(org.springframework.http.MediaType.IMAGE_JPEG)
        .body(images.get(profile.posts().get(index).imageUrl()));
  }

  static String username(String url) {
    try {
      URI uri = URI.create(url.matches("(?i)^https?://.*") ? url : "https://" + url);
      if (!Set.of("https", "http").contains(uri.getScheme()) || uri.getHost() == null || !Set.of("instagram.com", "www.instagram.com").contains(uri.getHost().toLowerCase(Locale.ROOT)) || uri.getUserInfo() != null || uri.getPort() != -1) return null;
      String name = uri.getPath().replaceAll("^/|/$", "").toLowerCase(Locale.ROOT);
      return name.matches("[a-z0-9_.]{1,30}") && !Set.of("p", "reel", "reels", "stories", "explore", "accounts", "direct", "about").contains(name) ? name : null;
    } catch (RuntimeException error) { return null; }
  }
}
