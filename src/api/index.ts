import { Hono } from "hono"
import { handle } from "hono/aws-lambda"
import { S3Client } from "@aws-sdk/client-s3"
import { LinkEntity } from "../core/link/link.entity"
import { PutItemCommand } from "dynamodb-toolbox"
import { addDays } from "date-fns"
import { v4 as uuid } from "uuid"

const app = new Hono()

const s3 = new S3Client({})

app.post("/", async (c) => {
  const body = c.req.bodyCache
  const date = new Date()
  const id = uuid()

  await LinkEntity.build(PutItemCommand)
    .item({
      date: date.toISOString(),
      ttl: Math.round(addDays(date, 7).getTime() / 1000),
      // ttl: Math.round(date.getTime() / 1000) + 60,
      id: id,
      keys: ["ok", "yes", "oui"],
    })
    .send()

  return c.text("done")
})

app.get("/:id", async (c) => {
  const { id } = c.req.param()
  return c.text(id)
})

export const handler = handle(app)
