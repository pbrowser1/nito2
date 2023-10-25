import createBareServer from "@tomphttp/bare-server-node";
import  uvPath  from "@titaniumnetwork-dev/ultraviolet";
import  gamPath  from "@amethystnetwork-dev/incognito-gfiles";
import  fileURLToPath from "node:url";
import { createServer as createHttpsServer } from "node:https";
import { createServer as createHttpServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { hostname } from "node:os";

import serveStatic from "serve-static";
import serveIndex from "serve-index";
import connect from "connect";
import analytics from "./analytics.js";

const app = connect();
const bare = createBareServer("/bare/");
const ssl = existsSync("../ssl/key.pem") && existsSync("../ssl/cert.pem");
const PORT = process.env.PORT || ssl ? 443 : 8080;
const server = ssl ? createHttpsServer({
  key: readFileSync("../ssl/key.pem"),
  cert: readFileSync("../ssl/cert.pem")
}) : createHttpServer();

app.use((req, res, next) => {
  if(bare.shouldRoute(req)) bare.routeRequest(req, res); else next();
});

app.use(serveStatic(fileURLToPath(new URL("../static/", import.meta.url))));
app.use("/source", serveStatic(gamPath));
app.use("/source", serveIndex(gamPath, { icons: true }));

app.use("/uv/", serveStatic(uvPath));
analytics(app);

server.on("request", app);
server.on("upgrade", (req, socket, head) => {
  if(bare.shouldRoute(req, socket, head)) bare.routeUpgrade(req, socket, head); else socket.end();
});

server.on("listening", () => {
  const addr = server.address();
  const formatURLWithPort = (hostname, addr) => `http${ssl ? "s" : ""}://${hostname}${(addr.port === 80 || ssl && addr.port === 443) ? "" : ":" + addr.port}`;

  console.log(`Server running on port ${addr.port}`)

});

server.listen({ port: PORT })