import { Entity, FormattedItem, list, number, schema, string } from "dynamodb-toolbox"
import { TransferTable } from "../dynamodb"

export const LinkEntity = new Entity({
  name: "Link",
  schema: schema({
    id: string().key(),
    date: string().key(), // ISO
    keys: list(string()).optional(),
    ttl: number(),
  }),
  computeKey: ({ date, id }: { date: string; id: string }) => ({
    PK: `LINK#${id}`,
    SK: `DATE#${date}`,
  }),
  table: TransferTable,
})
export type LinkEntityType = FormattedItem<typeof LinkEntity>
