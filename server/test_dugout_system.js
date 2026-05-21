import { fork } from "child_process";
import WebSocket from "ws";
import assert from "assert";
import path from "path";
import { fileURLToPath } from "url";
import { processBallEvent } from "../client/src/utils/localSimulator.js";
import { SCENARIOS } from "../client/src/utils/scenarios.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Run tests
async function runTests() {
  console.log("=== STARTING DUGOUT SYSTEM STABILITY TESTS ===");
  
  // 1. Verify Local (Offline) Simulator Logic
  console.log("\n[TEST 1] Testing Local/Offline Fallback Simulator...");
  try {
    const scenarioId = "ind_vs_pak_2022";
    const scenario = SCENARIOS[scenarioId];
    assert.ok(scenario, "IND vs PAK Scenario should exist");
    assert.ok(scenario.balls.length > 0, "Scenario should have balls");
    
    // Simulate first ball
    const history = [];
    const sharedMemory = { timeline: [] };
    const firstBall = scenario.balls[0];
    const update = processBallEvent(firstBall, scenarioId, history, sharedMemory);
    
    assert.ok(update, "Update payload should be generated");
    assert.strictEqual(update.type, "MATCH_UPDATE", "Type should be MATCH_UPDATE");
    assert.ok(update.scoreboard, "Scoreboard should exist");
    assert.ok(update.telemetry, "Telemetry should exist");
    assert.ok(update.agents, "Agents insights should exist");
    assert.ok(update.agents.analyst.text, "Analyst should have text");
    assert.ok(update.agents.scout.text, "Scout should have text");
    assert.ok(update.agents.narrator.text, "Narrator should have text");
    assert.ok(typeof update.telemetry.pressureIndex === "number", "Pressure Index must be a number");
    assert.ok(typeof update.telemetry.winProbability === "number", "Win Probability must be a number");
    
    console.log("✓ Local/Offline Simulator verified successfully.");
  } catch (err) {
    console.error("✗ Local/Offline Simulator test failed:", err);
    process.exit(1);
  }

  // 2. Verify Server socket handling & jump functions
  console.log("\n[TEST 2] Launching server on test port 3002 to verify WebSockets...");
  
  const serverPath = path.join(__dirname, "server.js");
  const serverProcess = fork(serverPath, [], {
    env: { ...process.env, PORT: "3002" },
    silent: true
  });

  // Capture stdout and stderr
  serverProcess.stdout.on("data", (data) => {
    console.log(`[Server stdout]: ${data.toString().trim()}`);
  });
  serverProcess.stderr.on("data", (data) => {
    console.error(`[Server stderr]: ${data.toString().trim()}`);
  });

  // Wait a bit for server to boot
  await new Promise((resolve) => setTimeout(resolve, 1500));

  let client;
  try {
    client = new WebSocket("ws://localhost:3002");
    
    // Connection opened
    await new Promise((resolve, reject) => {
      client.on("open", resolve);
      client.on("error", reject);
    });
    console.log("✓ Connected mock client to WebSocket server on port 3002");

    // Receive system ready
    const systemReadyMsg = await new Promise((resolve) => {
      client.once("message", (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });
    
    assert.strictEqual(systemReadyMsg.type, "SYSTEM_READY", "First message should be SYSTEM_READY");
    assert.ok(Array.isArray(systemReadyMsg.scenarios), "SYSTEM_READY should include scenarios list");
    console.log("✓ SYSTEM_READY message format verified.");

    // Test JUMP_TO_BALL command (Kohli's straight six 18.5)
    console.log("\n[TEST 3] Testing JUMP_TO_BALL command (Kohli's Straight Six)...");
    client.send(JSON.stringify({
      type: "JUMP_TO_BALL",
      scenarioId: "ind_vs_pak_2022",
      over: 18.5,
      event: "six",
      demoTriggerId: "kohli_six_18_5"
    }));

    const jumpResult = await new Promise((resolve) => {
      client.on("message", function listener(data) {
        const payload = JSON.parse(data.toString());
        if (payload.type === "MATCH_UPDATE") {
          client.off("message", listener);
          resolve(payload);
        }
      });
    });

    assert.strictEqual(jumpResult.scoreboard.over, 18.5, "Jump target over should match 18.5");
    assert.strictEqual(jumpResult.scoreboard.lastBallEvent, "six", "Last ball event should be a six");
    assert.ok(jumpResult.isDemoMoment, "isDemoMoment flag should be true");
    assert.strictEqual(jumpResult.demoTriggerId, "kohli_six_18_5", "demoTriggerId should match");
    assert.ok(jumpResult.history.length > 0, "History should be pre-populated on jump");
    console.log("✓ JUMP_TO_BALL command response verified successfully.");

    // Test JUMP_TO_BALL with dissent (Shane Watson runout 19.5)
    console.log("\n[TEST 4] Testing JUMP_TO_BALL with dissent (Shane Watson Runout)...");
    client.send(JSON.stringify({
      type: "JUMP_TO_BALL",
      scenarioId: "mi_vs_csk_2019",
      over: 19.5,
      event: "wicket",
      demoTriggerId: "watson_runout_19_5"
    }));

    const dissentResult = await new Promise((resolve) => {
      client.on("message", function listener(data) {
        const payload = JSON.parse(data.toString());
        if (payload.type === "MATCH_UPDATE") {
          client.off("message", listener);
          resolve(payload);
        }
      });
    });

    assert.strictEqual(dissentResult.scoreboard.over, 19.5, "Jump target over should match 19.5");
    assert.strictEqual(dissentResult.scoreboard.lastBallEvent, "wicket", "Event should be a wicket");
    assert.ok(dissentResult.telemetry.disagreementActive, "disagreementActive should be true");
    assert.ok(dissentResult.agents.scout.dissent, "Scout dissent state should be true");
    console.log("✓ Live dissent / disagreement Active telemetry flags verified.");

    console.log("\n=== ALL SYSTEM TESTS COMPLETED SUCCESSFULLY! ===");

  } catch (err) {
    console.error("✗ Test suite failed:", err);
    if (client) client.close();
    serverProcess.kill();
    process.exit(1);
  }

  // Cleanup
  if (client) client.close();
  serverProcess.kill();
  process.exit(0);
}

runTests();
