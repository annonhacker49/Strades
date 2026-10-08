import { execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const name = "tradedemo-postgres";
const action = process.argv[2];

function run(command, args, options = {}) {
  return execFileSync(command, args, { stdio: "inherit", ...options });
}

if (action === "up") {
  try {
    run("docker", ["start", name], { stdio: "ignore" });
  } catch {
    run("docker", [
      "run", "-d", "--name", name,
      "-e", "POSTGRES_USER=tradedemo",
      "-e", "POSTGRES_PASSWORD=tradedemo-local",
      "-e", "POSTGRES_DB=tradedemo",
      "-p", "127.0.0.1:5432:5432",
      "-v", "tradedemo_postgres:/var/lib/postgresql/data",
      "postgres:17-alpine",
    ]);
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      run("docker", ["exec", name, "pg_isready", "-U", "tradedemo", "-d", "tradedemo"], { stdio: "ignore" });
      console.info("TradeDemo PostgreSQL is ready on localhost:5432.");
      process.exit(0);
    } catch {
      await sleep(1000);
    }
  }
  console.error("TradeDemo PostgreSQL did not become ready within 30 seconds.");
  process.exit(1);
} else if (action === "down") {
  run("docker", ["stop", name]);
} else {
  console.error("Usage: node scripts/db.mjs <up|down>");
  process.exit(2);
}
