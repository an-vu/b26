package com.b26.backend.common.config;

import com.b26.backend.auth.domain.AuthForbiddenException;
import com.b26.backend.auth.domain.AuthService;
import com.b26.backend.board.domain.BoardAccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

@Component
public class ApiAuthorizationInterceptor implements HandlerInterceptor {
  private final AuthService authService;
  private final BoardAccessService boardAccess;

  public ApiAuthorizationInterceptor(AuthService authService, BoardAccessService boardAccess) {
    this.authService = authService;
    this.boardAccess = boardAccess;
  }

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
    // Preflight, missing routes and framework endpoints keep their normal MVC behavior.
    if (!(handler instanceof HandlerMethod method)) return true;
    String packageName = method.getBeanType().getPackageName();
    if (!packageName.equals("com.b26.backend") && !packageName.startsWith("com.b26.backend.")) return true;

    ApiAccess access = AnnotatedElementUtils.findMergedAnnotation(method.getMethod(), ApiAccess.class);
    if (access == null) {
      access = AnnotatedElementUtils.findMergedAnnotation(method.getBeanType(), ApiAccess.class);
    }
    // New application endpoints must explicitly choose a policy.
    if (access == null) throw new AuthForbiddenException();

    String authorization = request.getHeader("Authorization");
    switch (access.value()) {
      case PUBLIC -> { }
      case AUTHENTICATED -> authService.getAuthenticatedUser(authorization);
      case BOARD_READ, BOARD_OWNER_READ -> boardAccess.requireRead(
          boardKey(request, access), access.byId(),
          access.value() == ApiAccess.Policy.BOARD_OWNER_READ, authorization);
      case BOARD_WRITE -> boardAccess.requireWrite(boardKey(request, access), access.byId(), authorization);
    }
    return true;
  }

  private static String boardKey(HttpServletRequest request, ApiAccess access) {
    Object variables = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
    if (variables instanceof Map<?, ?> paths
        && paths.get(access.boardVariable()) instanceof String key && !key.isBlank()) return key;
    throw new AuthForbiddenException();
  }
}
