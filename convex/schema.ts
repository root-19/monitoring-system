import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const tankSize = v.union(v.literal("11kg"), v.literal("2.7kg"));
export const role = v.union(v.literal("admin"), v.literal("client"));

export default defineSchema({
  users: defineTable({
    name: v.string(),
    phone: v.string(), // normalized: 09XXXXXXXXX
    passwordHash: v.string(),
    role,
    address: v.optional(v.string()),
    landmark: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    tankSize: v.optional(tankSize),
    avgDaysPerTank: v.optional(v.number()), // how many days one tank usually lasts
    lastDeliveryAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_role", ["role"]),

  sessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  deliveries: defineTable({
    clientId: v.id("users"),
    deliveredAt: v.number(),
    tankSize,
    quantity: v.number(),
    amount: v.optional(v.number()),
    notes: v.optional(v.string()),
    recordedBy: v.id("users"),
  })
    .index("by_client", ["clientId"])
    .index("by_date", ["deliveredAt"]),

  requests: defineTable({
    clientId: v.id("users"),
    type: v.union(v.literal("refill"), v.literal("inquiry"), v.literal("other")),
    message: v.string(),
    tankSize: v.optional(tankSize),
    quantity: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("scheduled"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    scheduledAt: v.optional(v.number()),
    adminNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  messages: defineTable({
    clientId: v.id("users"), // conversation = one client <-> PGI admins
    senderId: v.id("users"),
    senderRole: role,
    body: v.string(),
    createdAt: v.number(),
    readByAdmin: v.boolean(),
    readByClient: v.boolean(),
  }).index("by_client", ["clientId"]),

  /** Tanks on hand per size. Kept in sync by inventory.moveStock. */
  stock: defineTable({
    tankSize,
    onHand: v.number(),
    updatedAt: v.number(),
  }).index("by_tank", ["tankSize"]),

  /** Selling price per tank size; used to pre-fill delivery amounts. */
  prices: defineTable({
    tankSize,
    price: v.number(),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }).index("by_tank", ["tankSize"]),

  /** Audit log of stock changes. delta > 0 = stock in, < 0 = stock out. */
  stockMovements: defineTable({
    tankSize,
    delta: v.number(),
    kind: v.union(v.literal("restock"), v.literal("sale"), v.literal("adjustment")),
    note: v.optional(v.string()),
    deliveryId: v.optional(v.id("deliveries")),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_date", ["createdAt"])
    .index("by_delivery", ["deliveryId"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    type: v.union(
      v.literal("reminder"),
      v.literal("low_gas"),
      v.literal("delivery"),
      v.literal("request"),
      v.literal("message"),
      v.literal("system")
    ),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
    smsStatus: v.union(v.literal("none"), v.literal("pending"), v.literal("sent")),
    smsSentAt: v.optional(v.number()),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_sms", ["smsStatus"]),
});
