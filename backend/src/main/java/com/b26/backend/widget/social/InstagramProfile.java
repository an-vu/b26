package com.b26.backend.widget.social;

import java.util.List;
public record InstagramProfile(String status, Long followersCount, List<Post> posts) {
  public record Post(String url, String imageUrl, String timestamp) {}
  public static InstagramProfile state(String status) { return new InstagramProfile(status, null, List.of()); }
}
