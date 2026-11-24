package com.homework.qa.support;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.time.Duration;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.edge.EdgeOptions;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxOptions;
import org.openqa.selenium.remote.AbstractDriverOptions;
import org.openqa.selenium.remote.RemoteWebDriver;

/**
 * Creates the WebDriver for a test: Chrome (default), Firefox or Edge, headless or headed,
 * locally (Selenium Manager downloads the matching driver) or on a Selenium Grid / container.
 */
public final class DriverFactory {

    private DriverFactory() {
    }

    public static WebDriver create() {
        AbstractDriverOptions<?> options = switch (TestConfig.browser()) {
            case "firefox" -> firefoxOptions();
            case "edge" -> edgeOptions();
            default -> chromeOptions();
        };

        WebDriver driver = TestConfig.remoteUrl()
                .map(url -> (WebDriver) new RemoteWebDriver(toUrl(url), options))
                .orElseGet(() -> localDriver(options));

        driver.manage().window().setSize(new Dimension(1366, 900));
        driver.manage().timeouts().implicitlyWait(Duration.ZERO); // explicit waits only, never mixed with implicit ones
        return driver;
    }

    private static WebDriver localDriver(AbstractDriverOptions<?> options) {
        if (options instanceof FirefoxOptions firefox) {
            return new FirefoxDriver(firefox);
        }
        if (options instanceof EdgeOptions edge) {
            return new EdgeDriver(edge);
        }
        return new ChromeDriver((ChromeOptions) options);
    }

    private static ChromeOptions chromeOptions() {
        ChromeOptions options = new ChromeOptions();
        if (TestConfig.headless()) {
            options.addArguments("--headless=new");
        }
        options.addArguments("--window-size=1366,900", "--disable-dev-shm-usage");
        return options;
    }

    private static FirefoxOptions firefoxOptions() {
        FirefoxOptions options = new FirefoxOptions();
        if (TestConfig.headless()) {
            options.addArguments("-headless");
        }
        return options;
    }

    private static EdgeOptions edgeOptions() {
        EdgeOptions options = new EdgeOptions();
        if (TestConfig.headless()) {
            options.addArguments("--headless=new");
        }
        return options;
    }

    private static URL toUrl(String url) {
        try {
            return URI.create(url).toURL();
        } catch (MalformedURLException | IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid selenium.remote.url: " + url, e);
        }
    }
}
