package com.b26.backend.common.config;

import com.b26.backend.auth.domain.AuthService;
import com.b26.backend.board.domain.BoardAccessService;
import com.b26.backend.common.api.AuthException;
import com.b26.backend.user.persistence.AppUserEntity;
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
  /** Request attribute holding the session user resolved during admission; read via {@link CurrentUser}. */
  public static final String CURRENT_USER = ApiAuthorizationInterceptor.class.getName() + ".user";

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
    if (access == null) throw AuthException.forbidden();

    String authorization = request.getHeader("Authorization");
    AppUserEntity user = switch (access.value()) {
      case PUBLIC -> null;
      case AUTHENTICATED -> authService.getAuthenticatedUser(authorization);
      case BOARD_READ, BOARD_OWNER_READ -> {
        String key = boardKey(request, access);
        AppUserEntity reader = authService.findAuthenticatedUser(authorization).orElse(null);
        boardAccess.requireRead(key, access.byId(), access.value() == ApiAccess.Policy.BOARD_OWNER_READ, reader);
        yield reader;
      }
      case BOARD_WRITE -> {
        String key = boardKey(request, access);
        AppUserEntity writer = authService.getAuthenticatedUser(authorization);
        boardAccess.requireWrite(key, access.byId(), writer);
        yield writer;
      }
    };
    if (user != null) request.setAttribute(CURRENT_USER, user);
    return true;
  }

  private static String boardKey(HttpServletRequest request, ApiAccess access) {
    Object variables = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
    if (variables instanceof Map<?, ?> paths
        && paths.get(access.boardVariable()) instanceof String key && !key.isBlank()) return key;
    throw AuthException.forbidden();
  }
}
