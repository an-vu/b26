package com.b26.backend.common.config;

import com.b26.backend.common.api.AuthException;
import com.b26.backend.user.persistence.AppUserEntity;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {
  @Override
  public boolean supportsParameter(MethodParameter parameter) {
    return parameter.hasParameterAnnotation(CurrentUser.class)
        && AppUserEntity.class.equals(parameter.getParameterType());
  }

  @Override
  public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
      NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
    Object user = webRequest.getAttribute(ApiAuthorizationInterceptor.CURRENT_USER, RequestAttributes.SCOPE_REQUEST);
    if (user == null && parameter.getParameterAnnotation(CurrentUser.class).required()) {
      // Only reachable if an endpoint asks for a user its access policy never resolved.
      throw AuthException.unauthorized("Missing Authorization header");
    }
    return user;
  }
}
