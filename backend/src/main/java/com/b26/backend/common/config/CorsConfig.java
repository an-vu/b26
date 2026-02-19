package com.b26.backend.common.config;

import java.util.Arrays;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
  private final ApiWriteAuthorizationInterceptor apiWriteAuthorizationInterceptor;

  public CorsConfig(ApiWriteAuthorizationInterceptor apiWriteAuthorizationInterceptor) {
    this.apiWriteAuthorizationInterceptor = apiWriteAuthorizationInterceptor;
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
    registry.addInterceptor(apiWriteAuthorizationInterceptor);
  }
}
