package com.bento26.backend.system.domain;

import com.bento26.backend.board.domain.BoardNotFoundException;
import com.bento26.backend.board.persistence.BoardEntity;
import com.bento26.backend.board.persistence.BoardRepository;
import com.bento26.backend.system.api.SystemRoutesDto;
import com.bento26.backend.system.api.UpdateSystemRoutesRequest;
import com.bento26.backend.system.persistence.SystemSettingsEntity;
import com.bento26.backend.system.persistence.SystemSettingsRepository;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SystemSettingsService {
  private static final short SINGLETON_ID = 1;

  private final SystemSettingsRepository systemSettingsRepository;
  private final BoardRepository boardRepository;

  public SystemSettingsService(
      SystemSettingsRepository systemSettingsRepository, BoardRepository boardRepository) {
    this.systemSettingsRepository = systemSettingsRepository;
    this.boardRepository = boardRepository;
  }

  @Transactional(readOnly = true)
  public SystemRoutesDto getRoutes() {
    SystemSettingsEntity settings = getOrCreateDefaults();
    BoardEntity homepageBoard = findBoardById(settings.getGlobalHomepageBoardId());
    BoardEntity insightsBoard = findBoardById(settings.getGlobalInsightsBoardId());
    BoardEntity settingsBoard = findBoardById(settings.getGlobalSettingsBoardId());
    BoardEntity signinBoard = findBoardById(settings.getGlobalSigninBoardId());
    return new SystemRoutesDto(
        homepageBoard.getId(),
        homepageBoard.getBoardUrl(),
        insightsBoard.getId(),
        insightsBoard.getBoardUrl(),
        settingsBoard.getId(),
        settingsBoard.getBoardUrl(),
        signinBoard.getId(),
        signinBoard.getBoardUrl());
  }

  @Transactional
  public SystemRoutesDto updateRoutes(UpdateSystemRoutesRequest request) {
    BoardEntity homepageBoard = findBoardById(request.globalHomepageBoardId().trim());
    BoardEntity insightsBoard = findBoardById(request.globalInsightsBoardId().trim());
    BoardEntity settingsBoard = findBoardById(request.globalSettingsBoardId().trim());
    BoardEntity signinBoard = resolveSigninBoardForUpdate(request);

    SystemSettingsEntity settings = getOrCreateDefaults();
    settings.setGlobalHomepageBoardId(homepageBoard.getId());
    settings.setGlobalInsightsBoardId(insightsBoard.getId());
    settings.setGlobalSettingsBoardId(settingsBoard.getId());
    settings.setGlobalSigninBoardId(signinBoard.getId());
    settings.setUpdatedAt(OffsetDateTime.now());
    systemSettingsRepository.save(settings);

    return new SystemRoutesDto(
        homepageBoard.getId(),
        homepageBoard.getBoardUrl(),
        insightsBoard.getId(),
        insightsBoard.getBoardUrl(),
        settingsBoard.getId(),
        settingsBoard.getBoardUrl(),
        signinBoard.getId(),
        signinBoard.getBoardUrl());
  }

  private SystemSettingsEntity getOrCreateDefaults() {
    return systemSettingsRepository
        .findById(SINGLETON_ID)
        .orElseGet(
            () -> {
              SystemSettingsEntity settings = new SystemSettingsEntity();
              settings.setId(SINGLETON_ID);
              settings.setGlobalHomepageBoardId("home");
              settings.setGlobalInsightsBoardId("insights");
              settings.setGlobalSettingsBoardId("settings");
              settings.setGlobalSigninBoardId("signin");
              settings.setUpdatedAt(OffsetDateTime.now());
              return systemSettingsRepository.save(settings);
            });
  }

  private BoardEntity resolveSigninBoardForUpdate(UpdateSystemRoutesRequest request) {
    String requested = request.globalSigninBoardId();
    if (requested == null || requested.isBlank()) {
      return findBoardById(getOrCreateDefaults().getGlobalSigninBoardId());
    }
    return findBoardById(requested.trim());
  }

  private BoardEntity findBoardById(String boardId) {
    return boardRepository.findById(boardId).orElseThrow(() -> new BoardNotFoundException(boardId));
  }
}
