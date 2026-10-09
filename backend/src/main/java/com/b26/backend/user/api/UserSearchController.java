package com.b26.backend.user.api;

import com.b26.backend.user.persistence.AppUserRepository;
import com.b26.backend.common.config.ApiAccess;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@ApiAccess(ApiAccess.Policy.PUBLIC)
public class UserSearchController {
  private final AppUserRepository users;

  public UserSearchController(AppUserRepository users) {
    this.users = users;
  }

  @GetMapping("/api/search/users")
  public List<UserSearchDto> search(@RequestParam(defaultValue = "") String q) {
    if (q.length() > 128) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search is too long");
    }
    String query = q.trim().toLowerCase(Locale.ROOT);
    if (query.startsWith("@")) query = query.substring(1);
    if (query.length() > 64) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use at most 64 characters");
    }
    if (!query.matches("[a-z0-9-]{2,64}")) return List.of();
    return users.findByUsernameContainingIgnoreCaseOrderByUsernameAsc(query, PageRequest.of(0, 10))
        .stream().map(user -> new UserSearchDto(user.getUsername(), user.getDisplayName())).toList();
  }
}
