package com.b26.backend.auth.domain;

import com.b26.backend.auth.api.AuthMeResponse;
import com.b26.backend.auth.api.AuthSessionResponse;
import com.b26.backend.auth.api.AuthUserDto;
import com.b26.backend.auth.api.SigninRequest;
import com.b26.backend.auth.api.SignupRequest;
import com.b26.backend.auth.persistence.AuthSessionEntity;
import com.b26.backend.auth.persistence.AuthSessionRepository;
import com.b26.backend.user.persistence.AppUserEntity;
import com.b26.backend.user.persistence.AppUserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private static final SecureRandom SECURE_RANDOM = new SecureRandom();

  private final AppUserRepository appUserRepository;
  private final AuthSessionRepository authSessionRepository;
  private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);
  private final Duration sessionTtl;

  public AuthService(
      AppUserRepository appUserRepository,
      AuthSessionRepository authSessionRepository,
      @Value("${app.auth.session-ttl-hours:720}") long sessionTtlHours) {
    this.appUserRepository = appUserRepository;
    this.authSessionRepository = authSessionRepository;
    this.sessionTtl = Duration.ofHours(Math.max(1, sessionTtlHours));
  }

  @Transactional
  public AuthSessionResponse signup(SignupRequest request) {
    String normalizedEmail = normalizeEmail(request.email());
    String normalizedUsername = normalizeUsername(request.username());
    String normalizedDisplayName = normalizeDisplayName(request.displayName());

    if (appUserRepository.existsByEmailIgnoreCase(normalizedEmail)) {
      throw new AuthConflictException("email already in use");
    }
    if (appUserRepository.existsByUsernameIgnoreCase(normalizedUsername)) {
      throw new AuthConflictException("username already in use");
    }

    AppUserEntity user = new AppUserEntity();
    user.setId(UUID.randomUUID().toString());
    user.setEmail(normalizedEmail);
    user.setUsername(normalizedUsername);
    user.setDisplayName(normalizedDisplayName);
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setRole("USER");

    AppUserEntity savedUser = appUserRepository.save(user);
    return createSession(savedUser);
  }

  @Transactional
  public AuthSessionResponse signin(SigninRequest request) {
    String normalizedEmail = normalizeEmail(request.email());

    AppUserEntity user =
        appUserRepository
            .findByEmailIgnoreCase(normalizedEmail)
            .orElseThrow(() -> new AuthUnauthorizedException("Invalid email or password"));

    if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new AuthUnauthorizedException("Invalid email or password");
    }

    return createSession(user);
  }

  @Transactional(readOnly = true)
  public AuthMeResponse me(String bearerToken) {
    AppUserEntity user = getAuthenticatedUser(bearerToken);
    return new AuthMeResponse(toUserDto(user));
  }

  @Transactional
  public void signout(String bearerToken) {
    String tokenHash = sha256(requireToken(bearerToken));
    AuthSessionEntity session =
        authSessionRepository
            .findByTokenHashAndRevokedAtIsNull(tokenHash)
            .orElseThrow(() -> new AuthUnauthorizedException("Invalid or expired session"));

    if (session.getExpiresAt().isBefore(Instant.now())) {
      throw new AuthUnauthorizedException("Invalid or expired session");
    }

    session.setRevokedAt(Instant.now());
    authSessionRepository.save(session);
  }

  @Transactional(readOnly = true)
  public AppUserEntity getAuthenticatedUser(String bearerToken) {
    return resolveUserByToken(bearerToken);
  }

  private AppUserEntity resolveUserByToken(String bearerToken) {
    String tokenHash = sha256(requireToken(bearerToken));

    AuthSessionEntity session =
        authSessionRepository
            .findByTokenHashAndRevokedAtIsNull(tokenHash)
            .orElseThrow(() -> new AuthUnauthorizedException("Invalid or expired session"));

    if (session.getExpiresAt().isBefore(Instant.now())) {
      throw new AuthUnauthorizedException("Invalid or expired session");
    }

    return appUserRepository
        .findById(session.getUserId())
        .orElseThrow(() -> new AuthUnauthorizedException("Session user no longer exists"));
  }

  private AuthSessionResponse createSession(AppUserEntity user) {
    byte[] tokenBytes = new byte[32];
    SECURE_RANDOM.nextBytes(tokenBytes);
    String accessToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

    Instant now = Instant.now();
    AuthSessionEntity session = new AuthSessionEntity();
    session.setId(UUID.randomUUID().toString());
    session.setUserId(user.getId());
    session.setTokenHash(sha256(accessToken));
    session.setCreatedAt(now);
    session.setExpiresAt(now.plus(sessionTtl));

    authSessionRepository.save(session);

    return new AuthSessionResponse(accessToken, session.getExpiresAt(), toUserDto(user));
  }

  private static AuthUserDto toUserDto(AppUserEntity user) {
    return new AuthUserDto(
        user.getId(),
        user.getDisplayName(),
        user.getUsername(),
        user.getEmail(),
        user.getRole());
  }

  private static String requireToken(String bearerToken) {
    if (bearerToken == null || bearerToken.isBlank()) {
      throw new AuthUnauthorizedException("Missing Authorization header");
    }
    String value = bearerToken.trim();
    if (!value.regionMatches(true, 0, "Bearer ", 0, 7)) {
      throw new AuthUnauthorizedException("Invalid Authorization header format");
    }
    String token = value.substring(7).trim();
    if (token.isEmpty()) {
      throw new AuthUnauthorizedException("Missing bearer token");
    }
    return token;
  }

  private static String normalizeEmail(String email) {
    String normalized = email == null ? "" : email.trim().toLowerCase();
    if (normalized.isEmpty()) {
      throw new InvalidAuthRequestException("email is required");
    }
    return normalized;
  }

  private static String normalizeUsername(String username) {
    String normalized = username == null ? "" : username.trim().toLowerCase();
    if (!normalized.matches("^[a-z0-9]+(?:-[a-z0-9]+)*$")) {
      throw new InvalidAuthRequestException("username format is invalid");
    }
    return normalized;
  }

  private static String normalizeDisplayName(String displayName) {
    String normalized = displayName == null ? "" : displayName.trim();
    if (normalized.isEmpty()) {
      throw new InvalidAuthRequestException("displayName is required");
    }
    return normalized;
  }

  private static String sha256(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
      StringBuilder builder = new StringBuilder(hash.length * 2);
      for (byte b : hash) {
        builder.append(String.format("%02x", b));
      }
      return builder.toString();
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 not available", exception);
    }
  }
}
