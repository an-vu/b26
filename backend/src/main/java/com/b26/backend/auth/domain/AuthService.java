package com.b26.backend.auth.domain;

import com.b26.backend.board.domain.BoardService;
import com.b26.backend.user.persistence.UserPreferenceEntity;
import com.b26.backend.user.persistence.UserPreferenceRepository;
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
import java.util.Optional;
import java.util.UUID;
import com.b26.backend.common.api.ApiException;
import com.b26.backend.common.api.AuthException;
import com.b26.backend.common.api.BadRequestException;
import com.b26.backend.common.api.ConflictException;
import com.b26.backend.user.domain.UsernameRules;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private static final SecureRandom SECURE_RANDOM = new SecureRandom();

  private final AppUserRepository appUserRepository;
  private final AuthSessionRepository authSessionRepository;
  private final BoardService boardService;
  private final UserPreferenceRepository userPreferenceRepository;
  private final SigninAttemptGuard signinAttempts;
  private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);
  // Unknown emails still pay for one hash check, so response time does not reveal registered emails.
  private final String timingEqualizerHash = passwordEncoder.encode(UUID.randomUUID().toString());
  private final Duration sessionTtl;
  private final boolean requirePasswordForSignin;

  public AuthService(
      AppUserRepository appUserRepository,
      AuthSessionRepository authSessionRepository,
      BoardService boardService,
      UserPreferenceRepository userPreferenceRepository,
      SigninAttemptGuard signinAttempts,
      @Value("${app.auth.session-ttl-hours:720}") long sessionTtlHours,
      @Value("${app.auth.require-password:true}") boolean requirePasswordForSignin) {
    this.appUserRepository = appUserRepository;
    this.authSessionRepository = authSessionRepository;
    this.boardService = boardService;
    this.userPreferenceRepository = userPreferenceRepository;
    this.signinAttempts = signinAttempts;
    this.sessionTtl = Duration.ofHours(Math.max(1, sessionTtlHours));
    this.requirePasswordForSignin = requirePasswordForSignin;
  }

  @Transactional
  public AuthSessionResponse signup(SignupRequest request) {
    String normalizedEmail = normalizeEmail(request.email());
    String normalizedUsername = normalizeUsername(request.username());
    if (normalizedUsername.isEmpty()) {
      normalizedUsername = ensureUniqueUsername(deriveUsernameSeedFromEmail(normalizedEmail));
    } else if (UsernameRules.isReserved(normalizedUsername)) {
      throw new BadRequestException("auth", "username is reserved");
    } else if (appUserRepository.existsByUsernameIgnoreCase(normalizedUsername)) {
      throw new ConflictException("username already in use");
    }

    String normalizedDisplayName = normalizeDisplayName(request.displayName());
    if (normalizedDisplayName.isEmpty()) {
      normalizedDisplayName = defaultDisplayNameFromUsername(normalizedUsername);
    }

    if (appUserRepository.existsByEmailIgnoreCase(normalizedEmail)) {
      throw new ConflictException("email already in use");
    }

    AppUserEntity user = new AppUserEntity();
    user.setId(UUID.randomUUID().toString());
    user.setEmail(normalizedEmail);
    user.setUsername(normalizedUsername);
    user.setDisplayName(normalizedDisplayName);
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setRole("USER");

    AppUserEntity savedUser = appUserRepository.save(user);
    boardService.createStarterBoardForOwner(savedUser);
    UserPreferenceEntity preference = new UserPreferenceEntity();
    preference.setUserId(savedUser.getId());
    preference.setMainBoardId(null);
    userPreferenceRepository.save(preference);
    return createSession(savedUser);
  }

  @Transactional
  public AuthSessionResponse signin(SigninRequest request, String sourceIp) {
    String normalizedEmail = normalizeEmail(request.email());
    String suppliedPassword = request.password();
    // Validate the request shape before any lookup so responses never reveal whether an email exists.
    if (requirePasswordForSignin) {
      if (suppliedPassword == null || suppliedPassword.isBlank()) {
        throw new BadRequestException("auth", "password is required");
      }
      if (suppliedPassword.length() < 8 || suppliedPassword.length() > 72) {
        throw new BadRequestException("auth", "password must be between 8 and 72 characters");
      }
    }
    if (signinAttempts.isBlocked(normalizedEmail, sourceIp)) {
      throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many sign-in attempts. Try again later.");
    }

    AppUserEntity user = appUserRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
    String storedHash = user == null ? null : user.getPasswordHash();
    boolean accepted = user != null;
    if (requirePasswordForSignin) {
      boolean matches = passwordEncoder.matches(suppliedPassword, storedHash == null ? timingEqualizerHash : storedHash);
      accepted = storedHash != null && matches;
    }
    if (!accepted) {
      signinAttempts.recordFailure(normalizedEmail, sourceIp);
      throw AuthException.unauthorized("Invalid email or password");
    }
    signinAttempts.recordSuccess(normalizedEmail);
    return createSession(user);
  }

  public AuthMeResponse me(AppUserEntity user) {
    return new AuthMeResponse(toUserDto(user));
  }

  @Transactional
  public void signout(String bearerToken) {
    AuthSessionEntity session = requireActiveSession(bearerToken);

    session.setRevokedAt(Instant.now());
    authSessionRepository.save(session);
  }

  @Transactional(readOnly = true)
  public AppUserEntity getAuthenticatedUser(String bearerToken) {
    AuthSessionEntity session = requireActiveSession(bearerToken);
    return appUserRepository
        .findById(session.getUserId())
        .orElseThrow(() -> AuthException.unauthorized("Session user no longer exists"));
  }

  /** Anonymous callers and invalid or expired sessions resolve to empty. */
  @Transactional(readOnly = true)
  public Optional<AppUserEntity> findAuthenticatedUser(String bearerToken) {
    try {
      return Optional.of(getAuthenticatedUser(bearerToken));
    } catch (AuthException ignored) {
      return Optional.empty();
    }
  }

  /** Expired and revoked sessions can never authenticate again; keep the table small. */
  @Scheduled(initialDelayString = "PT10M", fixedDelayString = "${app.auth.session-purge-interval:PT6H}")
  @Transactional
  public void purgeInactiveSessions() {
    authSessionRepository.deleteInactive(Instant.now());
  }

  private AuthSessionEntity requireActiveSession(String bearerToken) {
    String tokenHash = sha256(requireToken(bearerToken));

    AuthSessionEntity session =
        authSessionRepository
            .findByTokenHashAndRevokedAtIsNull(tokenHash)
            .orElseThrow(() -> AuthException.unauthorized("Invalid or expired session"));

    if (session.getExpiresAt().isBefore(Instant.now())) {
      throw AuthException.unauthorized("Invalid or expired session");
    }

    return session;
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
      throw AuthException.unauthorized("Missing Authorization header");
    }
    String value = bearerToken.trim();
    if (!value.regionMatches(true, 0, "Bearer ", 0, 7)) {
      throw AuthException.unauthorized("Invalid Authorization header format");
    }
    String token = value.substring(7).trim();
    if (token.isEmpty()) {
      throw AuthException.unauthorized("Missing bearer token");
    }
    return token;
  }

  private static String normalizeEmail(String email) {
    String normalized = email == null ? "" : email.trim().toLowerCase(java.util.Locale.ROOT);
    if (normalized.isEmpty()) {
      throw new BadRequestException("auth", "email is required");
    }
    return normalized;
  }

  private static String normalizeUsername(String username) {
    String normalized = username == null ? "" : username.trim().toLowerCase(java.util.Locale.ROOT);
    if (normalized.isEmpty()) {
      return "";
    }
    if (!UsernameRules.isSlug(normalized)) {
      throw new BadRequestException("auth", "username format is invalid");
    }
    return normalized;
  }

  private static String normalizeDisplayName(String displayName) {
    return displayName == null ? "" : displayName.trim();
  }

  private static String deriveUsernameSeedFromEmail(String email) {
    String localPart = email;
    int atIndex = email.indexOf('@');
    if (atIndex > 0) {
      localPart = email.substring(0, atIndex);
    }

    String seed = localPart.toLowerCase(java.util.Locale.ROOT).replaceAll("[^a-z0-9]+", "-");
    seed = seed.replaceAll("^-+|-+$", "");
    if (seed.isBlank()) {
      seed = "user";
    }
    if (seed.length() > 40) {
      seed = seed.substring(0, 40).replaceAll("-+$", "");
      if (seed.isBlank()) {
        seed = "user";
      }
    }
    return seed;
  }

  private String ensureUniqueUsername(String baseSeed) {
    if (UsernameRules.isReserved(baseSeed)) {
      baseSeed += "-user";
    }
    if (!appUserRepository.existsByUsernameIgnoreCase(baseSeed)) {
      return baseSeed;
    }

    for (int attempt = 1; attempt <= 9999; attempt++) {
      String candidate = baseSeed + "-" + attempt;
      if (!appUserRepository.existsByUsernameIgnoreCase(candidate)) {
        return candidate;
      }
    }

    return baseSeed + "-" + UUID.randomUUID().toString().substring(0, 8);
  }

  private static String defaultDisplayNameFromUsername(String username) {
    String words = username.replace('-', ' ').trim();
    if (words.isBlank()) {
      return "New User";
    }
    return Character.toUpperCase(words.charAt(0)) + words.substring(1);
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
