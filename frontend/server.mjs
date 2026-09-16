import https from "https";
import fs from "fs";
import next from "next";

const dev = true;
const hostname = "local.ia.kptmangaluru.in";
const port = 443;

const app = next({
  dev,
  hostname,
  port,
});

const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(
    "./local.ia.kptmangaluru.in-key.pem"
  ),
  cert: fs.readFileSync(
    "./local.ia.kptmangaluru.in.pem"
  ),
};

await app.prepare();

https
  .createServer(httpsOptions, (req, res) => {
    handle(req, res);
  })
  .listen(port, hostname, () => {
    console.log(
      `🚀 KPT IA running at https://${hostname}`
    );
  });