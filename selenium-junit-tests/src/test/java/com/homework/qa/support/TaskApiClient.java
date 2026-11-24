package com.homework.qa.support;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import org.openqa.selenium.json.Json;

/**
 * Minimal REST client for fast test-data setup and backend verification, so the UI test only
 * exercises the feature under test. Uses the JDK HttpClient and Selenium's JSON codec: no extra dependencies.
 */
public final class TaskApiClient {

    private static final Json JSON = new Json();

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final String apiUrl;

    public TaskApiClient(String apiUrl) {
        this.apiUrl = apiUrl;
    }

    /** Logs in and returns the token plus the raw session JSON (the web app keeps exactly this in localStorage). */
    public ApiSession login(String email, String password) {
        HttpResponse<String> response = send(request("/auth/login", null)
                .POST(jsonBody(Map.of("email", email, "password", password))));
        expectStatus(response, 200, "POST /auth/login");
        Map<String, Object> session = JSON.toType(response.body(), Json.MAP_TYPE);
        return new ApiSession((String) session.get("token"), response.body());
    }

    public CreatedTask createTask(ApiSession session, String title) {
        HttpResponse<String> response = send(request("/tasks", session).POST(jsonBody(Map.of("title", title))));
        expectStatus(response, 201, "POST /tasks");
        Map<String, Object> task = JSON.toType(response.body(), Json.MAP_TYPE);
        return new CreatedTask((String) task.get("id"), (String) task.get("title"));
    }

    /** HTTP status of GET /tasks/{id}: 200 while the task exists, 404 after it was deleted. */
    public int taskStatusCode(ApiSession session, String taskId) {
        return send(request("/tasks/" + taskId, session).GET()).statusCode();
    }

    /** Test-data cleanup: 204 (deleted) and 404 (already deleted by the test) are both fine. */
    public void deleteTaskIfExists(ApiSession session, String taskId) {
        int status = send(request("/tasks/" + taskId, session).DELETE()).statusCode();
        if (status != 204 && status != 404) {
            throw new IllegalStateException("Cleanup of task " + taskId + " failed with HTTP " + status);
        }
    }

    private HttpRequest.Builder request(String path, ApiSession session) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(apiUrl + path))
                .timeout(Duration.ofSeconds(10))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json");
        if (session != null) {
            builder.header("Authorization", "Bearer " + session.token());
        }
        return builder;
    }

    private static HttpRequest.BodyPublisher jsonBody(Map<String, ?> payload) {
        return HttpRequest.BodyPublishers.ofString(JSON.toJson(payload));
    }

    private HttpResponse<String> send(HttpRequest.Builder builder) {
        try {
            return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        } catch (IOException e) {
            throw new IllegalStateException("API call failed: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("API call interrupted", e);
        }
    }

    private static void expectStatus(HttpResponse<String> response, int expected, String call) {
        if (response.statusCode() != expected) {
            throw new IllegalStateException(call + " returned HTTP " + response.statusCode() + ": " + response.body());
        }
    }

    public record ApiSession(String token, String rawJson) {
    }

    public record CreatedTask(String id, String title) {
    }
}
