// Feature #43: Create Game form validation - empty name field
// Verifies empty name shows validation error, typing clears it, then successful creation.

import { chromium } from "playwright";

let BASE_URL = "http://localhost:5173";
let API_BASE = "http://localhost:3001";
let SCREENSHOT_DIR = "screenshots";
let GAME_NAME = "VALIDATION_TEST_GAME_43";
let INPUT_SEL = 'input[placeholder="Enter game name..."]';
let ERROR_SEL = '[data-testid="name-error"]';
let BTN_SEL = 'button:has-text("Create Game")';

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}
async function test() {
  let browser = await chromium.launch({ headless: true });
  let context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  let page = await context.newPage();

  let consoleErrors = [];
  page.on("console", function(msg) {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  let createdGameId = null;

  try {
    console.log("STEP 1: Navigate to start screen");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await sleep(500);
    console.log("  Page loaded successfully");

    console.log("STEP 2: Click Create New Game button");
    await page.click("button:has-text('Create New Game')");
    await sleep(500);

    console.log("STEP 3: Verify modal appeared");
    let nameInput = await page.waitForSelector(INPUT_SEL, { timeout: 5000 });
    if (!nameInput) {
      throw new Error("Create Game modal did not appear - name input not found");
    }
    console.log("  PASS: Modal is open, name input is visible");

    console.log("STEP 4: Click Create Game submit without entering a name");
    await page.click(BTN_SEL);
    await sleep(500);

    console.log("STEP 5: Take screenshot of validation error");
    await page.screenshot({ path: SCREENSHOT_DIR + "/f43-step5-validation-error.png" });

    console.log("STEP 6: Verify Game name is required error message");
    let errorEl = await page.waitForSelector(ERROR_SEL, { timeout: 3000 });
    let errorText = await errorEl.textContent();
    console.log("  Error message text:", errorText);
    if (errorText !== "Game name is required") {
      throw new Error("Expected Game name is required but got " + errorText);
    }
    console.log("  PASS: Correct validation error message displayed");

    console.log("STEP 7: Verify modal is still open");
    let nameInputStillVisible = await page.isVisible(INPUT_SEL);
    if (!nameInputStillVisible) {
      throw new Error("Modal closed after submitting empty form - validation failed to prevent submission");
    }
    console.log("  PASS: Modal is still open, form was not submitted");

    console.log("STEP 8: Type game name " + GAME_NAME + " in the name field");
    await page.fill(INPUT_SEL, GAME_NAME);
    await sleep(300);

    console.log("STEP 9: Verify error message disappears after typing");
    let errorStillVisible = await page.isVisible(ERROR_SEL);
    if (errorStillVisible) {
      throw new Error("Validation error message did not disappear after entering a valid name");
    }
    console.log("  PASS: Error message cleared after typing a name");

    console.log("STEP 10: Click Create Game to submit");
    await page.click(BTN_SEL);
    await sleep(1000);

    console.log("STEP 11: Take screenshot showing success");
    await page.screenshot({ path: SCREENSHOT_DIR + "/f43-step11-game-created.png" });

    console.log("STEP 12: Verify game appears in the list");
    let gameVisible = await page.waitForSelector("text=VALIDATION_TEST_GAME_43", { timeout: 5000 });
    if (!gameVisible) {
      throw new Error("Game VALIDATION_TEST_GAME_43 not visible in the list after creation");
    }
    console.log("  PASS: Game VALIDATION_TEST_GAME_43 appears in the game list");

    let modalClosed = !(await page.isVisible(INPUT_SEL));
    if (!modalClosed) {
      throw new Error("Modal did not close after successful game creation");
    }
    console.log("  PASS: Modal closed after successful creation");

    console.log("STEP 13: Find game ID for cleanup");
    let gamesRes = await fetch(API_BASE + "/api/games");
    let allGames = await gamesRes.json();
    let testGame = allGames.find(function(g) { return g.name === GAME_NAME; });
    if (testGame) {
      createdGameId = testGame.id;
      console.log("  Found test game with ID:", createdGameId);
    } else {
      console.log("  WARNING: Could not find test game in API response for cleanup");
    }

    console.log("");
    console.log("======================================");
    console.log("ALL STEPS PASSED");
    console.log("======================================");
    console.log("  - Empty name submission shows validation error");
    console.log("  - Error message says Game name is required");
    console.log("  - Modal stays open on validation failure");
    console.log("  - Error clears when user types a valid name");
    console.log("  - Game created successfully with valid name");
    console.log("  - Game appears in the list");

    if (consoleErrors.length > 0) {
      console.log("");
      console.log("Console errors during test:");
      consoleErrors.forEach(function(e) { console.log("  -", e); });
    }

  } catch (err) {
    console.error("");
    console.error("TEST FAILED:", err.message);
    await page.screenshot({ path: SCREENSHOT_DIR + "/f43-failure.png" });
    throw err;
  } finally {
    if (createdGameId) {
      console.log("");
      console.log("CLEANUP: Deleting test game via API...");
      try {
        let deleteRes = await fetch(API_BASE + "/api/games/" + createdGameId, {
          method: "DELETE",
        });
        if (deleteRes.ok) {
          console.log("  Deleted game", createdGameId, "successfully");
        } else {
          console.log("  WARNING: Delete returned status", deleteRes.status);
        }
      } catch (cleanupErr) {
        console.log("  WARNING: Cleanup failed:", cleanupErr.message);
      }
    }

    await browser.close();
    console.log("Browser closed.");
  }
}

test().catch(function() { process.exit(1); });
