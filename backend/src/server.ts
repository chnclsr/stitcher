import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8788);
const server = createServer(createApp());
server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`stick.ai proxy listening on ${port}\n`);
});
