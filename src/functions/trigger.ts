import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { DynamoDBStreamEvent, AttributeValue } from "aws-lambda"

const s3 = new S3Client()

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  for (const record of event.Records) {
    try {
      if (record.eventName !== "REMOVE") continue

      const oldImage = record.dynamodb?.OldImage
      if (!oldImage) continue
      if (oldImage._et?.S !== "Link") continue

      const id = oldImage.id?.S
      const keys = oldImage.keys?.L

      if (!id || !keys) continue

      const deleteResults = await Promise.all(
        keys.map(async (key: AttributeValue) => {
          if (!key.S) {
            console.warn("Invalid key format in keys list:", key)
            return
          }

          const s3Key = `${id}/${key.S}`

          try {
            await s3.send(
              new DeleteObjectCommand({
                Bucket: process.env.BUCKET_NAME,
                Key: s3Key,
              })
            )
            console.log(`Successfully deleted: ${s3Key}`)
          } catch (error) {
            console.error(`Failed to delete key: ${key.S}`, error)
          }
        })
      )
    } catch (error) {
      console.error("Error processing DynamoDB stream record:", error)
    }
  }
}
