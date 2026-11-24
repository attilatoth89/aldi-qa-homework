package com.homework.qa.tests;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.homework.qa.pages.TasksPage;
import com.homework.qa.support.BaseUiTest;
import com.homework.qa.support.TaskApiClient;
import com.homework.qa.support.TaskApiClient.ApiSession;
import com.homework.qa.support.TaskApiClient.CreatedTask;
import com.homework.qa.support.TestConfig;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * "Delete Task" feature of the Task Manager web app.
 * Arrange via the REST API (fast, deterministic), act in the browser, assert in the UI and in the backend.
 */
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

    @Test
    @DisplayName("keeps the task when the deletion is cancelled")
    void keepsTaskWhenCancelled() {
        CreatedTask task = givenTask("Selenium keep " + shortId());
        TasksPage tasksPage = openTaskList();

        tasksPage.clickDelete(task.id());
        tasksPage.cancelDelete();

        assertFalse(tasksPage.isConfirmationDialogOpen(), "the dialog is closed");
        assertTrue(tasksPage.hasTask(task.id()), "the task is still listed");
        assertEquals(200, api.taskStatusCode(session, task.id()), "the task still exists in the backend");
    }

    @Test
    @DisplayName("deletes only the selected task")
    void deletesOnlyTheSelectedTask() {
        CreatedTask taskToKeep = givenTask("Selenium neighbour " + shortId());
        CreatedTask taskToDelete = givenTask("Selenium target " + shortId());
        TasksPage tasksPage = openTaskList();

        tasksPage.clickDelete(taskToDelete.id());
        tasksPage.confirmDelete();
        tasksPage.waitUntilTaskIsGone(taskToDelete.id());

        assertTrue(tasksPage.hasTask(taskToKeep.id()), "the other task is still listed");
        assertEquals(200, api.taskStatusCode(session, taskToKeep.id()));
    }

    @Test
    @DisplayName("a deleted task does not come back after reloading the page")
    void deletedTaskStaysDeletedAfterReload() {
        CreatedTask task = givenTask("Selenium reload " + shortId());
        TasksPage tasksPage = openTaskList();

        tasksPage.clickDelete(task.id());
        tasksPage.confirmDelete();
        tasksPage.waitUntilTaskIsGone(task.id());
        tasksPage.reload();

        assertFalse(tasksPage.hasTask(task.id()), "the task is not listed after a reload");
    }

    @Test
    @DisplayName("handles a task that was already deleted in another session")
    void handlesTaskAlreadyDeletedElsewhere() {
        CreatedTask task = givenTask("Selenium concurrent " + shortId());
        TasksPage tasksPage = openTaskList();
        api.deleteTaskIfExists(session, task.id()); // e.g. deleted in another browser tab

        tasksPage.clickDelete(task.id());
        tasksPage.confirmDelete();

        tasksPage.waitUntilTaskIsGone(task.id());
        assertEquals("Task was already deleted.", tasksPage.statusMessage());
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

    private CreatedTask givenTask(String title) {
        CreatedTask task = api.createTask(session, title);
        createdTaskIds.add(task.id());
        return task;
    }

    private TasksPage openTaskList() {
        return TasksPage.openAsSignedInUser(driver, TestConfig.baseUrl(), session.rawJson(), TestConfig.uiTimeout());
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
