package com.b26.backend.common.config;

import com.b26.backend.auth.domain.AuthService;
import com.b26.backend.auth.domain.AuthUnauthorizedException;
import com.b26.backend.board.domain.BoardNotFoundException;
import com.b26.backend.board.persistence.BoardEntity;
import com.b26.backend.board.persistence.BoardRepository;
import com.b26.backend.user.persistence.AppUserEntity;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class ApiWriteAuthorizationInterceptor implements HandlerInterceptor {
  private final AuthService authService;
  private final BoardRepository boardRepository;

  @Value("${app.security.admin-token:}")
  private String adminToken;

  public ApiWriteAuthorizationInterceptor(AuthService authService, BoardRepository boardRepository) {
    this.authService = authService;
    this.boardRepository = boardRepository;
  }

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
      throws Exception {
    if (!isWriteMethod(request.getMethod())) {
      return true;
    }

    String uri = request.getRequestURI();
    if (uri == null || !uri.startsWith("/api/")) {
      return true;
    }

    if (uri.startsWith("/api/auth")) {
      return true;
    }

    if (uri.startsWith("/api/users/me")) {
      return requireAuthenticatedUser(request, response) != null;
    }

    if (uri.startsWith("/api/system")) {
      return authorizeSystemWrite(request, response);
    }

    if (uri.startsWith("/api/board")) {
      return authorizeBoardWrite(request, response, uri);
    }

    return true;
  }

  private boolean authorizeBoardWrite(
      HttpServletRequest request, HttpServletResponse response, String uri) throws Exception {
    AppUserEntity user = requireAuthenticatedUser(request, response);
    if (user == null) {
      return false;
    }

    String boardUrl = extractBoardUrlSlug(uri);
    if (boardUrl == null) {
      return true;
    }

    BoardEntity board =
        boardRepository
            .findByBoardUrl(boardUrl)
            .orElseThrow(() -> new BoardNotFoundException(boardUrl));

    if (isAdmin(user) || user.getId().equals(board.getOwnerUserId())) {
      return true;
    }

    writeError(response, HttpServletResponse.SC_FORBIDDEN, "Forbidden");
    return false;
  }

  private boolean authorizeSystemWrite(HttpServletRequest request, HttpServletResponse response)
      throws Exception {
    String providedAdminToken = request.getHeader("X-Admin-Token");
    if (adminToken != null
        && !adminToken.isBlank()
        && adminToken.equals(providedAdminToken)) {
      return true;
    }

    AppUserEntity user = requireAuthenticatedUser(request, response);
    if (user == null) {
      return false;
    }

    if (isAdmin(user)) {
      return true;
    }

    writeError(response, HttpServletResponse.SC_FORBIDDEN, "Forbidden");
    return false;
  }

  private AppUserEntity requireAuthenticatedUser(
      HttpServletRequest request, HttpServletResponse response) throws Exception {
    try {
      return authService.getAuthenticatedUser(request.getHeader("Authorization"));
    } catch (AuthUnauthorizedException exception) {
      writeError(response, HttpServletResponse.SC_UNAUTHORIZED, exception.getMessage());
      return null;
    }
  }

  private static boolean isWriteMethod(String method) {
    return method != null
        && !"GET".equalsIgnoreCase(method)
        && !"OPTIONS".equalsIgnoreCase(method);
  }

  private static boolean isAdmin(AppUserEntity user) {
    return user.getRole() != null && "ADMIN".equalsIgnoreCase(user.getRole().trim());
  }

  private static String extractBoardUrlSlug(String uri) {
    String prefix = "/api/board/";
    if (!uri.startsWith(prefix)) {
      return null;
    }
    String remainder = uri.substring(prefix.length());
    if (remainder.isBlank()) {
      return null;
    }
    int nextSlash = remainder.indexOf('/');
    String slug = nextSlash >= 0 ? remainder.substring(0, nextSlash) : remainder;
    return slug.isBlank() ? null : slug;
  }

  private static void writeError(HttpServletResponse response, int status, String message)
      throws Exception {
    response.setStatus(status);
    response.setContentType("application/json");
    response.getWriter().write("{\"message\":\"" + escapeJson(message) + "\"}");
  }

  private static String escapeJson(String value) {
    return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
  }
}
