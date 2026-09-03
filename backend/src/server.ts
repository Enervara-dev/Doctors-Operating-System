import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.port, env.apiHost, () => {
  console.log(`[api] Enervara Doctor API listening on http://${env.apiHost}:${env.port}`);
});
