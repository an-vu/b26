package com.b26.backend.user.domain;

import com.b26.backend.auth.domain.AuthService;
import com.b26.backend.board.domain.BoardNotFoundException;
import com.b26.backend.board.persistence.BoardEntity;
import com.b26.backend.board.persistence.BoardRepository;
import com.b26.backend.user.api.UpdateUserPreferencesRequest;
import com.b26.backend.user.api.HomeAppearanceDto;
import com.b26.backend.user.api.UserMainBoardDto;
import com.b26.backend.user.api.UserPreferencesDto;
import com.b26.backend.user.persistence.AppUserEntity;
import com.b26.backend.user.persistence.AppUserRepository;
import com.b26.backend.user.persistence.UserPreferenceEntity;
import com.b26.backend.user.persistence.UserPreferenceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserPreferencesService {
  private final AppUserRepository appUserRepository;
  private final UserPreferenceRepository userPreferenceRepository;
  private final BoardRepository boardRepository;
  private final AuthService authService;


  public UserPreferencesService(
      AppUserRepository appUserRepository,
      UserPreferenceRepository userPreferenceRepository,
      BoardRepository boardRepository,
      AuthService authService) {
    this.appUserRepository = appUserRepository;
    this.userPreferenceRepository = userPreferenceRepository;
    this.boardRepository = boardRepository;
    this.authService = authService;
  }

  @Transactional
  public UserPreferencesDto getMyPreferences(String authorizationHeader) {
    AppUserEntity user = authService.getAuthenticatedUser(authorizationHeader);
    UserPreferenceEntity preference = getOrCreatePreferences(user.getId());
    BoardEntity board = resolveUserMainBoard(user.getId(), preference.getMainBoardId());
    return new UserPreferencesDto(user.getId(), user.getUsername(), board == null ? "" : board.getId(), board == null ? "" : board.getBoardUrl());
  }

  @Transactional
  public HomeAppearanceDto getHomeAppearance(String authorizationHeader) {
    AppUserEntity user = authService.getAuthenticatedUser(authorizationHeader);
    UserPreferenceEntity preference = getOrCreatePreferences(user.getId());
    return homeAppearance(preference);
  }

  @Transactional
  public HomeAppearanceDto updateHomeAppearance(String authorizationHeader, HomeAppearanceDto request) {
    AppUserEntity user = authService.getAuthenticatedUser(authorizationHeader);
    appUserRepository.lockById(user.getId()).orElseThrow(() -> new UserNotFoundException(user.getId()));
    UserPreferenceEntity preference = getOrCreatePreferences(user.getId());
    preference.setHomeRadiusStep(request.radiusStep());
    preference.setHomeSpacingStep(request.spacingStep());
    if (request.themeFamily() != null) preference.setHomeThemeFamily(request.themeFamily());
    if (request.theme() != null) preference.setHomeColorMode(request.theme());
    if (request.backgroundColor() != null) preference.setHomeBackgroundColor(request.backgroundColor().toLowerCase(java.util.Locale.ROOT));
    if (request.pattern() != null) preference.setHomePattern(request.pattern());
    if (request.patternIntensity() != null) preference.setHomePatternIntensity(request.patternIntensity());
    userPreferenceRepository.save(preference);
    return homeAppearance(preference);
  }

  private HomeAppearanceDto homeAppearance(UserPreferenceEntity preference) {
    return new HomeAppearanceDto(preference.getHomeRadiusStep(), preference.getHomeSpacingStep(),
        preference.getHomeThemeFamily(), preference.getHomeColorMode(), preference.getHomeBackgroundColor(),
        preference.getHomePattern(), preference.getHomePatternIntensity());
  }

  @Transactional
  public UserPreferencesDto updateMyPreferences(
      String authorizationHeader,
      UpdateUserPreferencesRequest request) {
    AppUserEntity user = authService.getAuthenticatedUser(authorizationHeader);
    appUserRepository.lockById(user.getId())
        .orElseThrow(() -> new UserNotFoundException(user.getId()));
    String boardId = request.mainBoardId() == null ? "" : request.mainBoardId().trim();
    BoardEntity board = boardId.isEmpty() ? null : findBoardOwnedByUser(boardId, user.getId());
    if (board != null && !"public".equals(board.getVisibility())) {
      throw new InvalidUserPreferencesException("The main board must be public. Make it public before selecting it.");
    }
    UserPreferenceEntity preference = getOrCreatePreferences(user.getId());
    preference.setMainBoardId(board == null ? null : board.getId());
    userPreferenceRepository.save(preference);
    return new UserPreferencesDto(user.getId(), user.getUsername(), board == null ? "" : board.getId(), board == null ? "" : board.getBoardUrl());
  }

  @Transactional
  public UserMainBoardDto getMainBoardByUsername(String username) {
    String normalized = username.trim().toLowerCase();
    if (normalized.isEmpty()) {
      throw new UserNotFoundException(username);
    }

    AppUserEntity user = appUserRepository.findByUsername(normalized)
        .orElseThrow(() -> new UserNotFoundException(username));
    String mainId = userPreferenceRepository.findById(user.getId()).map(UserPreferenceEntity::getMainBoardId).orElse(null);
    BoardEntity board = resolveUserMainBoard(user.getId(), mainId);
    return new UserMainBoardDto(user.getId(), user.getUsername(), board == null ? "" : board.getId(), board == null ? "" : board.getBoardUrl(), user.getDisplayName());
  }

  private BoardEntity resolveUserMainBoard(String userId, String configuredBoardId) {
    if (configuredBoardId == null || configuredBoardId.isBlank()) return null;
    return boardRepository.findById(configuredBoardId)
        .filter(board -> userId.equals(board.getOwnerUserId()) && "public".equals(board.getVisibility()))
        .orElse(null);
  }

  private BoardEntity findBoardOwnedByUser(String boardId, String userId) {
    BoardEntity board = boardRepository.findById(boardId).orElseThrow(() -> new BoardNotFoundException(boardId));
    if (!userId.equals(board.getOwnerUserId())) {
      throw new InvalidUserPreferencesException(
          "mainBoardId must reference a board owned by user '" + userId + "'");
    }
    return board;
  }

  private UserPreferenceEntity getOrCreatePreferences(String userId) {
    return userPreferenceRepository
        .findById(userId)
        .orElseGet(
            () -> {
              UserPreferenceEntity preference = new UserPreferenceEntity();
              preference.setUserId(userId);
              return userPreferenceRepository.save(preference);
            });
  }
}
