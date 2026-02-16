package com.bento26.backend.common.config;

import java.util.Arrays;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.HandlerInterceptor;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
  @Value("${app.cors.allowed-origins:http://localhost:4200}")
  private String allowedOrigins;
  @Value("${app.security.admin-token:}")
  private String adminToken;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    String[] origins =
        Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isEmpty())
            .toArray(String[]::new);

    registry
        .addMapping("/api/**")
        .allowedOrigins(origins)
        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        .allowedHeaders("*");
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(
        new HandlerInterceptor() {
          @Override
          public boolean preHandle(
              HttpServletRequest request, HttpServletResponse response, Object handler)
              throws Exception {
            if (adminToken == null || adminToken.isBlank()) {
              return true;
            }

            String method = request.getMethod();
            String uri = request.getRequestURI();
            boolean isWrite = !"GET".equalsIgnoreCase(method) && !"OPTIONS".equalsIgnoreCase(method);
            boolean isBoardWrite = uri.startsWith("/api/board");
            boolean isSystemWrite = uri.startsWith("/api/system");
            boolean isUserMeWrite = uri.equals("/api/users/me") || uri.startsWith("/api/users/me/");
            if (!isWrite || (!isBoardWrite && !isSystemWrite && !isUserMeWrite)) {
              return true;
            }

            String providedToken = request.getHeader("X-Admin-Token");
            if (adminToken.equals(providedToken)) {
              return true;
            }

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Unauthorized\"}");
            return false;
          }
        });
  }
}
