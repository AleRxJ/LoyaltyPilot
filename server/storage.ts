// ───────────────────────────────────────────────
// Database schema and types
// ───────────────────────────────────────────────
import {
  campaigns,
  deals,
  notifications,
  pointsConfig,
  pointsHistory,
  rewards,
  supportTickets,
  userRewards,
  users,
  type Campaign,
  type Deal,
  type DealWithUser,
  type InsertCampaign,
  type InsertDeal,
  type InsertNotification,
  type InsertPointsHistory,
  type InsertReward,
  type InsertSupportTicket,
  type InsertUser,
  type InsertUserReward,
  type Notification,
  type PointsConfig,
  type PointsHistory,
  type Reward,
  type SupportTicket,
  type SupportTicketWithUser,
  type UpdateDeal,
  type UpdatePointsConfig,
  type UpdateSupportTicket,
  type User,
  type UserReward,
} from "@shared/schema";

// ───────────────────────────────────────────────
// Database connection and ORM helpers
// ───────────────────────────────────────────────
import { db } from "./db";
import { and, desc, eq, count, sum, gte, gt, lte, isNotNull, sql } from "drizzle-orm";

// ───────────────────────────────────────────────
// Utilities
// ───────────────────────────────────────────────
import { randomUUID } from "crypto";
import { NotificationHelpers } from "./notifications";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByInviteToken(inviteToken: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getUserStats(userId: string): Promise<{
    totalPoints: number;
    availablePoints: number;
    totalDeals: number;
    pendingDeals: number;
    redeemedRewards: number;
  }>;

  // Deal methods
  createDeal(deal: InsertDeal): Promise<Deal>;
  getDeal(id: string): Promise<Deal | undefined>;
  getUserDeals(userId: string): Promise<Deal[]>;
  getPendingDeals(): Promise<DealWithUser[]>;
  approveDeal(id: string, approvedBy: string): Promise<Deal | undefined>;
  rejectDeal(id: string): Promise<Deal | undefined>;
  updateDeal(id: string, updates: UpdateDeal): Promise<Deal | undefined>;
  getRecentDeals(userId: string, limit?: number): Promise<Deal[]>;

  // Reward methods
  getRewards(): Promise<Reward[]>;
  getReward(id: string): Promise<Reward | undefined>;
  createReward(reward: InsertReward): Promise<Reward>;
  updateReward(
    id: string,
    updates: Partial<Reward>,
  ): Promise<Reward | undefined>;
  deleteReward(id: string): Promise<Reward | undefined>;
  redeemReward(userId: string, rewardId: string): Promise<UserReward>;
  getUserRewards(userId: string): Promise<UserReward[]>;
  updateRewardShipmentStatus(
    rewardRedemptionId: string,
    shipmentStatus: "pending" | "shipped" | "delivered",
    adminId: string,
  ): Promise<UserReward | undefined>;
  approveRewardRedemption(
    rewardRedemptionId: string,
    adminId: string,
  ): Promise<UserReward | undefined>;
  rejectRewardRedemption(
    rewardRedemptionId: string,
    adminId: string,
    reason?: string,
  ): Promise<UserReward | undefined>;
  getPendingRewardRedemptions(): Promise<
    Array<
      UserReward & {
        userName?: string;
        userFirstName?: string;
        userLastName?: string;
        rewardName?: string;
      }
    >
  >;
  getAllRewardRedemptions(): Promise<
    Array<
      UserReward & {
        userName?: string;
        userFirstName?: string;
        userLastName?: string;
        rewardName?: string;
        pointsCost?: number;
      }
    >
  >;
  getUserRewardsWithDetails(
    userId: string,
  ): Promise<Array<UserReward & { rewardName?: string; pointsCost?: number }>>;

  // Points methods
  addPointsHistory(entry: InsertPointsHistory): Promise<PointsHistory>;
  getUserPointsHistory(userId: string): Promise<PointsHistory[]>;
  getUserTotalPoints(userId: string): Promise<number>;
  getUserAvailablePoints(userId: string): Promise<number>;
  getTopUsersByPoints(limit?: number): Promise<
    Array<{
      userId: string;
      username: string;
      firstName: string;
      lastName: string;
      totalPoints: number;
    }>
  >;

  // Campaign methods
  getCampaigns(): Promise<Campaign[]>;
  getActiveCampaigns(): Promise<Campaign[]>;

  // Admin methods
  getAllUsers(): Promise<User[]>;
  getAllDeals(
    page?: number,
    limit?: number,
  ): Promise<{ deals: DealWithUser[]; total: number }>;
  getPendingUsers(): Promise<User[]>;
  approveUser(userId: string, approvedBy: string): Promise<User | undefined>;
  rejectUser(userId: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<User | undefined>;
  getReportsData(filters: {
    country?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    userCount: number;
    dealCount: number;
    totalRevenue: number;
    redeemedRewards: number;
  }>;

  getRewardRedemptionsReport(filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<
    Array<{
      userName: string;
      userFirstName: string;
      userLastName: string;
      userEmail: string;
      rewardName: string;
      pointsCost: number;
      status: string;
      redeemedAt: Date;
      approvedAt: Date | null;
    }>
  >;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  // Support Ticket methods
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getSupportTicket(id: string): Promise<SupportTicket | undefined>;
  getUserSupportTickets(userId: string): Promise<SupportTicket[]>;
  getAllSupportTickets(): Promise<SupportTicketWithUser[]>;
  updateSupportTicket(
    id: string,
    updates: UpdateSupportTicket,
  ): Promise<SupportTicket | undefined>;

  // Points Config methods
  getPointsConfig(): Promise<PointsConfig | undefined>;
  updatePointsConfig(
    updates: UpdatePointsConfig,
    updatedBy: string,
  ): Promise<PointsConfig | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByInviteToken(inviteToken: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.inviteToken, inviteToken));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(
    id: string,
    updates: Partial<User>,
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getUserStats(userId: string): Promise<{
    totalPoints: number;
    availablePoints: number;
    totalDeals: number;
    pendingDeals: number;
    redeemedRewards: number;
  }> {
    const [totalPointsResult] = await db
      .select({ total: sum(pointsHistory.points) })
      .from(pointsHistory)
      .where(eq(pointsHistory.userId, userId));

    const [totalDealsResult] = await db
      .select({ count: count() })
      .from(deals)
      .where(eq(deals.userId, userId));

    const [pendingDealsResult] = await db
      .select({ count: count() })
      .from(deals)
      .where(and(eq(deals.userId, userId), eq(deals.status, "pending")));

    const [redeemedRewardsResult] = await db
      .select({ count: count() })
      .from(pointsHistory)
      .where(
        and(
          eq(pointsHistory.userId, userId),
          isNotNull(pointsHistory.rewardId),
        ),
      );

    const totalPoints = Number(totalPointsResult?.total || 0);
    const availablePoints = await this.getUserAvailablePoints(userId);

    return {
      totalPoints,
      availablePoints,
      totalDeals: totalDealsResult?.count || 0,
      pendingDeals: pendingDealsResult?.count || 0,
      redeemedRewards: redeemedRewardsResult?.count || 0,
    };
  }

  async createDeal(deal: InsertDeal): Promise<Deal> {
    const [createdDeal] = await db.insert(deals).values(deal).returning();
    return createdDeal;
  }

  async getDeal(id: string): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal || undefined;
  }

  async getUserDeals(userId: string): Promise<Deal[]> {
    return await db
      .select()
      .from(deals)
      .where(eq(deals.userId, userId))
      .orderBy(desc(deals.createdAt));
  }

  async getPendingDeals(): Promise<DealWithUser[]> {
    const result = await db
      .select({
        id: deals.id,
        userId: deals.userId,
        productType: deals.productType,
        productName: deals.productName,
        dealValue: deals.dealValue,
        quantity: deals.quantity,
        closeDate: deals.closeDate,
        clientInfo: deals.clientInfo,
        licenseAgreementNumber: deals.licenseAgreementNumber,
        status: deals.status,
        pointsEarned: deals.pointsEarned,
        approvedBy: deals.approvedBy,
        approvedAt: deals.approvedAt,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userName: users.username,
      })
      .from(deals)
      .leftJoin(users, eq(deals.userId, users.id))
      .where(eq(deals.status, "pending"))
      .orderBy(desc(deals.createdAt));

    return result as DealWithUser[];
  }

  // Calculate points based on product type and deal value using dynamic configuration
  private async calculatePointsForDeal(
    productType: string,
    dealValue: number,
  ): Promise<number> {
    const value = Number(dealValue);
    if (isNaN(value) || value <= 0) return 0;

    const config = await this.getPointsConfig();

    const softwareRate = config?.softwareRate || 1000;
    const hardwareRate = config?.hardwareRate || 5000;
    const equipmentRate = config?.equipmentRate || 10000;

    switch (productType) {
      case "software":
        return Math.floor(value / softwareRate);
      case "hardware":
        return Math.floor(value / hardwareRate);
      case "equipment":
        return Math.floor(value / equipmentRate);
      default:
        return 0;
    }
  }

  async approveDeal(id: string, approvedBy: string): Promise<Deal | undefined> {
    const deal = await this.getDeal(id);
    if (!deal) return undefined;

    // Calculate points based on dynamic configuration
    const pointsEarned = await this.calculatePointsForDeal(
      deal.productType,
      Number(deal.dealValue),
    );

    const [updatedDeal] = await db
      .update(deals)
      .set({
        status: "approved",
        pointsEarned,
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(deals.id, id))
      .returning();

    // Add points to history
    if (updatedDeal && pointsEarned > 0) {
      await this.addPointsHistory({
        userId: updatedDeal.userId,
        dealId: id,
        points: pointsEarned,
        description: `Points earned for deal: ${deal.productName}`,
      });

      // Enviar notificación en tiempo real
      await NotificationHelpers.dealApproved(
        updatedDeal.userId,
        id,
        pointsEarned
      );
    }

    return updatedDeal || undefined;
  }

  // Recalculate points for all existing deals based on new formula
  async recalculateAllDealsPoints(): Promise<{
    updated: number;
    errors: string[];
  }> {
    const allDeals = await db.select().from(deals);
    let updated = 0;
    const errors: string[] = [];

    for (const deal of allDeals) {
      try {
        const newPoints = await this.calculatePointsForDeal(
          deal.productType,
          Number(deal.dealValue),
        );

        // Only update if points changed or deal is approved
        if (
          (deal.pointsEarned || 0) !== newPoints &&
          deal.status === "approved"
        ) {
          await db
            .update(deals)
            .set({
              pointsEarned: newPoints,
              updatedAt: new Date(),
            })
            .where(eq(deals.id, deal.id));

          // Update points history - remove old entry if exists and add new one
          if (newPoints > 0) {
            // Remove old points history for this deal
            await db
              .delete(pointsHistory)
              .where(eq(pointsHistory.dealId, deal.id));

            // Add new points history entry
            await this.addPointsHistory({
              userId: deal.userId,
              dealId: deal.id,
              points: newPoints,
              description: `Points recalculated for deal: ${deal.productName}`,
            });
          }

          updated++;
        } else if (deal.status !== "approved" && (deal.pointsEarned || 0) > 0) {
          // Reset points for non-approved deals
          await db
            .update(deals)
            .set({
              pointsEarned: 0,
              updatedAt: new Date(),
            })
            .where(eq(deals.id, deal.id));

          // Remove points history for non-approved deals
          await db
            .delete(pointsHistory)
            .where(eq(pointsHistory.dealId, deal.id));

          updated++;
        }
      } catch (error) {
        errors.push(`Failed to update deal ${deal.id}: ${error}`);
      }
    }

    return { updated, errors };
  }

  async rejectDeal(id: string): Promise<Deal | undefined> {
    const [updatedDeal] = await db
      .update(deals)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();

    // Enviar notificación en tiempo real
    if (updatedDeal) {
      await NotificationHelpers.dealRejected(updatedDeal.userId, id);
    }

    return updatedDeal || undefined;
  }

  async updateDeal(id: string, updates: UpdateDeal): Promise<Deal | undefined> {
    const [updatedDeal] = await db
      .update(deals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    return updatedDeal || undefined;
  }

  async getRecentDeals(userId: string, limit = 10): Promise<Deal[]> {
    return await db
      .select()
      .from(deals)
      .where(eq(deals.userId, userId))
      .orderBy(desc(deals.createdAt))
      .limit(limit);
  }

  async getRewards(): Promise<Reward[]> {
    return await db
      .select()
      .from(rewards)
      .where(eq(rewards.isActive, true))
      .orderBy(rewards.pointsCost);
  }

  async getReward(id: string): Promise<Reward | undefined> {
    const [reward] = await db.select().from(rewards).where(eq(rewards.id, id));
    return reward || undefined;
  }

  async createReward(reward: InsertReward): Promise<Reward> {
    const [createdReward] = await db.insert(rewards).values(reward).returning();
    return createdReward;
  }

  async updateReward(
    id: string,
    updates: Partial<Reward>,
  ): Promise<Reward | undefined> {
    const [updatedReward] = await db
      .update(rewards)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rewards.id, id))
      .returning();
    return updatedReward || undefined;
  }

  async deleteReward(id: string): Promise<Reward | undefined> {
    const [deletedReward] = await db
      .delete(rewards)
      .where(eq(rewards.id, id))
      .returning();
    return deletedReward || undefined;
  }

  async redeemReward(userId: string, rewardId: string): Promise<UserReward> {
    const reward = await this.getReward(rewardId);
    if (!reward) throw new Error("Reward not found");

    // Check if user already has a pending redemption for this reward
    const [existingRedemption] = await db
      .select()
      .from(userRewards)
      .where(
        and(
          eq(userRewards.userId, userId),
          eq(userRewards.rewardId, rewardId),
          eq(userRewards.status, "pending"),
        ),
      );

    if (existingRedemption) {
      throw new Error("You already have a pending redemption for this reward");
    }

    const availablePoints = await this.getUserAvailablePoints(userId);
    if (availablePoints < reward.pointsCost) {
      throw new Error("Insufficient points");
    }

    // Create pending redemption record
    const [userReward] = await db
      .insert(userRewards)
      .values({
        userId,
        rewardId,
        status: "pending",
      })
      .returning();

    // Enviar notificación en tiempo real
    await NotificationHelpers.rewardRedeemed(
      userId,
      reward.name,
      reward.pointsCost
    );

    // Don't deduct points yet - wait for approval
    return userReward;
  }

  async approveRewardRedemption(
    rewardRedemptionId: string,
    adminId: string,
  ): Promise<UserReward | undefined> {
    // Get the reward redemption
    const [redemption] = await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.id, rewardRedemptionId));
    if (!redemption) throw new Error("Redemption not found");

    if (redemption.status !== "pending") {
      throw new Error("Redemption is not pending");
    }

    const reward = await this.getReward(redemption.rewardId);
    if (!reward) throw new Error("Reward not found");

    // Update redemption status
    const [updatedRedemption] = await db
      .update(userRewards)
      .set({
        status: "approved",
        approvedBy: adminId,
        approvedAt: new Date(),
      })
      .where(eq(userRewards.id, rewardRedemptionId))
      .returning();

    // Now deduct points
    await this.addPointsHistory({
      userId: redemption.userId,
      rewardId: redemption.rewardId,
      points: -reward.pointsCost,
      description: `Points redeemed for: ${reward.name}`,
    });

    // Enviar notificación en tiempo real
    await NotificationHelpers.rewardApproved(redemption.userId, reward.name);

    return updatedRedemption || undefined;
  }

  async rejectRewardRedemption(
    rewardRedemptionId: string,
    adminId: string,
    reason?: string,
  ): Promise<UserReward | undefined> {
    // Get the redemption to access reward info
    const [redemption] = await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.id, rewardRedemptionId));
    
    const reward = redemption ? await this.getReward(redemption.rewardId) : null;

    const [updatedRedemption] = await db
      .update(userRewards)
      .set({
        status: "rejected",
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectionReason: reason,
      })
      .where(eq(userRewards.id, rewardRedemptionId))
      .returning();

    // Enviar notificación en tiempo real (puntos no fueron deducidos, así que no hay reembolso)
    if (updatedRedemption && reward) {
      await NotificationHelpers.rewardRejected(
        updatedRedemption.userId,
        reward.name,
        reward.pointsCost
      );
    }

    return updatedRedemption || undefined;
  }

  async getPendingRewardRedemptions(): Promise<
    Array<
      UserReward & {
        userName?: string;
        userFirstName?: string;
        userLastName?: string;
        rewardName?: string;
      }
    >
  > {
    const result = await db
      .select({
        id: userRewards.id,
        userId: userRewards.userId,
        rewardId: userRewards.rewardId,
        status: userRewards.status,
        approvedBy: userRewards.approvedBy,
        approvedAt: userRewards.approvedAt,
        rejectionReason: userRewards.rejectionReason,
        redeemedAt: userRewards.redeemedAt,
        deliveredAt: userRewards.deliveredAt,
        deliveryAddress: userRewards.deliveryAddress,
        userName: users.username,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        rewardName: rewards.name,
      })
      .from(userRewards)
      .leftJoin(users, eq(userRewards.userId, users.id))
      .leftJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .where(eq(userRewards.status, "pending"))
      .orderBy(desc(userRewards.redeemedAt));

    return result as Array<
      UserReward & {
        userName?: string;
        userFirstName?: string;
        userLastName?: string;
        rewardName?: string;
      }
    >;
  }

  async getUserRewards(userId: string): Promise<UserReward[]> {
    return await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.userId, userId))
      .orderBy(desc(userRewards.redeemedAt));
  }

  async getAllRewardRedemptions(): Promise<
    Array<
      UserReward & {
        userName?: string;
        userFirstName?: string;
        userLastName?: string;
        rewardName?: string;
        pointsCost?: number;
      }
    >
  > {
    const result = await db
      .select({
        id: userRewards.id,
        userId: userRewards.userId,
        rewardId: userRewards.rewardId,
        status: userRewards.status,
        shipmentStatus: userRewards.shipmentStatus,
        approvedBy: userRewards.approvedBy,
        approvedAt: userRewards.approvedAt,
        rejectionReason: userRewards.rejectionReason,
        redeemedAt: userRewards.redeemedAt,
        deliveredAt: userRewards.deliveredAt,
        deliveryAddress: userRewards.deliveryAddress,
        shippedAt: userRewards.shippedAt,
        shippedBy: userRewards.shippedBy,
        userName: users.username,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        rewardName: rewards.name,
        pointsCost: rewards.pointsCost,
      })
      .from(userRewards)
      .leftJoin(users, eq(userRewards.userId, users.id))
      .leftJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .orderBy(desc(userRewards.redeemedAt));

    return result as Array<
      UserReward & {
        userName?: string;
        userFirstName?: string;
        userLastName?: string;
        rewardName?: string;
        pointsCost?: number;
      }
    >;
  }

  async getUserRewardsWithDetails(
    userId: string,
  ): Promise<Array<UserReward & { rewardName?: string; pointsCost?: number }>> {
    const result = await db
      .select({
        id: userRewards.id,
        userId: userRewards.userId,
        rewardId: userRewards.rewardId,
        status: userRewards.status,
        shipmentStatus: userRewards.shipmentStatus,
        approvedBy: userRewards.approvedBy,
        approvedAt: userRewards.approvedAt,
        rejectionReason: userRewards.rejectionReason,
        redeemedAt: userRewards.redeemedAt,
        deliveredAt: userRewards.deliveredAt,
        deliveryAddress: userRewards.deliveryAddress,
        shippedAt: userRewards.shippedAt,
        shippedBy: userRewards.shippedBy,
        rewardName: rewards.name,
        pointsCost: rewards.pointsCost,
      })
      .from(userRewards)
      .leftJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .where(eq(userRewards.userId, userId))
      .orderBy(desc(userRewards.redeemedAt));

    return result as Array<
      UserReward & { rewardName?: string; pointsCost?: number }
    >;
  }

  async updateRewardShipmentStatus(
    rewardRedemptionId: string,
    shipmentStatus: "pending" | "shipped" | "delivered",
    adminId: string,
  ): Promise<UserReward | undefined> {
    // Get the current redemption to access reward and user info
    const [currentRedemption] = await db
      .select({
        id: userRewards.id,
        userId: userRewards.userId,
        rewardId: userRewards.rewardId,
        rewardName: rewards.name,
      })
      .from(userRewards)
      .leftJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .where(eq(userRewards.id, rewardRedemptionId));

    if (!currentRedemption) {
      return undefined;
    }

    const updateData: any = {
      shipmentStatus,
      shippedBy: adminId,
    };

    if (shipmentStatus === "shipped") {
      updateData.shippedAt = new Date();
    } else if (shipmentStatus === "delivered") {
      updateData.deliveredAt = new Date();
    }

    const [updatedRedemption] = await db
      .update(userRewards)
      .set(updateData)
      .where(eq(userRewards.id, rewardRedemptionId))
      .returning();

    // Enviar notificación en tiempo real
    if (updatedRedemption && currentRedemption.rewardName) {
      await NotificationHelpers.shipmentUpdated(
        currentRedemption.userId,
        currentRedemption.rewardName,
        shipmentStatus
      );
    }

    return updatedRedemption || undefined;
  }

  async addPointsHistory(entry: InsertPointsHistory): Promise<PointsHistory> {
    const [pointsEntry] = await db
      .insert(pointsHistory)
      .values(entry)
      .returning();
    return pointsEntry;
  }

  async getUserPointsHistory(userId: string): Promise<PointsHistory[]> {
    return await db
      .select()
      .from(pointsHistory)
      .where(eq(pointsHistory.userId, userId))
      .orderBy(desc(pointsHistory.createdAt));
  }

  async getUserTotalPoints(userId: string): Promise<number> {
    const [result] = await db
      .select({ total: sum(pointsHistory.points) })
      .from(pointsHistory)
      .where(eq(pointsHistory.userId, userId));
    return Number(result?.total || 0);
  }

  async getUserAvailablePoints(userId: string): Promise<number> {
    const [result] = await db
      .select({ total: sum(pointsHistory.points) })
      .from(pointsHistory)
      .where(eq(pointsHistory.userId, userId));
    return Math.max(0, Number(result?.total || 0));
  }

  async getTopUsersByPoints(limit = 5): Promise<
    Array<{
      userId: string;
      username: string;
      firstName: string;
      lastName: string;
      totalPoints: number;
    }>
  > {
    const result = await db
      .select({
        userId: pointsHistory.userId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        totalPoints: sum(pointsHistory.points),
      })
      .from(pointsHistory)
      .innerJoin(users, eq(pointsHistory.userId, users.id))
      .groupBy(
        pointsHistory.userId,
        users.username,
        users.firstName,
        users.lastName,
      )
      .having(sql`SUM(${pointsHistory.points}) > 0`)
      .orderBy(desc(sum(pointsHistory.points)))
      .limit(limit);

    return result.map((row) => ({
      userId: row.userId,
      username: row.username || "",
      firstName: row.firstName || "",
      lastName: row.lastName || "",
      totalPoints: Number(row.totalPoints || 0),
    }));
  }

  async getCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    const now = new Date();
    return await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.isActive, true),
          lte(campaigns.startDate, now),
          gte(campaigns.endDate, now),
        ),
      );
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getPendingUsers(): Promise<User[]> {
    // Only show users who completed registration (have username/password) but are not approved yet
    // Users who only have invite token (haven't registered yet) should NOT appear here
    return db
      .select()
      .from(users)
      .where(
        and(
          eq(users.isActive, true), 
          eq(users.isApproved, false),
          isNotNull(users.username) // Only users who completed registration
        )
      )
      .orderBy(desc(users.createdAt));
  }

  async approveUser(
    userId: string,
    approvedBy: string,
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        isApproved: true,
        approvedBy: approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async rejectUser(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async updateUserRole(
    userId: string,
    role: "user" | "admin",
  ): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser || undefined;
  }

  async deleteUser(userId: string): Promise<User | undefined> {
    // First, delete all points history associated with this user
    await db.delete(pointsHistory).where(eq(pointsHistory.userId, userId));

    // Delete all user rewards associated with this user
    await db.delete(userRewards).where(eq(userRewards.userId, userId));

    // Then, delete all deals associated with this user
    await db.delete(deals).where(eq(deals.userId, userId));

    // Finally, delete the user
    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();
    return deletedUser || undefined;
  }

  async getAllDeals(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ deals: DealWithUser[]; total: number }> {
    // Get total count
    const [countResult] = await db.select({ count: count() }).from(deals);
    const totalCount = countResult?.count || 0;

    // Get paginated results
    const offset = (page - 1) * limit;
    const result = await db
      .select({
        id: deals.id,
        userId: deals.userId,
        productType: deals.productType,
        productName: deals.productName,
        dealValue: deals.dealValue,
        quantity: deals.quantity,
        closeDate: deals.closeDate,
        clientInfo: deals.clientInfo,
        licenseAgreementNumber: deals.licenseAgreementNumber,
        status: deals.status,
        pointsEarned: deals.pointsEarned,
        approvedBy: deals.approvedBy,
        approvedAt: deals.approvedAt,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userName: users.username,
      })
      .from(deals)
      .leftJoin(users, eq(deals.userId, users.id))
      .orderBy(desc(deals.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      deals: result as DealWithUser[],
      total: totalCount,
    };
  }

  async getReportsData(filters: {
    country?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    userCount: number;
    dealCount: number;
    totalRevenue: number;
    redeemedRewards: number;
  }> {
    // Apply filters
    const userConditions = [];
    const dealConditions = [];

    if (filters.country) {
      userConditions.push(eq(users.country, filters.country));
    }
    if (filters.startDate) {
      dealConditions.push(gte(deals.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      dealConditions.push(lte(deals.createdAt, filters.endDate));
    }

    // Build queries with conditions
    const userQueryBuilder = db.select({ count: count() }).from(users);
    const dealQueryBuilder = db
      .select({
        count: count(),
        revenue: sum(deals.dealValue),
      })
      .from(deals);

    // Always filter deals by approved status
    dealConditions.unshift(eq(deals.status, "approved"));

    const [userResult] =
      userConditions.length > 0
        ? await userQueryBuilder.where(and(...userConditions))
        : await userQueryBuilder;

    const [dealResult] = await dealQueryBuilder.where(and(...dealConditions));

    const [rewardResult] = await db
      .select({ count: count() })
      .from(pointsHistory)
      .where(isNotNull(pointsHistory.rewardId));

    return {
      userCount: userResult?.count || 0,
      dealCount: dealResult?.count || 0,
      totalRevenue: Number(dealResult?.revenue || 0),
      redeemedRewards: rewardResult?.count || 0,
    };
  }

  async getUserRankingReport(filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<
    Array<{
      userId: string;
      username: string;
      firstName: string;
      lastName: string;
      email: string;
      country: string;
      totalPoints: number;
      totalDeals: number;
      totalSales: number;
    }>
  > {
    const dealConditions = [eq(deals.status, "approved")];
    const pointsConditions = [];

    if (filters.startDate) {
      dealConditions.push(gte(deals.createdAt, filters.startDate));
      pointsConditions.push(gte(pointsHistory.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      dealConditions.push(lte(deals.createdAt, filters.endDate));
      pointsConditions.push(lte(pointsHistory.createdAt, filters.endDate));
    }

    // Get user points in the date range - only sum POSITIVE points (earned points, not redeemed)
    // Add condition to only include earned points (positive values), not spent points (negative values)
    pointsConditions.push(gt(pointsHistory.points, 0));

    const pointsQuery = db
      .select({
        userId: pointsHistory.userId,
        totalPoints: sum(pointsHistory.points).as("totalPoints"),
      })
      .from(pointsHistory)
      .where(pointsConditions.length > 0 ? and(...pointsConditions) : undefined)
      .groupBy(pointsHistory.userId);

    // Get user deals in the date range
    const dealsQuery = db
      .select({
        userId: deals.userId,
        totalDeals: count(deals.id).as("totalDeals"),
        totalSales: sum(deals.dealValue).as("totalSales"),
      })
      .from(deals)
      .where(and(...dealConditions))
      .groupBy(deals.userId);

    // Get all users with their basic info
    const usersResult = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        country: users.country,
      })
      .from(users)
      .where(eq(users.role, "user"));

    const pointsResult = await pointsQuery;
    const dealsResult = await dealsQuery;

    // Combine all data
    const userRanking = usersResult.map((user) => {
      const userPoints = pointsResult.find((p) => p.userId === user.id);
      const userDeals = dealsResult.find((d) => d.userId === user.id);

      return {
        userId: user.id,
        username: user.username || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        country: user.country || "",
        totalPoints: Number(userPoints?.totalPoints || 0),
        totalDeals: Number(userDeals?.totalDeals || 0),
        totalSales: Number(userDeals?.totalSales || 0),
      };
    });

    // Sort by points in descending order
    return userRanking.sort((a, b) => b.totalPoints - a.totalPoints);
  }

  async getRewardRedemptionsReport(filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<
    Array<{
      userName: string;
      userFirstName: string;
      userLastName: string;
      userEmail: string;
      rewardName: string;
      pointsCost: number;
      status: string;
      redeemedAt: Date;
      approvedAt: Date | null;
    }>
  > {
    const conditions = [];

    if (filters.startDate) {
      conditions.push(gte(userRewards.redeemedAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(userRewards.redeemedAt, filters.endDate));
    }

    const result = await db
      .select({
        userName: users.username,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        rewardName: rewards.name,
        pointsCost: rewards.pointsCost,
        status: userRewards.status,
        redeemedAt: userRewards.redeemedAt,
        approvedAt: userRewards.approvedAt,
      })
      .from(userRewards)
      .leftJoin(users, eq(userRewards.userId, users.id))
      .leftJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(userRewards.redeemedAt));

    return result as Array<{
      userName: string;
      userFirstName: string;
      userLastName: string;
      userEmail: string;
      rewardName: string;
      pointsCost: number;
      status: string;
      redeemedAt: Date;
      approvedAt: Date | null;
    }>;
  }

  async getDealsPerUserReport(filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<
    Array<{
      userId: string;
      username: string;
      firstName: string;
      lastName: string;
      email: string;
      country: string;
      totalDeals: number;
      totalSales: number;
      averageDealSize: number;
    }>
  > {
    const dealConditions = [eq(deals.status, "approved")];

    if (filters.startDate) {
      dealConditions.push(gte(deals.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      dealConditions.push(lte(deals.createdAt, filters.endDate));
    }

    // Get user deals in the date range
    const dealsQuery = db
      .select({
        userId: deals.userId,
        totalDeals: count(deals.id).as("totalDeals"),
        totalSales: sum(deals.dealValue).as("totalSales"),
      })
      .from(deals)
      .where(and(...dealConditions))
      .groupBy(deals.userId);

    // Get all users with their basic info
    const usersResult = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        country: users.country,
      })
      .from(users)
      .where(eq(users.role, "user"));

    const dealsResult = await dealsQuery;

    // Combine all data
    const dealsPerUser = usersResult.map((user) => {
      const userDeals = dealsResult.find((d) => d.userId === user.id);
      const totalDeals = Number(userDeals?.totalDeals || 0);
      const totalSales = Number(userDeals?.totalSales || 0);
      const averageDealSize = totalDeals > 0 ? totalSales / totalDeals : 0;

      return {
        userId: user.id,
        username: user.username || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        country: user.country || "",
        totalDeals: totalDeals,
        totalSales: totalSales,
        averageDealSize: Math.round(averageDealSize * 100) / 100, // Round to 2 decimal places
      };
    });

    // Sort by total deals in descending order, then by total sales
    return dealsPerUser.sort((a, b) => {
      if (b.totalDeals !== a.totalDeals) {
        return b.totalDeals - a.totalDeals;
      }
      return b.totalSales - a.totalSales;
    });
  }

  async createNotification(
    notification: InsertNotification,
  ): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    return userNotifications;
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const [updatedNotification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updatedNotification || undefined;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async createSupportTicket(
    ticket: InsertSupportTicket,
  ): Promise<SupportTicket> {
    const [newTicket] = await db
      .insert(supportTickets)
      .values(ticket)
      .returning();
    return newTicket;
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, id));
    return ticket || undefined;
  }

  async getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
    const tickets = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
    return tickets;
  }

  async getAllSupportTickets(): Promise<SupportTicketWithUser[]> {
    const tickets = await db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        subject: supportTickets.subject,
        message: supportTickets.message,
        status: supportTickets.status,
        priority: supportTickets.priority,
        assignedTo: supportTickets.assignedTo,
        adminResponse: supportTickets.adminResponse,
        respondedAt: supportTickets.respondedAt,
        respondedBy: supportTickets.respondedBy,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userName: users.username,
        userEmail: users.email,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .orderBy(desc(supportTickets.createdAt));

    return tickets as SupportTicketWithUser[];
  }

  async updateSupportTicket(
    id: string,
    updates: UpdateSupportTicket,
  ): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .update(supportTickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return ticket || undefined;
  }

  async getPointsConfig(): Promise<PointsConfig | undefined> {
    const [config] = await db.select().from(pointsConfig).limit(1);
    return config || undefined;
  }

  async updatePointsConfig(
    updates: UpdatePointsConfig,
    updatedBy: string,
  ): Promise<PointsConfig | undefined> {
    const existingConfig = await this.getPointsConfig();

    if (!existingConfig) {
      const [newConfig] = await db
        .insert(pointsConfig)
        .values({
          ...updates,
          updatedBy,
          updatedAt: new Date(),
        })
        .returning();
      return newConfig;
    }

    const [config] = await db
      .update(pointsConfig)
      .set({ ...updates, updatedBy, updatedAt: new Date() })
      .where(eq(pointsConfig.id, existingConfig.id))
      .returning();
    return config || undefined;
  }
}

export const storage = new DatabaseStorage();
