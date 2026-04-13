import { spawn } from "node:child_process";

function runShellCommand(command, { cwd, stdin = "" } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}: ${stderr || stdout}`));
        return;
      }

      resolve({ stdout, stderr });
    });

    if (stdin) {
      child.stdin.write(stdin);
    }

    child.stdin.end();
  });
}

function parseJsonOutput(rawOutput, command) {
  try {
    return JSON.parse(rawOutput);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON output from command "${command}": ${error.message}\nOutput: ${rawOutput}`
    );
  }
}

export async function runJsonCommand(command, options = {}) {
  const { stdout } = await runShellCommand(command, options);
  return parseJsonOutput(stdout.trim(), command);
}
