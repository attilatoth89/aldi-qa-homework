# Bonus – Selenium + JUnit: automating "Delete Task"

The suite is a Maven project in [`selenium-junit-tests`](../selenium-junit-tests) (Java 21,
JUnit 5, Selenium 4). It runs against the Angular app of this repository, whose task list has a
**Delete** button with a confirmation dialog.

## 1. What to test

| # | Scenario | Checks |
| --- | --- | --- |
| 1 | Delete after confirming (`@smoke`) | The dialog names the task, the row disappears, "Task deleted." is announced and the API returns **404** for the task |
| 2 | Cancel the deletion | The dialog closes, the row stays and the API still returns 200 |
| 3 | Only the selected task is deleted | A neighbouring task is untouched in the UI and in the API |
| 4 | Persistence | The deleted task does not come back after a page reload |
| 5 | Concurrent deletion | The task was deleted elsewhere (e.g. another tab): the UI shows "Task was already deleted." and removes the row |
| 6 | Special characters (parameterized × 3) | Accented letters, an en dash and HTML-like text are shown as plain text (no HTML injection) and can be deleted |

Further ideas: the Esc key closes the dialog; deleting the last task shows the empty state; a
server error (500) shows an error message and keeps the row; another user's task cannot be
deleted (already covered on the API level).

## 2. How the framework is built

| Part | Responsibility |
| --- | --- |
| **JUnit 5 (Jupiter)** | Lifecycle (`@BeforeEach` / `@AfterEach`), assertions, `@DisplayName`, `@Tag("smoke")` / `@Tag("regression")`, `@ParameterizedTest`, and extensions |
| [`BaseUiTest`](../selenium-junit-tests/src/test/java/com/homework/qa/support/BaseUiTest.java) | A **new browser for every test** and `quit()` afterwards: tests are independent and can run in any order |
| [`DriverFactory`](../selenium-junit-tests/src/test/java/com/homework/qa/support/DriverFactory.java) | Chrome, Firefox or Edge, headless or not. Locally **Selenium Manager** downloads the matching driver; with `selenium.remote.url` it uses a Grid or Docker container (`RemoteWebDriver`). Implicit wait is 0. |
| [`TasksPage`](../selenium-junit-tests/src/test/java/com/homework/qa/pages/TasksPage.java) | Page object with `data-testid` locators; every action waits explicitly (`WebDriverWait` + `ExpectedConditions`) |
| [`TaskApiClient`](../selenium-junit-tests/src/test/java/com/homework/qa/support/TaskApiClient.java) | REST calls for **arrange** (log in, create a task) and **verify** (is the task gone in the backend?) – JDK `HttpClient`, no extra dependency |
| [`ScreenshotOnFailureExtension`](../selenium-junit-tests/src/test/java/com/homework/qa/support/ScreenshotOnFailureExtension.java) | Saves `target/screenshots/<test>.png` when a test fails, before the browser is closed |
| [`TestConfig`](../selenium-junit-tests/src/test/java/com/homework/qa/support/TestConfig.java) | URLs, browser, headless mode and credentials: system property > environment variable > default |

**Test flow (Arrange – Act – Assert):** the test logs in **through the API** and creates its own
task with a unique title. It then puts the returned session into `localStorage` (where the
Angular app keeps it) and opens `/tasks`, so no time is spent on the login form, which the
Playwright suite already covers. Only the feature under test runs in the browser. The result is
checked in the UI **and** in the backend, and `@AfterEach` deletes whatever the test created.

## 3. Sample code

[`DeleteTaskTest.java`](../selenium-junit-tests/src/test/java/com/homework/qa/tests/DeleteTaskTest.java) (excerpt):

```java
@DisplayName("Delete Task")
@Tag("regression")
class DeleteTaskTest extends BaseUiTest {

    private final TaskApiClient api = new TaskApiClient(TestConfig.apiUrl());
    private final List<String> createdTaskIds = new ArrayList<>();
    private ApiSession session;

    @BeforeEach
    void signInThroughTheApi() {
        session = api.login(TestConfig.userEmail(), TestConfig.userPassword());
    }

    @AfterEach
    void removeTestData() {
        createdTaskIds.forEach(id -> api.deleteTaskIfExists(session, id));
    }

    @Test
    @Tag("smoke")
    @DisplayName("removes the task from the list and from the backend after confirmation")
    void deletesTaskAfterConfirmation() {
        CreatedTask task = givenTask("Selenium delete " + shortId());
        TasksPage tasksPage = openTaskList();

        tasksPage.clickDelete(task.id());
        assertEquals(task.title(), tasksPage.confirmationDialogTaskTitle(), "the dialog names the task to delete");
        tasksPage.confirmDelete();

        tasksPage.waitUntilTaskIsGone(task.id());
        assertEquals("Task deleted.", tasksPage.statusMessage());
        assertEquals(404, api.taskStatusCode(session, task.id()), "the task must be deleted in the backend too");
    }

    @ParameterizedTest(name = "title \"{0}\"")
    @ValueSource(strings = {"Buy milk", "Ünnepi bevásárlás – 2 kg alma", "<b>not bold</b> & \"quotes\""})
    @DisplayName("deletes tasks whose titles contain special characters")
    void deletesTasksWithSpecialCharactersInTheTitle(String title) {
        CreatedTask task = givenTask(title + " " + shortId());
        TasksPage tasksPage = openTaskList();
        assertEquals(task.title(), tasksPage.taskTitle(task.id()), "the title is rendered as plain text, not as HTML");

        tasksPage.clickDelete(task.id());
        tasksPage.confirmDelete();

        tasksPage.waitUntilTaskIsGone(task.id());
        assertEquals(404, api.taskStatusCode(session, task.id()));
    }
}
```

The page object keeps the waits out of the tests:

```java
public void clickDelete(String taskId) {
    wait.until(ExpectedConditions.elementToBeClickable(deleteButton(taskId))).click();
    wait.until(ExpectedConditions.visibilityOfElementLocated(CONFIRM_DIALOG));
}

public void waitUntilTaskIsGone(String taskId) {
    wait.until(ExpectedConditions.invisibilityOfElementLocated(taskRow(taskId)));
}

private static By deleteButton(String taskId) {
    return By.cssSelector("[data-testid='task-item'][data-task-id='" + taskId + "'] [data-testid='delete-task-button']");
}
```

## 4. Running

```bash
# Terminal 1 – build the Angular app and serve it with the API on http://localhost:3000
npm run start:app

# Terminal 2
cd selenium-junit-tests
mvn test                              # headless Chrome against http://localhost:3000
mvn test -Dheadless=false             # watch the browser
mvn test -Dbrowser=firefox
mvn test -Dgroups=smoke               # only @Tag("smoke")

# Or everything in containers (no local Java or browser needed)
docker compose --profile selenium run --rm selenium-tests
```

| Setting | System property | Environment variable | Default |
| --- | --- | --- | --- |
| Web app URL | `base.url` | `BASE_URL` | `http://localhost:3000` |
| API URL | `api.url` | `API_URL` | `http://localhost:3000/api` |
| Browser | `browser` | `BROWSER` | `chrome` (or `firefox`, `edge`) |
| Headless | `headless` | `HEADLESS` | `true` |
| Selenium Grid | `selenium.remote.url` | `SELENIUM_REMOTE_URL` | empty: a local browser |
| Test user | `test.user.email`, `test.user.password` | `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` | the demo account |
| UI timeout (seconds) | `ui.timeout.seconds` | `UI_TIMEOUT_SECONDS` | `10` |

Reports: `target/surefire-reports/*.xml` (JUnit XML for CI) and failure screenshots in
`target/screenshots/`.

## 5. Practices

- Explicit waits only: no `Thread.sleep`, and no mixing of implicit and explicit waits (that
  causes unpredictable timeouts).
- Stable locators (`data-testid`), scoped to the task's row by its id, so a list with similar
  titles cannot confuse the test.
- Each test creates its own uniquely named data and removes it afterwards, so tests are
  independent and safe to run in parallel (e.g. on a Selenium Grid).
- Arrange and verify through the API, act in the UI: faster and less flaky than doing everything
  through the browser.
- Tags select a subset when needed (`-Dgroups=smoke` for a quick check). The suite is small, so CI
  runs all of it on every push and pull request.
