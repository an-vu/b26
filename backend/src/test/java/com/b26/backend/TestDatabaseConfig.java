package com.b26.backend;

import java.sql.Connection;
import java.sql.SQLException;
import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/** Test contexts start from a clean schema so leftovers from earlier runs never fail validation. */
@Configuration
@Profile("test")
class TestDatabaseConfig {
  @Bean
  FlywayMigrationStrategy cleanMigrate() {
    return TestDatabaseConfig::cleanAndMigrate;
  }

  /** Wipes and re-migrates the test database, refusing any database whose name lacks "test". */
  static void cleanAndMigrate(Flyway flyway) {
    String database;
    try (Connection connection = flyway.getConfiguration().getDataSource().getConnection()) {
      database = connection.getCatalog();
    } catch (SQLException e) {
      throw new IllegalStateException("Could not inspect the test database", e);
    }
    if (database == null || !database.toLowerCase().contains("test")) {
      throw new IllegalStateException(
          "Refusing to clean database '" + database + "': tests only wipe databases named *test*."
              + " Point POSTGRES_TEST_URL at a disposable test database.");
    }
    flyway.clean();
    flyway.migrate();
  }
}
