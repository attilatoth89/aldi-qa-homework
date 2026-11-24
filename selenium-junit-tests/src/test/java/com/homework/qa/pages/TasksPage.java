package com.homework.qa.pages;

import java.time.Duration;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

/**
 * Page object of the task list (/tasks). Locators use stable data-testid attributes;
 * every interaction waits explicitly for the state it needs (no Thread.sleep, no implicit waits).
 */
public class TasksPage {

    /** localStorage key where the Angular app keeps the signed-in session. */
    public static final String SESSION_STORAGE_KEY = "tm.session";

    private static final By HEADING = By.cssSelector("h1");
    private static final By TASK_LIST = By.cssSelector("[data-testid='task-list']");
    private static final By CONFIRM_DIALOG = By.cssSelector("[data-testid='confirm-dialog']");
    private static final By CONFIRM_DIALOG_TASK_TITLE = By.cssSelector("[data-testid='confirm-dialog-task-title']");
    private static final By CONFIRM_DELETE = By.cssSelector("[data-testid='confirm-delete']");
    private static final By CANCEL_DELETE = By.cssSelector("[data-testid='cancel-delete']");
    private static final By STATUS_MESSAGE = By.cssSelector("[data-testid='status-message']");

    private final WebDriver driver;
    private final WebDriverWait wait;

    private TasksPage(WebDriver driver, Duration timeout) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, timeout);
    }

    /**
     * Opens the task list as an already signed-in user: the session obtained from the API is put into
     * localStorage, exactly where the app keeps it. Login itself is covered by the Playwright suite,
     * so the Delete Task tests do not spend time on the login form.
     */
    public static TasksPage openAsSignedInUser(WebDriver driver, String baseUrl, String sessionJson, Duration timeout) {
        driver.get(baseUrl + "/login"); // any page of the app, so localStorage belongs to the app's origin
        ((JavascriptExecutor) driver).executeScript(
                "window.localStorage.setItem(arguments[0], arguments[1]);", SESSION_STORAGE_KEY, sessionJson);
        driver.get(baseUrl + "/tasks");

        TasksPage page = new TasksPage(driver, timeout);
        page.waitUntilLoaded();
        return page;
    }

    public void waitUntilLoaded() {
        wait.until(ExpectedConditions.textToBe(HEADING, "My tasks"));
        wait.until(ExpectedConditions.visibilityOfElementLocated(TASK_LIST));
    }

    public boolean hasTask(String taskId) {
        return !driver.findElements(taskRow(taskId)).isEmpty();
    }

    public String taskTitle(String taskId) {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(taskRow(taskId)))
                .findElement(By.cssSelector("[data-testid='task-title']"))
                .getText();
    }

    /** Clicks "Delete" in the row of the task and waits for the confirmation dialog. */
    public void clickDelete(String taskId) {
        wait.until(ExpectedConditions.elementToBeClickable(deleteButton(taskId))).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(CONFIRM_DIALOG));
    }

    public String confirmationDialogTaskTitle() {
        return driver.findElement(CONFIRM_DIALOG_TASK_TITLE).getText();
    }

    public void confirmDelete() {
        wait.until(ExpectedConditions.elementToBeClickable(CONFIRM_DELETE)).click();
        wait.until(ExpectedConditions.invisibilityOfElementLocated(CONFIRM_DIALOG));
    }

    public void cancelDelete() {
        wait.until(ExpectedConditions.elementToBeClickable(CANCEL_DELETE)).click();
        wait.until(ExpectedConditions.invisibilityOfElementLocated(CONFIRM_DIALOG));
    }

    public boolean isConfirmationDialogOpen() {
        return !driver.findElements(CONFIRM_DIALOG).isEmpty();
    }

    public void waitUntilTaskIsGone(String taskId) {
        wait.until(ExpectedConditions.invisibilityOfElementLocated(taskRow(taskId)));
    }

    /** Waits for the polite live-region message (e.g. "Task deleted.") and returns it. */
    public String statusMessage() {
        return wait.until(d -> {
            String text = d.findElement(STATUS_MESSAGE).getText();
            return text.isBlank() ? null : text;
        });
    }

    public void reload() {
        driver.navigate().refresh();
        waitUntilLoaded();
    }

    private static By taskRow(String taskId) {
        return By.cssSelector("[data-testid='task-item'][data-task-id='" + taskId + "']");
    }

    private static By deleteButton(String taskId) {
        return By.cssSelector("[data-testid='task-item'][data-task-id='" + taskId + "'] [data-testid='delete-task-button']");
    }
}
