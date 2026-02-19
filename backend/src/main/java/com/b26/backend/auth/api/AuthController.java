package com.b26.backend.auth.api;

import com.b26.backend.auth.domain.AuthService;
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
  @ResponseStatus(HttpStatus.CREATED)
  public AuthSessionResponse signup(@Valid @RequestBody SignupRequest request) {
    return authService.signup(request);
  }

  @PostMapping("/signin")
  public AuthSessionResponse signin(@Valid @RequestBody SigninRequest request) {
    return authService.signin(request);
  }

  @GetMapping("/me")
  public AuthMeResponse me(@RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
    return authService.me(authorizationHeader);
  }

  @PostMapping("/signout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void signout(
      @RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
    authService.signout(authorizationHeader);
  }
}
