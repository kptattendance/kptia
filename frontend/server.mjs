import { createServer } from "https";
import { readFileSync } from "fs";
import next from "next";

const app = next({ dev: true });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: readFileSync("./local.ia.kptmangaluru.in-key.pem"),
  cert: readFileSync("./local.ia.kptmangaluru.in.pem"),
};

await app.prepare();

createServer(httpsOptions, (req, res) => {
  handle(req, res);
}).listen(443, "0.0.0.0", () => {
  console.log("Running at https://local.ia.kptmangaluru.in");
});