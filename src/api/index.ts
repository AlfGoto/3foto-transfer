import { Hono } from "hono"
import { handle } from "hono/aws-lambda"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { LinkEntity } from "../core/link/link.entity"
import { PutItemCommand } from "dynamodb-toolbox"
import { addDays } from "date-fns"
import { v4 as uuid } from "uuid"

const app = new Hono()
const s3 = new S3Client({})

app.post("/", async (c) => {
  const id = uuid()
  let fileKeys: (string | null)[] = []

  try {
    const formData = await c.req.formData()
    const files = formData.getAll("files")

    console.log("Received files:", files.length)

    if (files.length > 0) {
      fileKeys = await Promise.all(
        files.map(async (file, index) => {
          if (file instanceof File) {
            const fileName = file.name
            const fileContent = await file.arrayBuffer()

            try {
              await s3.send(
                new PutObjectCommand({
                  Bucket: process.env.BUCKET_NAME,
                  Key: `${id}/${fileName}`,
                  Body: Buffer.from(fileContent),
                  ContentType: file.type,
                })
              )

              return fileName
            } catch (uploadError) {
              console.error(`Error uploading file ${index + 1}:`, uploadError)
              return null
            }
          } else {
            console.log(`Unexpected file type for file ${index + 1}:`, typeof file)
            return null
          }
        })
      )

      fileKeys = fileKeys.filter((key) => key !== null)
    }

    const date = new Date()
    await LinkEntity.build(PutItemCommand)
      .item({
        date: date.toISOString(),
        ttl: Math.round(addDays(date, 7).getTime() / 1000),
        id: id,
        keys: fileKeys.filter((e) => e) as string[],
      })
      .send()

    return c.json({ message: "Files uploaded successfully", id: id })
  } catch (error) {
    console.error("Error during file upload:", error)
    return c.json({ error: "Failed to upload files" }, 500)
  }
})

app.get("/:id", async (c) => {
  const { id } = c.req.param()
  return c.text(id)
})

export const handler = handle(app)
