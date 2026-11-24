package com.homework.qa.support;

import java.time.Duration;
import java.util.Locale;
import java.util.Optional;

/**
 * Test settings. Precedence: JVM system property (-Dbase.url=...) > environment variable (BASE_URL) > default.
 * The defaults target the demo app started with `npm run start:app` (web + API on port 3000),
 * so `mvn test` works without any configuration.
 */
public final class TestConfig {

    private TestConfig() {
    }

    public static String baseUrl() {
        return withoutTrailingSlash(read("base.url", "BASE_URL", "http://localhost:3000"));
    }

    public static String apiUrl() {
        return withoutTrailingSlash(read("api.url", "API_URL", "http://localhost:3000/api"));
    }

    public static String browser() {
        return read("browser", "BROWSER", "chrome").toLowerCase(Locale.ROOT);
    }

    public static boolean headless() {
        return Boolean.parseBoolean(read("headless", "HEADLESS", "true"));
    }

    /** Selenium Grid / standalone container URL, e.g. http://localhost:4444. Empty = run a local browser. */
    public static Optional<String> remoteUrl() {
        String url = read("selenium.remote.url", "SELENIUM_REMOTE_URL", "");
        return url.isBlank() ? Optional.empty() : Optional.of(url);
    }

    public static String userEmail() {
        return read("test.user.email", "TEST_USER_EMAIL", "demo@example.com");
    }

    public static String userPassword() {
        return read("test.user.password", "TEST_USER_PASSWORD", "Demo123!");
    }

    public static Duration uiTimeout() {
        return Duration.ofSeconds(Long.parseLong(read("ui.timeout.seconds", "UI_TIMEOUT_SECONDS", "10")));
    }

    private static String read(String property, String environmentVariable, String defaultValue) {
        String value = System.getProperty(property);
        if (value == null || value.isBlank()) {
            value = System.getenv(environmentVariable);
        }
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    private static String withoutTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
