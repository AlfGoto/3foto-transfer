import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"
import { Table } from "dynamodb-toolbox"

export const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient())

export const TransferTable = new Table({
  name: process.env.TABLE_NAME,
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  documentClient: documentClient,
})
