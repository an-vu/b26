package com.b26.backend;

import java.sql.DriverManager;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Uses a disposable schema only; never cleans or migrates the connection's default schema. */
@EnabledIfEnvironmentVariable(named = "POSTGRES_TEST_URL", matches = ".+")
class PostgresMigrationIntegrationTest {
  @Test
  void freshInstallAndUpgradePreserveUserData() throws Exception {
    verifyMigrations(false);
  }

  @Test
  void existingVersionedHistoryUpgradesWithoutChecksumChanges() throws Exception {
    verifyMigrations(true);
  }

  private void verifyMigrations(boolean historical) throws Exception {
    String url = System.getenv("POSTGRES_TEST_URL");
    String user = System.getenv().getOrDefault("POSTGRES_TEST_USER", "postgres");
    String password = System.getenv().getOrDefault("POSTGRES_TEST_PASSWORD", "postgres");
    String schema = "b26_test_" + UUID.randomUUID().toString().replace("-", "");
    try (var connection = DriverManager.getConnection(url, user, password);
         var statement = connection.createStatement()) {
      try {
        if (historical) {
          // Model a deployed database: historical V migrations and pre-existing demo boards.
          var directory = java.nio.file.Files.createTempDirectory("b26-versioned-migrations-");
          try {
            var resources = new org.springframework.core.io.support.PathMatchingResourcePatternResolver()
                .getResources("classpath:db/migration/V*.sql");
            for (var resource : resources) {
              try (var input = resource.getInputStream()) {
                java.nio.file.Files.copy(input, directory.resolve(resource.getFilename()));
              }
            }
            Flyway.configure().dataSource(url, user, password).schemas(schema).defaultSchema(schema)
                .locations("filesystem:" + directory).target("5").load().migrate();
            statement.execute("set search_path to " + schema);
            statement.executeUpdate("insert into boards (id, board_name, board_url, name, headline) "
                + "values ('default', 'Default', 'default', 'Original', 'Hello'), "
                + "('home', 'Home', 'home', 'Home', 'Welcome')");
            Flyway.configure().dataSource(url, user, password).schemas(schema).defaultSchema(schema)
                .locations("filesystem:" + directory).target("21").load().migrate();
          } finally {
            try (var files = java.nio.file.Files.list(directory)) {
              for (var file : files.toList()) java.nio.file.Files.delete(file);
            }
            java.nio.file.Files.delete(directory);
          }
        } else {
          Flyway.configure().dataSource(url, user, password).schemas(schema).defaultSchema(schema)
              .target("21").load().migrate();
        }
        statement.execute("set search_path to " + schema);
        statement.executeUpdate("update boards set name = 'Preserved title' where id = 'default'");
        Flyway flyway = Flyway.configure().dataSource(url, user, password)
            .schemas(schema).defaultSchema(schema).load();
        flyway.migrate();
        flyway.validate();
        assertEquals(0, flyway.migrate().migrationsExecuted);
        try (var rows = statement.executeQuery("select name from boards where id = 'default'")) {
          rows.next();
          assertEquals("Preserved title", rows.getString(1));
        }
        try (var rows = statement.executeQuery("select appearance_theme, appearance_radius_step, appearance_background_color, appearance_pattern, appearance_theme_family from boards where id = 'default'")) {
          rows.next();
          assertEquals("light", rows.getString(1));
          assertEquals(2, rows.getInt(2));
          assertEquals("#ffffff", rows.getString(3));
          assertEquals("none", rows.getString(4));
          assertEquals("default", rows.getString(5));
        }
        statement.executeUpdate("update boards set appearance_theme = 'dark', appearance_radius_step = 3, appearance_background_color = '#e6f0ff', appearance_pattern = 'grid' where id = 'default'");
        try (var rows = statement.executeQuery("select appearance_theme, appearance_pattern from boards where id = 'default'")) {
          rows.next();
          assertEquals("dark", rows.getString(1));
          assertEquals("grid", rows.getString(2));
        }
        org.junit.jupiter.api.Assertions.assertThrows(java.sql.SQLException.class,
            () -> statement.executeUpdate("update boards set appearance_radius_step = 4 where id = 'default'"));
        statement.executeUpdate("update boards set appearance_theme_family = 'frutiger-aero' where id = 'default'");
        org.junit.jupiter.api.Assertions.assertThrows(java.sql.SQLException.class,
            () -> statement.executeUpdate("update boards set appearance_theme_family = 'unknown' where id = 'default'"));
        statement.executeUpdate("update boards set appearance_theme_family = 'aqua' where id = 'default'");
        try (var rows = statement.executeQuery("select appearance_theme_family from boards where id = 'default'")) {
          rows.next();
          assertEquals("aqua", rows.getString(1));
        }
        // Matches the current entity: no obsolete required signup-route column.
        statement.executeUpdate("insert into system_settings "
            + "(id, global_homepage_board_id, global_insights_board_id, global_settings_board_id, global_signin_board_id) "
            + "values (1, 'home', 'insights', 'settings', 'signin')");
        try (var rows = statement.executeQuery("select count(*) from user_preferences p join boards b on b.id = p.main_board_id")) {
          rows.next();
          assertEquals(1, rows.getInt(1));
        }
      } finally {
        statement.execute("drop schema if exists " + schema + " cascade");
      }
    }
  }
}
