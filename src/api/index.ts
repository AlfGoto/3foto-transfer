import { Hono } from "hono";
import { handle } from "hono/aws-lambda";

const app = new Hono();

app.post("/", async (c) => {
  c.text("Hello Transfer!");
});

export const handler = handle(app);
