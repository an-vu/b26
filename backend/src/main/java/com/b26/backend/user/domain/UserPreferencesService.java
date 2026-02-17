package com.b26.backend.user.domain;

import com.b26.backend.board.domain.BoardNotFoundException;
import com.b26.backend.board.persistence.BoardEntity;
import com.b26.backend.board.persistence.BoardRepository;
import com.b26.backend.user.api.UpdateUserPreferencesRequest;
import com.b26.backend.user.api.UserMainBoardDto;
import com.b26.backend.user.api.UserPreferencesDto;
import com.b26.backend.user.persistence.AppUserEntity;
import com.b26.backend.user.persistence.AppUserRepository;
import com.b26.backend.user.persistence.UserPreferenceEntity;
import com.b26.backend.user.persistence.UserPreferenceRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserPreferencesService {
  private final AppUserRepository appUserRepository;
  private final UserPreferenceRepository userPreferenceRepository;
  private final BoardRepository boardRepository;

  @Value("${app.user.default-id:anvu}")
  private String defaultUserId;

  public UserPreferencesService(
      AppUserRepository appUserRepository,
      UserPreferenceRepository userPreferenceRepository,
      BoardRepository boardRepository) {
    this.appUserRepository = appUserRepository;
    this.userPreferenceRepository = userPreferenceRepository;
    this.boardRepository = boardRepository;
  }

  @Transactional(readOnly = true)
  public UserPreferencesDto getMyPreferences() {
    AppUserEntity user = findOrCreateDefaultUser();
    UserPreferenceEntity preference = getOrCreatePreferences(user.getId());
    BoardEntity board = resolveUserMainBoard(user.getId(), preference.getMainBoardId());
    return new UserPreferencesDto(user.getId(), user.getUsername(), board.getId(), board.getBoardUrl());
  }

  @Transactional
  public UserPreferencesDto updateMyPreferences(UpdateUserPreferencesRequest request) {
    AppUserEntity user = findOrCreateDefaultUser();
    String boardId = request.mainBoardId().trim();
    BoardEntity board = findBoardOwnedByUser(boardId, user.getId());

    UserPreferenceEntity preference = getOrCreatePreferences(user.getId());
    preference.setMainBoardId(board.getId());
    userPreferenceRepository.save(preference);

    return new UserPreferencesDto(user.getId(), user.getUsername(), board.getId(), board.getBoardUrl());
  }

  @Transactional(readOnly = true)
  public UserMainBoardDto getMainBoardByUsername(String username) {
    String normalized = username.trim().toLowerCase();
    if (normalized.isEmpty()) {
      throw new UserNotFoundException(username);
    }

    AppUserEntity user;
    if (normalized.equals(defaultUserId.toLowerCase())) {
      user = findOrCreateDefaultUser();
    } else {
      user =
          appUserRepository.findByUsername(normalized).orElseThrow(() -> new UserNotFoundException(username));
    }
    UserPreferenceEntity preference = getOrCreatePreferences(user.getId());
    BoardEntity board = resolveUserMainBoard(user.getId(), preference.getMainBoardId());
    return new UserMainBoardDto(user.getId(), user.getUsername(), board.getId(), board.getBoardUrl());
  }

  private AppUserEntity findUserById(String userId) {
    return appUserRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
  }

  private AppUserEntity findOrCreateDefaultUser() {
    return appUserRepository
        .findById(defaultUserId)
        .orElseGet(
            () -> {
              AppUserEntity user = new AppUserEntity();
              user.setId(defaultUserId);
              user.setUsername(defaultUserId.toLowerCase());
              user.setDisplayName(defaultUserId);
              user.setEmail(defaultUserId.toLowerCase() + "@local");
              user.setRole("ADMIN");
              return appUserRepository.save(user);
            });
  }

  private BoardEntity resolveUserMainBoard(String userId, String configuredBoardId) {
    if (configuredBoardId != null && !configuredBoardId.isBlank()) {
      return findBoardOwnedByUser(configuredBoardId.trim(), userId);
    }

    return boardRepository
        .findFirstByOwnerUserIdOrderByBoardNameAsc(userId)
        .orElseThrow(() -> new BoardNotFoundException("No boards for user: " + userId));
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
