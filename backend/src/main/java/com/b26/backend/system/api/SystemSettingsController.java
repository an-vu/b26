package com.b26.backend.system.api;

import com.b26.backend.system.domain.SystemSettingsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
public class SystemSettingsController {
  private final SystemSettingsService systemSettingsService;

  public SystemSettingsController(SystemSettingsService systemSettingsService) {
    this.systemSettingsService = systemSettingsService;
  }

  @GetMapping("/routes")
  public SystemRoutesDto getRoutes() {
    return systemSettingsService.getRoutes();
  }

  @PatchMapping("/routes")
  public SystemRoutesDto updateRoutes(@Valid @RequestBody UpdateSystemRoutesRequest request) {
    return systemSettingsService.updateRoutes(request);
  }
}
