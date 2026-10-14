package com.b26.backend.widget.social;

import com.b26.backend.widget.domain.WidgetService;
import com.b26.backend.widget.api.WidgetDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InstagramControllerTest {
  @Test void revalidatesTheWidgetBeforeServingEvenAWarmImage() throws Exception {
    var widgets = mock(WidgetService.class); var profiles = mock(InstagramService.class);
    var calls = new AtomicInteger();
    var images = new InstagramImageCache(Clock.systemUTC(), url -> { calls.incrementAndGet(); return new byte[]{1}; }, 10);
    var controller = new InstagramController(widgets, profiles, images);
    when(widgets.getWidgetByBoardId("board", 42)).thenReturn(new WidgetDto(42, "link", "", "span-1",
      new ObjectMapper().readTree("{\"url\":\"https://instagram.com/instagram\"}"), true, 0));
    when(profiles.get("instagram")).thenReturn(new InstagramProfile("ready", 100L,
      List.of(new InstagramProfile.Post("https://instagram.com/p/one", "photo", ""))));
    controller.image("board", 42, 0, "instagram");
    controller.image("board", 42, 0, "instagram");
    assertEquals(1, calls.get());
    when(widgets.getWidgetByBoardId("board", 42)).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));
    assertThrows(ResponseStatusException.class, () -> controller.image("board", 42, 0, "instagram"));
    verify(profiles, times(2)).get("instagram");
    assertEquals(1, calls.get());
  }
}
