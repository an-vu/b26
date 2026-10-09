package com.b26.backend.common.api;

import com.b26.backend.common.config.ApiAccess;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@ApiAccess(ApiAccess.Policy.PUBLIC)
public class RetiredApiController {
  @RequestMapping("/api/system/routes")
  @ResponseStatus(HttpStatus.GONE)
  public ApiError systemRoutes() {
    return new ApiError("System pages use fixed application routes; board route mappings are retired.");
  }

  @PutMapping("/api/board/{slug}")
  @ResponseStatus(HttpStatus.GONE)
  public ApiError cards() {
    return new ApiError("Card editing is retired. Use the versioned board editor and widgets.");
  }

  @PostMapping("/api/click/{cardId}")
  @ResponseStatus(HttpStatus.GONE)
  public ApiError cardClicks() {
    return new ApiError("Card click tracking is retired. Use /api/insights/widgets/{widgetId}/click.");
  }
}
