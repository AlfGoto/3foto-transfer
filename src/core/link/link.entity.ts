import { Entity, FormattedItem, list, number, schema, string } from "dynamodb-toolbox"
import { TransferTable } from "../dynamodb"

export const LinkEntity = new Entity({
  name: "Link",
  schema: schema({
    id: string().key(),
    date: string(), // ISO
    keys: list(string()),
    ttl: number(),
    creatorId: string().optional(),
    creatorName: string().optional(),
  }),
  computeKey: ({ id }: { id: string }) => ({
    PK: `LINK#${id}`,
    SK: `LINK`,
  }),
  table: TransferTable,
})
export type LinkEntityType = FormattedItem<typeof LinkEntity>
