package com.homework.qa.support;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.extension.AfterTestExecutionCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;

/**
 * Saves a screenshot to target/screenshots when a test fails. AfterTestExecutionCallback runs
 * right after the test method and before @AfterEach, so the browser is still open.
 */
public class ScreenshotOnFailureExtension implements AfterTestExecutionCallback {

    @Override
    public void afterTestExecution(ExtensionContext context) {
        if (context.getExecutionException().isEmpty()) {
            return;
        }
        if (!(context.getRequiredTestInstance() instanceof BaseUiTest test) || test.driver() == null) {
            return;
        }
        try {
            Path directory = Path.of("target", "screenshots");
            Files.createDirectories(directory);
            String name = (context.getRequiredTestClass().getSimpleName() + "_" + context.getDisplayName())
                    .replaceAll("[^A-Za-z0-9._-]", "_");
            Path file = directory.resolve(name + ".png");
            Files.write(file, ((TakesScreenshot) test.driver()).getScreenshotAs(OutputType.BYTES));
            System.out.println("Screenshot of the failure: " + file.toAbsolutePath());
        } catch (Exception e) {
            System.err.println("Could not save the failure screenshot: " + e.getMessage());
        }
    }
}
