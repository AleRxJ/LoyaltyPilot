import { 
  users, deals, rewards, userRewards, pointsHistory, campaigns,
  type User, type InsertUser, type Deal, type InsertDeal, 
  type Reward, type InsertReward, type UserReward, type InsertUserReward,
  type PointsHistory, type InsertPointsHistory, type Campaign, type InsertCampaign,
  type DealWithUser
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sum, count } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
  getPendingDeals(): Promise<Deal[]>;
  approveDeal(id: string, approvedBy: string): Promise<Deal | undefined>;
  rejectDeal(id: string): Promise<Deal | undefined>;
  getRecentDeals(userId: string, limit?: number): Promise<Deal[]>;

  // Reward methods
  getRewards(): Promise<Reward[]>;
  getReward(id: string): Promise<Reward | undefined>;
  createReward(reward: InsertReward): Promise<Reward>;
  updateReward(id: string, updates: Partial<Reward>): Promise<Reward | undefined>;
  redeemReward(userId: string, rewardId: string): Promise<UserReward>;
  getUserRewards(userId: string): Promise<UserReward[]>;

  // Points methods
  addPointsHistory(entry: InsertPointsHistory): Promise<PointsHistory>;
  getUserPointsHistory(userId: string): Promise<PointsHistory[]>;
  getUserTotalPoints(userId: string): Promise<number>;
  getUserAvailablePoints(userId: string): Promise<number>;

  // Campaign methods
  getCampaigns(): Promise<Campaign[]>;
  getActiveCampaigns(): Promise<Campaign[]>;

  // Admin methods
  getAllUsers(): Promise<User[]>;
  getAllDeals(): Promise<DealWithUser[]>;
  getReportsData(filters: {
    country?: string;
    partnerLevel?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    userCount: number;
    dealCount: number;
    totalRevenue: number;
    redeemedRewards: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
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
      .from(userRewards)
      .where(eq(userRewards.userId, userId));

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
    return await db.select().from(deals)
      .where(eq(deals.userId, userId))
      .orderBy(desc(deals.createdAt));
  }

  async getPendingDeals(): Promise<Deal[]> {
    return await db.select().from(deals)
      .where(eq(deals.status, "pending"))
      .orderBy(desc(deals.createdAt));
  }

  async approveDeal(id: string, approvedBy: string): Promise<Deal | undefined> {
    const deal = await this.getDeal(id);
    if (!deal) return undefined;

    // Calculate points (simple formula: 1 point per $10)
    const pointsEarned = Math.floor(Number(deal.dealValue) / 10);

    const [updatedDeal] = await db.update(deals)
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
    }

    return updatedDeal || undefined;
  }

  async rejectDeal(id: string): Promise<Deal | undefined> {
    const [updatedDeal] = await db.update(deals)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    return updatedDeal || undefined;
  }

  async getRecentDeals(userId: string, limit = 10): Promise<Deal[]> {
    return await db.select().from(deals)
      .where(eq(deals.userId, userId))
      .orderBy(desc(deals.createdAt))
      .limit(limit);
  }

  async getRewards(): Promise<Reward[]> {
    return await db.select().from(rewards)
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

  async updateReward(id: string, updates: Partial<Reward>): Promise<Reward | undefined> {
    const [updatedReward] = await db.update(rewards)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rewards.id, id))
      .returning();
    return updatedReward || undefined;
  }

  async redeemReward(userId: string, rewardId: string): Promise<UserReward> {
    const reward = await this.getReward(rewardId);
    if (!reward) throw new Error("Reward not found");

    const availablePoints = await this.getUserAvailablePoints(userId);
    if (availablePoints < reward.pointsCost) {
      throw new Error("Insufficient points");
    }

    // Create redemption record
    const [userReward] = await db.insert(userRewards).values({
      userId,
      rewardId,
      status: "redeemed",
    }).returning();

    // Deduct points
    await this.addPointsHistory({
      userId,
      rewardId,
      points: -reward.pointsCost,
      description: `Points redeemed for: ${reward.name}`,
    });

    return userReward;
  }

  async getUserRewards(userId: string): Promise<UserReward[]> {
    return await db.select().from(userRewards)
      .where(eq(userRewards.userId, userId))
      .orderBy(desc(userRewards.redeemedAt));
  }

  async addPointsHistory(entry: InsertPointsHistory): Promise<PointsHistory> {
    const [pointsEntry] = await db.insert(pointsHistory).values(entry).returning();
    return pointsEntry;
  }

  async getUserPointsHistory(userId: string): Promise<PointsHistory[]> {
    return await db.select().from(pointsHistory)
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

  async getCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    const now = new Date();
    return await db.select().from(campaigns)
      .where(and(
        eq(campaigns.isActive, true),
        lte(campaigns.startDate, now),
        gte(campaigns.endDate, now)
      ));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, role: "user" | "admin", partnerLevel: "bronze" | "silver" | "gold" | "platinum"): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({ 
        role, 
        partnerLevel,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser || undefined;
  }

  async getAllDeals(): Promise<DealWithUser[]> {
    const result = await db.select({
      ...deals,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userName: users.username
    })
    .from(deals)
    .leftJoin(users, eq(deals.userId, users.id))
    .orderBy(desc(deals.createdAt));

    return result as DealWithUser[];
  }

  async getReportsData(filters: {
    country?: string;
    partnerLevel?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    userCount: number;
    dealCount: number;
    totalRevenue: number;
    redeemedRewards: number;
  }> {
    let userQuery = db.select({ count: count() }).from(users);
    let dealQuery = db.select({ 
      count: count(), 
      revenue: sum(deals.dealValue) 
    }).from(deals);

    // Apply filters
    const userConditions = [];
    const dealConditions = [];
    
    if (filters.country) {
      userConditions.push(eq(users.country, filters.country));
    }
    if (filters.partnerLevel) {
      userConditions.push(eq(users.partnerLevel, filters.partnerLevel as any));
    }
    if (filters.startDate) {
      dealConditions.push(gte(deals.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      dealConditions.push(lte(deals.createdAt, filters.endDate));
    }
    
    if (userConditions.length > 0) {
      userQuery = userQuery.where(and(...userConditions));
    }
    if (dealConditions.length > 0) {
      dealQuery = dealQuery.where(and(...dealConditions));
    }

    const [userResult] = await userQuery;
    const [dealResult] = await dealQuery;
    const [rewardResult] = await db.select({ count: count() }).from(userRewards);

    return {
      userCount: userResult?.count || 0,
      dealCount: dealResult?.count || 0,
      totalRevenue: Number(dealResult?.revenue || 0),
      redeemedRewards: rewardResult?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
