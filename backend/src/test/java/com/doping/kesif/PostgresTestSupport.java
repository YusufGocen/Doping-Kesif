package com.doping.kesif;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;

/** Uses Docker, or an explicitly supplied disposable *_test database. */
public abstract class PostgresTestSupport {
    private static PostgreSQLContainer<?> container;

    public static boolean databaseAvailable() {
        return System.getenv("KESIF_TEST_JDBC_URL") != null || DockerClientFactory.instance().isDockerAvailable();
    }

    @DynamicPropertySource
    static synchronized void database(DynamicPropertyRegistry registry) {
        registry.add("kesif.rooms.expiry-enabled",()->"false");
        registry.add("kesif.game.deadlines-enabled",()->"false");
        registry.add("kesif.realtime.worker-enabled",()->"false");
        String externalUrl = System.getenv("KESIF_TEST_JDBC_URL");
        if (externalUrl != null) {
            if (!externalUrl.matches("jdbc:postgresql://[^/]+/[a-zA-Z0-9_]+_test")) {
                throw new IllegalArgumentException("KESIF_TEST_JDBC_URL must name a disposable *_test database");
            }
            registry.add("spring.datasource.url", () -> externalUrl);
            registry.add("spring.datasource.username", () -> requiredEnv("KESIF_TEST_DB_USER"));
            registry.add("spring.datasource.password", () -> requiredEnv("KESIF_TEST_DB_PASSWORD"));
        } else {
            if (container == null) {
                container = new PostgreSQLContainer<>("postgres:16.14-alpine");
                container.withDatabaseName("doping_kesif_test");
                container.start();
                Runtime.getRuntime().addShutdownHook(new Thread(container::stop));
            }
            registry.add("spring.datasource.url", container::getJdbcUrl);
            registry.add("spring.datasource.username", container::getUsername);
            registry.add("spring.datasource.password", container::getPassword);
        }
    }

    private static String requiredEnv(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalArgumentException(name + " is required");
        return value;
    }
}
