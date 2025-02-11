import dotenv from "dotenv";
dotenv.config();

async function main() {
  const server = await import("./server.js");
  server.start();
}

main();
