package com.b26.backend.auth.api;

import com.b26.backend.auth.domain.AuthService;
import com.b26.backend.common.config.ApiAccess;
import com.b26.backend.common.config.CurrentUser;
import com.b26.backend.user.persistence.AppUserEntity;
import static com.b26.backend.common.config.ApiAccess.Policy.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/signup")
  @ApiAccess(PUBLIC)
  @ResponseStatus(HttpStatus.CREATED)
  public AuthSessionResponse signup(@Valid @RequestBody SignupRequest request) {
    return authService.signup(request);
  }

  @PostMapping("/signin")
  @ApiAccess(PUBLIC)
  public AuthSessionResponse signin(@Valid @RequestBody SigninRequest request, HttpServletRequest servletRequest) {
    String sourceIp = servletRequest.getRemoteAddr() == null ? "unknown" : servletRequest.getRemoteAddr();
    return authService.signin(request, sourceIp);
  }

  @GetMapping("/me")
  @ApiAccess(AUTHENTICATED)
  public AuthMeResponse me(@CurrentUser AppUserEntity user) {
    return authService.me(user);
  }

  @PostMapping("/signout")
  @ApiAccess(AUTHENTICATED)
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void signout(
      @RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
    // Revocation needs the presented token, not just its user.
    authService.signout(authorizationHeader);
  }
}
