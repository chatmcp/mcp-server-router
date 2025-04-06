import fs from "node:fs";

export function log(message: string) {
  try {
    // fs.appendFileSync(
    //   "/tmp/mcp-transport.log",
    //   `${new Date().toISOString()} - ${message}\n`
    // );
  } catch (error) {}
}
