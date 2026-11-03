import { createServer } from "node:http";
import { handlePrivateRequest } from "./private.mjs";

createServer(handlePrivateRequest).listen(3003, "127.0.0.1", () => {
  console.log("Protected local account service ready on 127.0.0.1:3003");
});
