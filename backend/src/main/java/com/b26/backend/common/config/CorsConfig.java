package com.b26.backend.common.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
  private final ApiAuthorizationInterceptor apiAuthorizationInterceptor;
  private final CurrentUserArgumentResolver currentUserArgumentResolver;

  public CorsConfig(ApiAuthorizationInterceptor apiAuthorizationInterceptor,
      CurrentUserArgumentResolver currentUserArgumentResolver) {
    this.apiAuthorizationInterceptor = apiAuthorizationInterceptor;
    this.currentUserArgumentResolver = currentUserArgumentResolver;
  }

  @org.springframework.beans.factory.annotation.Value("${app.cors.allowed-origins:http://localhost:4200}")
  private String allowedOrigins;

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
    registry.addInterceptor(apiAuthorizationInterceptor);
  }

  @Override
  public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
    resolvers.add(currentUserArgumentResolver);
  }
}
