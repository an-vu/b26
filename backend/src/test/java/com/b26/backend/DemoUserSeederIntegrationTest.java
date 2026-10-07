package com.b26.backend;

import com.b26.backend.user.domain.DemoUserSeeder;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "app.demo-users.enabled=true",
    "spring.datasource.url=jdbc:h2:mem:b26-demo-test;DB_CLOSE_DELAY=-1"
})
@DirtiesContext
class DemoUserSeederIntegrationTest extends ApiIntegrationTestSupport {
  @Autowired DemoUserSeeder seeder;

  @Test
  void demoUsersHaveMainBoardsAndRestartPreservesEdits() throws Exception {
    for (String username : List.of("blueberry", "news", "feature", "daily", "emma", "victoria", "nori")) {
      var user = appUserRepository.findByUsername(username).orElseThrow();
      assertEquals("USER", user.getRole());
      assertNull(user.getPasswordHash());
      mockMvc.perform(get("/api/users/" + username + "/main-board"))
          .andExpect(status().isOk()).andExpect(jsonPath("$.mainBoardId").isNotEmpty());
    }
    var emma = appUserRepository.findByUsername("emma").orElseThrow();
    emma.setDisplayName("Edited Emma");
    appUserRepository.saveAndFlush(emma);
    long userCount = appUserRepository.count();
    long boardCount = boardRepository.count();
    seeder.seed();
    assertEquals(userCount, appUserRepository.count());
    assertEquals(boardCount, boardRepository.count());
    assertEquals("Edited Emma", appUserRepository.findByUsername("emma").orElseThrow().getDisplayName());
  }
}
