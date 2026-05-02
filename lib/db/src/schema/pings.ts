import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pingsTable = pgTable("pings", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  senderSessionId: integer("sender_session_id"),
  receiverSessionId: integer("receiver_session_id"),
  status: text("status").notNull().default("pending"),
  message: text("message"),
  revealedLat: real("revealed_lat"),
  revealedLng: real("revealed_lng"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPingSchema = createInsertSchema(pingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPing = z.infer<typeof insertPingSchema>;
export type Ping = typeof pingsTable.$inferSelect;
