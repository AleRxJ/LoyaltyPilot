import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const dealStatusEnum = pgEnum("deal_status", ["pending", "approved", "rejected"]);
export const productTypeEnum = pgEnum("product_type", ["software", "hardware", "equipment"]);
export const rewardStatusEnum = pgEnum("reward_status", ["pending", "approved", "rejected", "delivered"]);
export const shipmentStatusEnum = pgEnum("shipment_status", ["pending", "shipped", "delivered"]);
export const supportTicketStatusEnum = pgEnum("support_ticket_status", ["open", "in_progress", "resolved", "closed"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  country: text("country").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isApproved: boolean("is_approved").notNull().default(false),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  inviteToken: text("invite_token"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  productType: productTypeEnum("product_type").notNull(),
  productName: text("product_name").notNull(),
  dealValue: decimal("deal_value", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  closeDate: timestamp("close_date").notNull(),
  clientInfo: text("client_info"),
  licenseAgreementNumber: text("license_agreement_number"),
  status: dealStatusEnum("status").notNull().default("pending"),
  pointsEarned: integer("points_earned").default(0),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const rewards = pgTable("rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  pointsCost: integer("points_cost").notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  stockQuantity: integer("stock_quantity"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const userRewards = pgTable("user_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  rewardId: varchar("reward_id").notNull().references(() => rewards.id),
  status: rewardStatusEnum("status").notNull().default("pending"),
  shipmentStatus: shipmentStatusEnum("shipment_status").notNull().default("pending"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  redeemedAt: timestamp("redeemed_at").notNull().default(sql`now()`),
  deliveredAt: timestamp("delivered_at"),
  deliveryAddress: text("delivery_address"),
  shippedAt: timestamp("shipped_at"),
  shippedBy: varchar("shipped_by").references(() => users.id),
});

export const pointsHistory = pgTable("points_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  dealId: varchar("deal_id").references(() => deals.id),
  rewardId: varchar("reward_id").references(() => rewards.id),
  points: integer("points").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  multiplier: decimal("multiplier", { precision: 3, scale: 2 }).notNull().default("1.00"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info, success, warning, error
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: supportTicketStatusEnum("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  adminResponse: text("admin_response"),
  respondedAt: timestamp("responded_at"),
  respondedBy: varchar("responded_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const pointsConfig = pgTable("points_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  softwareRate: integer("software_rate").notNull().default(1000),
  hardwareRate: integer("hardware_rate").notNull().default(5000),
  equipmentRate: integer("equipment_rate").notNull().default(10000),
  grandPrizeThreshold: integer("grand_prize_threshold").notNull().default(50000),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  deals: many(deals),
  userRewards: many(userRewards),
  pointsHistory: many(pointsHistory),
  notifications: many(notifications),
  supportTickets: many(supportTickets),
}));

export const dealsRelations = relations(deals, ({ one }) => ({
  user: one(users, {
    fields: [deals.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [deals.approvedBy],
    references: [users.id],
  }),
}));

export const userApprovalRelations = relations(users, ({ one }) => ({
  approver: one(users, {
    fields: [users.approvedBy],
    references: [users.id],
  }),
}));

export const rewardsRelations = relations(rewards, ({ many }) => ({
  userRewards: many(userRewards),
}));

export const userRewardsRelations = relations(userRewards, ({ one }) => ({
  user: one(users, {
    fields: [userRewards.userId],
    references: [users.id],
  }),
  reward: one(rewards, {
    fields: [userRewards.rewardId],
    references: [rewards.id],
  }),
  approver: one(users, {
    fields: [userRewards.approvedBy],
    references: [users.id],
  }),
  shipper: one(users, {
    fields: [userRewards.shippedBy],
    references: [users.id],
  }),
}));

export const pointsHistoryRelations = relations(pointsHistory, ({ one }) => ({
  user: one(users, {
    fields: [pointsHistory.userId],
    references: [users.id],
  }),
  deal: one(deals, {
    fields: [pointsHistory.dealId],
    references: [deals.id],
  }),
  reward: one(rewards, {
    fields: [pointsHistory.rewardId],
    references: [rewards.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
  assignedAdmin: one(users, {
    fields: [supportTickets.assignedTo],
    references: [users.id],
  }),
  responder: one(users, {
    fields: [supportTickets.respondedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
  password: true,
  createdAt: true,
  updatedAt: true,
  approvedBy: true,
  approvedAt: true,
  inviteToken: true,
  resetToken: true,
  resetTokenExpiry: true,
}).partial();

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  pointsEarned: true,
  approvedBy: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  closeDate: z.string().transform((str) => new Date(str)),
});

export const updateDealSchema = createInsertSchema(deals).omit({
  id: true,
  userId: true,
  pointsEarned: true,
  approvedBy: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  closeDate: z.string().transform((str) => new Date(str)),
}).partial();

export const insertRewardSchema = createInsertSchema(rewards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserRewardSchema = createInsertSchema(userRewards).omit({
  id: true,
  redeemedAt: true,
});

export const insertPointsHistorySchema = createInsertSchema(pointsHistory).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const updatePointsConfigSchema = createInsertSchema(pointsConfig).omit({
  id: true,
  updatedAt: true,
}).partial();

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type UpdateDeal = z.infer<typeof updateDealSchema>;
export type Reward = typeof rewards.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type UserReward = typeof userRewards.$inferSelect;
export type InsertUserReward = z.infer<typeof insertUserRewardSchema>;
export type PointsHistory = typeof pointsHistory.$inferSelect;
export type InsertPointsHistory = z.infer<typeof insertPointsHistorySchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type UpdateSupportTicket = z.infer<typeof updateSupportTicketSchema>;
export type PointsConfig = typeof pointsConfig.$inferSelect;
export type UpdatePointsConfig = z.infer<typeof updatePointsConfigSchema>;

// Deal with user information for admin views
export type DealWithUser = Deal & {
  userFirstName: string;
  userLastName: string;
  userName: string;
};

// Support ticket with user information for admin views
export type SupportTicketWithUser = SupportTicket & {
  userFirstName: string;
  userLastName: string;
  userName: string;
  userEmail: string;
};
