import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { insertUserSchema, updateUserSchema, insertDealSchema, insertRewardSchema, insertSupportTicketSchema, updateSupportTicketSchema, updatePointsConfigSchema } from "@shared/schema";
import { z } from "zod";
import * as XLSX from 'xlsx';
import { NotificationHelpers } from "./notifications";
import { nanoid } from "nanoid";
import { 
  sendInviteEmail, 
  sendApprovalEmail, 
  sendDealApprovedEmail, 
  sendRedemptionApprovedEmail,
  sendRedemptionRequestToAdmin,
  sendSupportTicketToAdmin
} from "./email.js";

// Extend session data interface
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      let user = await storage.getUserByUsername(username);
      
      // If not found by username, try by email (for flexibility)
      if (!user) {
        user = await storage.getUserByEmail(username);
      }
      
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account inactive" });
      }

      if (!user.isApproved) {
        return res.status(401).json({ message: "Account pending approval. Please wait for administrator approval." });
      }

      // Store user in session
      if (req.session) {
        req.session.userId = user.id;
        req.session.userRole = user.role;
      }

      res.json({ 
        id: user.id, 
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        country: user.country
      });
    } catch (error) {
      console.error("Login error:", error);
      console.error("Request body:", req.body);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        isApproved: false, // New users need approval
      });

      res.status(201).json({ 
        id: user.id, 
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        message: "Registration successful. Please wait for administrator approval before you can log in."
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Could not log out" });
        }
        res.json({ message: "Logged out" });
      });
    } else {
      res.json({ message: "Logged out" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      country: user.country
    });
  });

  // Update user profile (self-service)
  app.patch("/api/user/profile", async (req, res) => {
    console.log("🔵 PATCH /api/user/profile called");
    console.log("📦 Body:", req.body);
    console.log("👤 Session userId:", req.session?.userId);
    
    const userId = req.session?.userId;
    if (!userId) {
      console.log("❌ Not authenticated");
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { firstName, lastName, email, country, currentPassword, newPassword } = req.body;
      
      // Validar que al menos un campo esté presente
      if (!firstName && !lastName && !email && !country && !newPassword) {
        return res.status(400).json({ 
          message: "At least one field must be provided to update" 
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Preparar datos para actualizar
      const updates: any = {};

      if (firstName) updates.firstName = firstName;
      if (lastName) updates.lastName = lastName;
      if (country) updates.country = country;

      // Validar y actualizar email si cambió
      if (email && email !== user.email) {
        // Verificar que el nuevo email no esté en uso
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ 
            message: "Email already in use by another account" 
          });
        }
        updates.email = email;
      }

      // Cambio de contraseña
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ 
            message: "Current password is required to change password" 
          });
        }

        // Verificar contraseña actual
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ 
            message: "Current password is incorrect" 
          });
        }

        // Validar longitud de nueva contraseña
        if (newPassword.length < 6) {
          return res.status(400).json({ 
            message: "New password must be at least 6 characters" 
          });
        }

        updates.password = await bcrypt.hash(newPassword, 10);
      }

      // Actualizar timestamp
      updates.updatedAt = new Date();

      // Actualizar usuario
      const updatedUser = await storage.updateUser(userId, updates);

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update profile" });
      }

      res.json({ 
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          country: updatedUser.country
        }
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // User routes
  app.get("/api/users/stats", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user stats" });
    }
  });

  app.get("/api/users/leaderboard", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const topUsers = await storage.getTopUsersByPoints(limit);
      res.json(topUsers);
    } catch (error) {
      console.error("Failed to get leaderboard:", error);
      res.status(500).json({ message: "Failed to get leaderboard" });
    }
  });

  // Deal routes
  app.post("/api/deals", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const dealData = insertDealSchema.parse({ ...req.body, userId });
      const deal = await storage.createDeal(dealData);
      res.status(201).json(deal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create deal" });
    }
  });

  app.get("/api/deals", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const deals = await storage.getUserDeals(userId);
      res.json(deals);
    } catch (error) {
      res.status(500).json({ message: "Failed to get deals" });
    }
  });

  app.get("/api/deals/recent", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const deals = await storage.getRecentDeals(userId, limit);
      res.json(deals);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recent deals" });
    }
  });

  app.post("/api/deals/:id/approve", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const deal = await storage.approveDeal(req.params.id, userId!);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Obtener información del usuario para enviar email
      const dealUser = await storage.getUser(deal.userId);
      if (dealUser && deal.pointsEarned && deal.pointsEarned > 0) {
        await sendDealApprovedEmail(
          dealUser.email,
          dealUser.firstName,
          dealUser.lastName,
          {
            productName: deal.productName,
            dealValue: deal.dealValue,
            pointsEarned: deal.pointsEarned
          }
        );
      }
      
      res.json(deal);
    } catch (error) {
      console.error("Error approving deal:", error);
      res.status(500).json({ message: "Failed to approve deal" });
    }
  });

  app.post("/api/deals/:id/reject", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const deal = await storage.rejectDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      res.json(deal);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject deal" });
    }
  });

  app.patch("/api/admin/deals/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { updateDealSchema } = await import("@shared/schema");
      const updates = updateDealSchema.parse(req.body);
      const deal = await storage.updateDeal(req.params.id, updates);
      
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      res.json(deal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update deal" });
    }
  });

  // Reward routes
  app.get("/api/rewards", async (req, res) => {
    try {
      const rewards = await storage.getRewards();
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ message: "Failed to get rewards" });
    }
  });

  // Admin reward creation endpoint
  app.post("/api/admin/rewards", async (req, res) => {
    console.log("POST /api/admin/rewards - Session:", req.session);
    console.log("POST /api/admin/rewards - Body:", req.body);
    
    const userRole = req.session?.userRole;
    console.log("User role:", userRole);
    
    if (userRole !== "admin") {
      console.log("Access denied - not admin");
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const rewardData = insertRewardSchema.parse(req.body);
      console.log("Parsed reward data:", rewardData);
      
      const newReward = await storage.createReward(rewardData);
      console.log("Created reward:", newReward);
      
      res.status(201).json(newReward);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("Validation error:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Create reward error:", error);
      res.status(500).json({ message: "Failed to create reward" });
    }
  });

  // Admin reward update endpoint
  app.patch("/api/admin/rewards/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedReward = await storage.updateReward(id, updates);
      if (!updatedReward) {
        return res.status(404).json({ message: "Reward not found" });
      }
      
      res.json(updatedReward);
    } catch (error) {
      console.error("Update reward error:", error);
      res.status(500).json({ message: "Failed to update reward" });
    }
  });

  // Admin reward delete endpoint
  app.delete("/api/admin/rewards/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      
      const deletedReward = await storage.deleteReward(id);
      if (!deletedReward) {
        return res.status(404).json({ message: "Reward not found" });
      }
      
      res.json({ message: "Reward deleted successfully", reward: deletedReward });
    } catch (error) {
      console.error("Delete reward error:", error);
      res.status(500).json({ message: "Failed to delete reward" });
    }
  });

  // Admin get all rewards endpoint
  app.get("/api/admin/rewards", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const rewards = await storage.getRewards();
      res.json(rewards);
    } catch (error) {
      console.error("Get admin rewards error:", error);
      res.status(500).json({ message: "Failed to get rewards" });
    }
  });

  // Admin endpoints for reward approval - MUST BE BEFORE /:id route
  app.get("/api/admin/rewards/pending", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const pendingRedemptions = await storage.getPendingRewardRedemptions();
      res.json(pendingRedemptions);
    } catch (error) {
      console.error("Get pending redemptions error:", error);
      res.status(500).json({ message: "Failed to get pending redemptions" });
    }
  });

  // Admin endpoint to get all reward redemptions - MUST BE BEFORE /:id route
  app.get("/api/admin/rewards/redemptions", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const allRedemptions = await storage.getAllRewardRedemptions();
      res.json(allRedemptions);
    } catch (error) {
      console.error("Get all redemptions error:", error);
      res.status(500).json({ message: "Failed to get all redemptions" });
    }
  });

  // Admin get single reward endpoint - MUST BE AFTER specific routes
  app.get("/api/admin/rewards/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const reward = await storage.getReward(id);
      if (!reward) {
        return res.status(404).json({ message: "Reward not found" });
      }
      res.json(reward);
    } catch (error) {
      console.error("Get admin reward error:", error);
      res.status(500).json({ message: "Failed to get reward" });
    }
  });

  app.post("/api/rewards/:id/redeem", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userReward = await storage.redeemReward(userId, req.params.id);
      
      // Obtener información del usuario y recompensa para notificar al admin
      const user = await storage.getUser(userId);
      const reward = await storage.getReward(req.params.id);
      
      if (user && reward) {
        // Obtener email del primer admin para enviar notificación
        const allUsers = await storage.getAllUsers();
        const admins = allUsers.filter(u => u.role === 'admin');
        if (admins && admins.length > 0) {
          await sendRedemptionRequestToAdmin(
            admins[0].email,
            {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email
            },
            {
              rewardName: reward.name,
              pointsCost: reward.pointsCost,
              redemptionId: userReward.id
            }
          );
        }
      }
      
      res.json(userReward);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to redeem reward" });
      }
    }
  });

  app.get("/api/user-rewards", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userRewards = await storage.getUserRewardsWithDetails(userId);
      res.json(userRewards);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user rewards" });
    }
  });


  app.post("/api/admin/rewards/:redemptionId/approve", async (req, res) => {
    const userRole = req.session?.userRole;
    const adminId = req.session?.userId;
    
    if (userRole !== "admin" || !adminId) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { redemptionId } = req.params;
      const updatedRedemption = await storage.approveRewardRedemption(redemptionId, adminId);
      
      if (!updatedRedemption) {
        return res.status(404).json({ message: "Redemption not found" });
      }
      
      // Obtener información del usuario y recompensa para enviar email
      const user = await storage.getUser(updatedRedemption.userId);
      const reward = await storage.getReward(updatedRedemption.rewardId);
      
      if (user && reward) {
        await sendRedemptionApprovedEmail(
          user.email,
          user.firstName,
          user.lastName,
          {
            rewardName: reward.name,
            pointsCost: reward.pointsCost,
            status: updatedRedemption.status
          }
        );
      }
      
      res.json(updatedRedemption);
    } catch (error) {
      console.error("Approve redemption error:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to approve redemption" });
      }
    }
  });

  app.post("/api/admin/rewards/:redemptionId/reject", async (req, res) => {
    const userRole = req.session?.userRole;
    const adminId = req.session?.userId;
    
    if (userRole !== "admin" || !adminId) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { redemptionId } = req.params;
      const { reason } = req.body;
      
      const updatedRedemption = await storage.rejectRewardRedemption(redemptionId, adminId, reason);
      
      if (!updatedRedemption) {
        return res.status(404).json({ message: "Redemption not found" });
      }
      
      res.json(updatedRedemption);
    } catch (error) {
      console.error("Reject redemption error:", error);
      res.status(500).json({ message: "Failed to reject redemption" });
    }
  });


  // Admin endpoint to update reward shipment status
  app.put("/api/admin/rewards/:redemptionId/shipment", async (req, res) => {
    const userRole = req.session?.userRole;
    const adminId = req.session?.userId;
    
    if (userRole !== "admin" || !adminId) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { redemptionId } = req.params;
      const { shipmentStatus } = req.body;

      // Validate shipment status
      if (!["pending", "shipped", "delivered"].includes(shipmentStatus)) {
        return res.status(400).json({ message: "Invalid shipment status" });
      }

      const updatedRedemption = await storage.updateRewardShipmentStatus(redemptionId, shipmentStatus, adminId);
      
      if (updatedRedemption) {
        res.json({ 
          message: `Reward shipment status updated to ${shipmentStatus}`,
          shipmentStatus: updatedRedemption.shipmentStatus
        });
      } else {
        res.status(404).json({ message: "Redemption not found" });
      }
    } catch (error) {
      console.error("Update shipment status error:", error);
      res.status(500).json({ message: "Failed to update shipment status" });
    }
  });

  // Points routes
  app.get("/api/points/history", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const history = await storage.getUserPointsHistory(userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to get points history" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Admin create user endpoint
  app.post("/api/admin/users", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      res.status(201).json({ 
        id: user.id, 
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        country: user.country,
        isActive: user.isActive,
        createdAt: user.createdAt
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Admin user creation error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/admin/users/:userId/role", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }

      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(userId, role as "user" | "admin");
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Update user information endpoint
  app.patch("/api/admin/users/:userId", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { userId } = req.params;
      const updateData = updateUserSchema.parse(req.body);

      // Check if username or email already exists (excluding current user)
      if (updateData.username) {
        const existingUserByUsername = await storage.getUserByUsername(updateData.username);
        if (existingUserByUsername && existingUserByUsername.id !== userId) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      if (updateData.email) {
        const existingUserByEmail = await storage.getUserByEmail(updateData.email);
        if (existingUserByEmail && existingUserByEmail.id !== userId) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user endpoint
  app.delete("/api/admin/users/:userId", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { userId } = req.params;
      const currentUserId = req.session?.userId;

      // Prevent admin from deleting themselves
      if (userId === currentUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const deletedUser = await storage.deleteUser(userId);
      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully", userId });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // User Invitation Endpoints
  // Invite single user
  app.post("/api/admin/users/invite", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { email, firstName, lastName, country } = req.body;
      
      if (!email || !firstName || !lastName || !country) {
        return res.status(400).json({ 
          message: "Email, first name, last name, and country are required" 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "A user with this email already exists" 
        });
      }

      // Generate invite token
      const inviteToken = nanoid(32);

      // Create a temporary username (will be set during registration)
      const tempUsername = `user_${nanoid(8)}`;
      
      // Create user with pending status
      const hashedPassword = await bcrypt.hash(nanoid(16), 10); // temporary password
      
      const newUser = await storage.createUser({
        username: tempUsername,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        country,
        role: "user",
        isActive: true,
        isApproved: false,
        inviteToken,
      });

      // Get admin info for email
      const adminUser = await storage.getUser(userId!);
      const adminName = adminUser 
        ? `${adminUser.firstName} ${adminUser.lastName}` 
        : "Administrator";

      // Send invite email
      const emailSent = await sendInviteEmail({
        email,
        firstName,
        lastName,
        inviteToken,
        invitedBy: adminName,
      });

      if (!emailSent) {
        console.warn("Failed to send invite email, but user was created");
      }

      res.status(201).json({ 
        message: "Invitation sent successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          inviteToken: newUser.inviteToken,
        }
      });
    } catch (error) {
      console.error("Invite user error:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  // Invite multiple users via CSV
  app.post("/api/admin/users/invite-bulk", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { users } = req.body;
      
      if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ 
          message: "Users array is required and must not be empty" 
        });
      }

      // Get admin info for emails
      const adminUser = await storage.getUser(userId!);
      const adminName = adminUser 
        ? `${adminUser.firstName} ${adminUser.lastName}` 
        : "Administrator";

      const results = {
        success: [] as any[],
        failed: [] as any[],
      };

      for (const userData of users) {
        try {
          const { email, firstName, lastName, country } = userData;
          
          if (!email || !firstName || !lastName || !country) {
            results.failed.push({
              email: email || 'unknown',
              reason: 'Missing required fields',
            });
            continue;
          }

          // Check if user already exists
          const existingUser = await storage.getUserByEmail(email);
          if (existingUser) {
            results.failed.push({
              email,
              reason: 'User already exists',
            });
            continue;
          }

          // Generate invite token
          const inviteToken = nanoid(32);
          const tempUsername = `user_${nanoid(8)}`;
          const hashedPassword = await bcrypt.hash(nanoid(16), 10);
          
          // Create user
          const newUser = await storage.createUser({
            username: tempUsername,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            country,
            role: "user",
            isActive: true,
            isApproved: false,
            inviteToken,
          });

          // Send invite email
          const emailSent = await sendInviteEmail({
            email,
            firstName,
            lastName,
            inviteToken,
            invitedBy: adminName,
          });

          results.success.push({
            email,
            firstName,
            lastName,
            emailSent,
          });
        } catch (error) {
          results.failed.push({
            email: userData.email || 'unknown',
            reason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.json({
        message: `Processed ${users.length} invitations`,
        summary: {
          total: users.length,
          successful: results.success.length,
          failed: results.failed.length,
        },
        results,
      });
    } catch (error) {
      console.error("Bulk invite error:", error);
      res.status(500).json({ message: "Failed to process bulk invitations" });
    }
  });

  // Complete registration with invite token
  app.post("/api/auth/register-with-token", async (req, res) => {
    try {
      const { inviteToken, username, password, region, category, subcategory } = req.body;
      
      if (!inviteToken || !username || !password || !region || !category) {
        return res.status(400).json({ 
          message: "Invite token, username, password, region, and category are required" 
        });
      }

      // Find user by invite token
      const user = await storage.getUserByInviteToken(inviteToken);
      
      if (!user) {
        return res.status(404).json({ 
          message: "Invalid or expired invitation" 
        });
      }

      if (user.isApproved) {
        return res.status(400).json({ 
          message: "This invitation has already been used" 
        });
      }

      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ 
          message: "Username already exists" 
        });
      }

      // Update user with new credentials and auto-approve (invited users are pre-approved)
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const updatedUser = await storage.updateUser(user.id, {
        username,
        password: hashedPassword,
        region: region as "NOLA" | "SOLA" | "BRASIL" | "MEXICO",
        regionCategory: category as "ENTERPRISE" | "SMB" | "MSSP",
        regionSubcategory: subcategory || null,
        isApproved: true, // Auto-approve invited users
        approvedAt: new Date(),
        approvedBy: 'system', // System approval for invited users
        inviteToken: null, // Clear the token after use
      });

      // Send approval email (account is ready to use)
      await sendApprovalEmail(user.email, user.firstName, user.lastName);

      res.status(200).json({ 
        message: "Registration completed successfully. You can now log in!",
        user: {
          id: updatedUser!.id,
          username: updatedUser!.username,
          email: updatedUser!.email,
          firstName: updatedUser!.firstName,
          lastName: updatedUser!.lastName,
          region: updatedUser!.region,
          category: updatedUser!.regionCategory,
          subcategory: updatedUser!.regionSubcategory,
        }
      });
    } catch (error) {
      console.error("Register with token error:", error);
      res.status(500).json({ message: "Failed to complete registration" });
    }
  });

  // Verify invite token (for checking if valid before showing form)
  app.get("/api/auth/verify-invite/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const user = await storage.getUserByInviteToken(token);
      
      if (!user) {
        return res.status(404).json({ 
          valid: false,
          message: "Invalid or expired invitation" 
        });
      }

      if (user.isApproved) {
        return res.status(400).json({ 
          valid: false,
          message: "This invitation has already been used" 
        });
      }

      res.json({ 
        valid: true,
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          country: user.country,
        }
      });
    } catch (error) {
      console.error("Verify invite token error:", error);
      res.status(500).json({ 
        valid: false,
        message: "Failed to verify invitation" 
      });
    }
  });

  // Passwordless login with invite token (one-time use)
  app.get("/api/auth/passwordless-login/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      console.log("🔐 Passwordless login attempt with token:", token);

      // Find user by invite token
      const user = await storage.getUserByInviteToken(token);
      
      if (!user) {
        console.log("❌ Invalid token");
        return res.status(404).json({ 
          success: false,
          message: "Invalid or expired invitation link" 
        });
      }

      // Check if already used (already approved means token was used)
      if (user.isApproved && !user.inviteToken) {
        console.log("❌ Token already used");
        return res.status(400).json({ 
          success: false,
          message: "This invitation link has already been used" 
        });
      }

      // Generate automatic username if not exists
      let username = user.username;
      if (!username || username.startsWith('user_')) {
        // Generate username from email
        const emailPrefix = user.email.split('@')[0];
        const randomSuffix = nanoid(4);
        username = `${emailPrefix}_${randomSuffix}`;
        
        // Ensure username is unique
        let existingUser = await storage.getUserByUsername(username);
        while (existingUser) {
          username = `${emailPrefix}_${nanoid(6)}`;
          existingUser = await storage.getUserByUsername(username);
        }
      }

      // Generate automatic password (user won't see it)
      const autoPassword = nanoid(32); // Strong random password
      const hashedPassword = await bcrypt.hash(autoPassword, 10);

      // Update user: set username, password, approve, and clear invite token
      const updatedUser = await storage.updateUser(user.id, {
        username,
        password: hashedPassword,
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: 'passwordless',
        inviteToken: null, // Clear token (one-time use)
      });

      if (!updatedUser) {
        console.log("❌ Failed to update user");
        return res.status(500).json({ 
          success: false,
          message: "Failed to activate account" 
        });
      }

      // Create session (auto-login)
      if (req.session) {
        req.session.userId = updatedUser.id;
        req.session.userRole = updatedUser.role;
      }

      // Send activation email
      await sendApprovalEmail(user.email, user.firstName, user.lastName);

      console.log("✅ Passwordless login successful for:", updatedUser.email);

      res.json({ 
        success: true,
        message: "Welcome! Your account has been activated.",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          country: updatedUser.country,
        }
      });
    } catch (error) {
      console.error("❌ Passwordless login error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to process login" 
      });
    }
  });

  app.get("/api/admin/deals", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await storage.getAllDeals(page, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get all deals" });
    }
  });

  app.get("/api/admin/deals/pending", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const deals = await storage.getPendingDeals();
      res.json(deals);
    } catch (error) {
      res.status(500).json({ message: "Failed to get pending deals" });
    }
  });

  app.get("/api/admin/reports", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const filters = {
        country: req.query.country === "all" ? undefined : req.query.country as string,
        partnerLevel: req.query.partnerLevel === "all" ? undefined : req.query.partnerLevel as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const data = await storage.getReportsData(filters);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to get reports data" });
    }
  });

  app.get("/api/admin/reports/user-ranking", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const data = await storage.getUserRankingReport(filters);
      res.json(data);
    } catch (error) {
      console.error("Error getting user ranking report:", error);
      res.status(500).json({ message: "Failed to get user ranking report" });
    }
  });

  app.get("/api/admin/reports/user-ranking/export", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      // Using statically imported XLSX
      
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const data = await storage.getUserRankingReport(filters);
      
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const excelData = data.map((user, index) => ({
        'Ranking': index + 1,
        'Username': user.username,
        'Name': `${user.firstName} ${user.lastName}`.trim(),
        'Email': user.email,
        'Country': user.country,
        'Total Points': user.totalPoints,
        'Total Deals': user.totalDeals,
        'Total Sales ($)': user.totalSales.toFixed(2)
      }));
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-size columns
      const columnWidths = [
        { wch: 10 }, // Ranking
        { wch: 15 }, // Username
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 15 }, // Country
        { wch: 15 }, // Total Points
        { wch: 15 }, // Total Deals
        { wch: 20 }  // Total Sales
      ];
      worksheet['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      const sheetName = `User Ranking ${new Date().toISOString().split('T')[0]}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true 
      });
      
      // Set response headers for file download
      const filename = `user-ranking-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      
      // Send the file
      res.send(excelBuffer);
      
    } catch (error) {
      console.error("Error generating Excel report:", error);
      res.status(500).json({ message: "Failed to generate Excel report" });
    }
  });

  app.get("/api/admin/reports/reward-redemptions", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const data = await storage.getRewardRedemptionsReport(filters);
      res.json(data);
    } catch (error) {
      console.error("Error getting reward redemptions report:", error);
      res.status(500).json({ message: "Failed to get reward redemptions report" });
    }
  });

  app.get("/api/admin/reports/reward-redemptions/export", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const data = await storage.getRewardRedemptionsReport(filters);
      
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const excelData = data.map((redemption, index) => ({
        'No.': index + 1,
        'Username': redemption.userName || 'N/A',
        'Name': `${redemption.userFirstName || ''} ${redemption.userLastName || ''}`.trim() || 'N/A',
        'Email': redemption.userEmail || 'N/A',
        'Reward': redemption.rewardName || 'N/A',
        'Points Cost': redemption.pointsCost || 0,
        'Status': redemption.status || 'N/A',
        'Redeemed Date': redemption.redeemedAt ? new Date(redemption.redeemedAt).toLocaleDateString() : 'N/A',
        'Approved Date': redemption.approvedAt ? new Date(redemption.approvedAt).toLocaleDateString() : 'N/A'
      }));
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-size columns
      const columnWidths = [
        { wch: 8 },  // No.
        { wch: 15 }, // Username
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 30 }, // Reward
        { wch: 12 }, // Points Cost
        { wch: 12 }, // Status
        { wch: 15 }, // Redeemed Date
        { wch: 15 }  // Approved Date
      ];
      worksheet['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      const sheetName = `Reward Redemptions ${new Date().toISOString().split('T')[0]}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true 
      });
      
      // Set response headers for file download
      const filename = `reward-redemptions-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      
      // Send the file
      res.send(excelBuffer);
      
    } catch (error) {
      console.error("Error generating reward redemptions Excel report:", error);
      res.status(500).json({ message: "Failed to generate reward redemptions Excel report" });
    }
  });

  // CSV upload routes
  app.post("/api/admin/csv/upload-url", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Users CSV upload URL endpoint
  app.post("/api/admin/csv/users/upload-url", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting users CSV upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Calculate points based on product type and deal value
  function calculatePointsForDeal(productType: string, dealValue: number): number {
    const value = Number(dealValue);
    if (isNaN(value) || value <= 0) return 0;

    switch (productType) {
      case "software":
        return Math.floor(value / 1000); // 1 point per $1000
      case "hardware":
        return Math.floor(value / 5000); // 1 point per $5000
      case "equipment":
        return Math.floor(value / 10000); // 1 point per $10000
      default:
        return 0;
    }
  }

  app.post("/api/admin/csv/process", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { csvPath } = req.body;
      if (!csvPath) {
        return res.status(400).json({ message: "CSV path is required" });
      }

      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      
      // Download and parse CSV content
      const objectPath = objectStorageService.normalizeObjectEntityPath(csvPath);
      const csvContent = await objectStorageService.downloadCSVContent(objectPath);
      
      // Parse CSV content
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV file must have at least a header and one data row" });
      }

      const header = lines[0].toLowerCase().split(',').map(h => h.trim());
      const expectedHeaders = ['usuario', 'valor', 'status', 'tipo'];
      const optionalHeaders = ['acuerdo']; // License Agreement Number column
      
      // Validate required headers
      const hasAllHeaders = expectedHeaders.every(h => header.includes(h));
      if (!hasAllHeaders) {
        return res.status(400).json({ 
          message: `CSV must have columns: ${expectedHeaders.join(', ')}. Optional columns: ${optionalHeaders.join(', ')}. Found: ${header.join(', ')}` 
        });
      }

      const userIndex = header.indexOf('usuario');
      const valueIndex = header.indexOf('valor');
      const statusIndex = header.indexOf('status');
      const typeIndex = header.indexOf('tipo');
      const licenseIndex = header.indexOf('acuerdo'); // Optional

      const dealsToInsert = [];
      const errors = [];

      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        
        if (row.length !== header.length) {
          errors.push(`Row ${i + 1}: Column count mismatch`);
          continue;
        }

        const username = row[userIndex];
        const value = row[valueIndex];
        const status = row[statusIndex].toLowerCase();
        const type = row[typeIndex].toLowerCase();
        const licenseAgreementNumber = licenseIndex >= 0 ? row[licenseIndex] || '' : '';

        // Validate data
        if (!username) {
          errors.push(`Row ${i + 1}: Usuario is required`);
          continue;
        }

        if (!value || isNaN(parseFloat(value))) {
          errors.push(`Row ${i + 1}: Valor must be a valid number`);
          continue;
        }

        if (!['pending', 'approved', 'rejected'].includes(status)) {
          errors.push(`Row ${i + 1}: Status must be pending, approved, or rejected`);
          continue;
        }

        if (!['software', 'hardware', 'equipment'].includes(type)) {
          errors.push(`Row ${i + 1}: Tipo must be software, hardware, or equipment`);
          continue;
        }

        // Find user by username
        const user = await storage.getUserByUsername(username);
        if (!user) {
          errors.push(`Row ${i + 1}: User '${username}' not found`);
          continue;
        }

        dealsToInsert.push({
          userId: user.id,
          productType: type as "software" | "hardware" | "equipment",
          productName: `Imported Deal - ${type}`,
          dealValue: value, // Keep as string
          quantity: 1,
          closeDate: new Date(),
          clientInfo: `Bulk import from CSV on ${new Date().toISOString()}`,
          licenseAgreementNumber: licenseAgreementNumber || undefined,
          status: status as "pending" | "approved" | "rejected",
          pointsEarned: status === "approved" ? calculatePointsForDeal(type, parseFloat(value)) : 0,
        });
      }

      if (errors.length > 0 && dealsToInsert.length === 0) {
        return res.status(400).json({ 
          message: "No valid deals to import", 
          errors: errors.slice(0, 10) // Limit error messages
        });
      }

      // Insert deals
      const insertedDeals = [];
      for (const dealData of dealsToInsert) {
        try {
          const deal = await storage.createDeal(dealData);
          insertedDeals.push(deal);
          
          // Add points history for approved deals
          if (dealData.status === "approved" && dealData.pointsEarned > 0) {
            await storage.addPointsHistory({
              userId: dealData.userId,
              dealId: deal.id,
              points: dealData.pointsEarned,
              description: `Points earned from bulk imported deal: ${dealData.productName}`,
            });
          }
        } catch (error) {
          console.error("Error inserting deal:", error);
          errors.push(`Failed to insert deal for user ${dealData.userId}`);
        }
      }

      res.json({
        message: `Successfully imported ${insertedDeals.length} deals`,
        imported: insertedDeals.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined
      });

    } catch (error) {
      console.error("Error processing CSV:", error);
      res.status(500).json({ message: "Failed to process CSV file" });
    }
  });

  // Users CSV processing endpoint
  app.post("/api/admin/csv/users/process", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { csvPath } = req.body;
      if (!csvPath) {
        return res.status(400).json({ message: "CSV path is required" });
      }

      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      
      // Download and parse CSV content
      const objectPath = objectStorageService.normalizeObjectEntityPath(csvPath);
      const csvContent = await objectStorageService.downloadCSVContent(objectPath);
      
      // Parse CSV content
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV file must have at least a header and one data row" });
      }

      const header = lines[0].toLowerCase().split(',').map(h => h.trim());
      const expectedHeaders = ['first name', 'last name', 'username', 'email', 'password', 'country', 'role', 'partner level'];
      
      // Validate headers
      const hasAllHeaders = expectedHeaders.every(h => header.includes(h));
      if (!hasAllHeaders) {
        return res.status(400).json({ 
          message: `CSV must have columns: ${expectedHeaders.join(', ')}. Found: ${header.join(', ')}` 
        });
      }

      const firstNameIndex = header.indexOf('first name');
      const lastNameIndex = header.indexOf('last name');
      const usernameIndex = header.indexOf('username');
      const emailIndex = header.indexOf('email');
      const passwordIndex = header.indexOf('password');
      const countryIndex = header.indexOf('country');
      const roleIndex = header.indexOf('role');
      const partnerLevelIndex = header.indexOf('partner level');

      const usersToInsert = [];
      const errors = [];

      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        
        if (row.length !== header.length) {
          errors.push(`Row ${i + 1}: Column count mismatch`);
          continue;
        }

        const firstName = row[firstNameIndex];
        const lastName = row[lastNameIndex];
        const username = row[usernameIndex];
        const email = row[emailIndex];
        const password = row[passwordIndex];
        const country = row[countryIndex];
        const role = row[roleIndex].toLowerCase();
        const partnerLevel = row[partnerLevelIndex].toLowerCase();

        // Validate data
        if (!firstName) {
          errors.push(`Row ${i + 1}: First name is required`);
          continue;
        }

        if (!lastName) {
          errors.push(`Row ${i + 1}: Last name is required`);
          continue;
        }

        if (!username || username.length < 3) {
          errors.push(`Row ${i + 1}: Username is required and must be at least 3 characters`);
          continue;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push(`Row ${i + 1}: Valid email is required`);
          continue;
        }

        if (!password || password.length < 6) {
          errors.push(`Row ${i + 1}: Password is required and must be at least 6 characters`);
          continue;
        }

        if (!country) {
          errors.push(`Row ${i + 1}: Country is required`);
          continue;
        }

        if (!['user', 'admin'].includes(role)) {
          errors.push(`Row ${i + 1}: Role must be either 'user' or 'admin'`);
          continue;
        }

        if (!['bronze', 'silver', 'gold', 'platinum'].includes(partnerLevel)) {
          errors.push(`Row ${i + 1}: Partner level must be bronze, silver, gold, or platinum`);
          continue;
        }

        // Check if user already exists
        try {
          const existingUserByUsername = await storage.getUserByUsername(username);
          if (existingUserByUsername) {
            errors.push(`Row ${i + 1}: Username '${username}' already exists`);
            continue;
          }

          const existingUserByEmail = await storage.getUserByEmail(email);
          if (existingUserByEmail) {
            errors.push(`Row ${i + 1}: Email '${email}' already exists`);
            continue;
          }
        } catch (error) {
          errors.push(`Row ${i + 1}: Error checking existing user`);
          continue;
        }

        usersToInsert.push({
          firstName,
          lastName,
          username,
          email,
          password,
          country,
          role: role as "user" | "admin",
          partnerLevel: partnerLevel as "bronze" | "silver" | "gold" | "platinum",
          isActive: true,
        });
      }

      // Insert users in batch
      let createdCount = 0;
      for (const userData of usersToInsert) {
        try {
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          await storage.createUser({
            ...userData,
            password: hashedPassword,
          });
          createdCount++;
        } catch (error) {
          console.error("Error creating user:", error);
          errors.push(`Failed to create user ${userData.username}`);
        }
      }

      res.json({
        message: `Successfully created ${createdCount} users`,
        createdCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10), // Return first 10 errors only
      });

    } catch (error) {
      console.error("Users CSV processing error:", error);
      res.status(500).json({ message: "Failed to process CSV file" });
    }
  });

  // Get pending users for approval
  app.get("/api/admin/users/pending", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Failed to fetch pending users" });
    }
  });

  // Approve user registration
  app.put("/api/admin/users/:userId/approve", async (req, res) => {
    const userRole = req.session?.userRole;
    const adminUserId = req.session?.userId;
    
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { userId } = req.params;
      const approvedUser = await storage.approveUser(userId, adminUserId!);
      
      if (!approvedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Send approval email
      await sendApprovalEmail(
        approvedUser.email,
        approvedUser.firstName,
        approvedUser.lastName
      );

      res.json({ 
        message: "User approved successfully", 
        user: {
          id: approvedUser.id,
          username: approvedUser.username,
          email: approvedUser.email,
          firstName: approvedUser.firstName,
          lastName: approvedUser.lastName,
          isApproved: approvedUser.isApproved
        }
      });
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Failed to approve user" });
    }
  });

  app.put("/api/admin/users/:userId/reject", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { userId } = req.params;
      const rejectedUser = await storage.rejectUser(userId);
      
      if (!rejectedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        message: "User rejected successfully", 
        user: {
          id: rejectedUser.id,
          username: rejectedUser.username,
          email: rejectedUser.email,
          firstName: rejectedUser.firstName,
          lastName: rejectedUser.lastName,
          isActive: rejectedUser.isActive
        }
      });
    } catch (error) {
      console.error("Error rejecting user:", error);
      res.status(500).json({ message: "Failed to reject user" });
    }
  });

  // Recalculate all deals points endpoint
  app.post("/api/admin/recalculate-points", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const result = await storage.recalculateAllDealsPoints();
      
      res.json({
        message: `Successfully recalculated points for ${result.updated} deals`,
        updated: result.updated,
        errors: result.errors.length > 0 ? result.errors.slice(0, 10) : undefined
      });
    } catch (error) {
      console.error("Error recalculating points:", error);
      res.status(500).json({ message: "Failed to recalculate points" });
    }
  });

  // Deals per user report endpoint
  app.get("/api/admin/reports/deals-per-user", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const data = await storage.getDealsPerUserReport(filters);
      res.json(data);
    } catch (error) {
      console.error("Error getting deals per user report:", error);
      res.status(500).json({ message: "Failed to get deals per user report" });
    }
  });

  app.get("/api/admin/reports/deals-per-user/export", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const data = await storage.getDealsPerUserReport(filters);
      
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const excelData = data.map((user, index) => ({
        'Ranking': index + 1,
        'Username': user.username,
        'Name': `${user.firstName} ${user.lastName}`.trim(),
        'Email': user.email,
        'Country': user.country,
        'Total Deals': user.totalDeals,
        'Total Sales ($)': user.totalSales.toFixed(2),
        'Average Deal Size ($)': user.averageDealSize.toFixed(2)
      }));
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-size columns
      const columnWidths = [
        { wch: 10 }, // Ranking
        { wch: 15 }, // Username
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 15 }, // Country
        { wch: 15 }, // Total Deals
        { wch: 20 }, // Total Sales
        { wch: 20 }  // Average Deal Size
      ];
      worksheet['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      const sheetName = `Deals Per User ${new Date().toISOString().split('T')[0]}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set response headers for file download
      const filename = `deals-per-user-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', excelBuffer.length.toString());
      
      // Send the Excel file
      res.send(excelBuffer);
      
    } catch (error) {
      console.error("Error exporting deals per user report:", error);
      res.status(500).json({ message: "Failed to export deals per user report" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { id } = req.params;
      const notification = await storage.markNotificationAsRead(id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Verify notification belongs to user
      if (notification.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(notification);
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Support Ticket routes
  app.post("/api/support-tickets", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const ticketData = insertSupportTicketSchema.parse({
        ...req.body,
        userId,
      });
      
      const ticket = await storage.createSupportTicket(ticketData);
      
      // Obtener información del usuario para enviar email al admin
      const user = await storage.getUser(userId);
      if (user) {
        // Obtener email del primer admin para enviar notificación
        const allUsers = await storage.getAllUsers();
        const admins = allUsers.filter(u => u.role === 'admin');
        if (admins && admins.length > 0) {
          await sendSupportTicketToAdmin(
            admins[0].email,
            {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email
            },
            {
              subject: ticket.subject,
              message: ticket.message,
              ticketId: ticket.id
            }
          );
        }
      }
      
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Create support ticket error:", error);
      res.status(500).json({ message: "Failed to create support ticket" });
    }
  });

  app.get("/api/support-tickets", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const tickets = await storage.getUserSupportTickets(userId);
      res.json(tickets);
    } catch (error) {
      console.error("Get user support tickets error:", error);
      res.status(500).json({ message: "Failed to get support tickets" });
    }
  });

  app.get("/api/support-tickets/:id", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { id } = req.params;
      const ticket = await storage.getSupportTicket(id);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      if (ticket.userId !== userId && req.session?.userRole !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(ticket);
    } catch (error) {
      console.error("Get support ticket error:", error);
      res.status(500).json({ message: "Failed to get support ticket" });
    }
  });

  app.get("/api/admin/support-tickets", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const tickets = await storage.getAllSupportTickets();
      res.json(tickets);
    } catch (error) {
      console.error("Get all support tickets error:", error);
      res.status(500).json({ message: "Failed to get support tickets" });
    }
  });

  app.patch("/api/admin/support-tickets/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const updates = updateSupportTicketSchema.parse(req.body);
      
      if (updates.adminResponse && !updates.respondedBy) {
        updates.respondedBy = userId;
        updates.respondedAt = new Date();
      }
      
      const ticket = await storage.updateSupportTicket(id, updates);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Enviar notificación en tiempo real cuando el admin responde
      if (updates.adminResponse) {
        await NotificationHelpers.supportTicketResponse(
          ticket.userId,
          ticket.subject
        );
      }

      res.json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Update support ticket error:", error);
      res.status(500).json({ message: "Failed to update support ticket" });
    }
  });

  // Points Configuration routes
  // Public route for users to view redemption period
  app.get("/api/points-config", async (req, res) => {
    try {
      const config = await storage.getPointsConfig();
      
      if (!config) {
        const defaultConfig = {
          redemptionStartDate: null,
          redemptionEndDate: null,
          grandPrizeThreshold: 50000,
        };
        return res.json(defaultConfig);
      }
      
      // Return only public-facing info
      res.json({
        redemptionStartDate: config.redemptionStartDate,
        redemptionEndDate: config.redemptionEndDate,
        grandPrizeThreshold: config.grandPrizeThreshold,
      });
    } catch (error) {
      console.error("Get points config error:", error);
      res.status(500).json({ message: "Failed to get points configuration" });
    }
  });

  app.get("/api/admin/points-config", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const config = await storage.getPointsConfig();
      
      if (!config) {
        const defaultConfig = {
          id: "",
          softwareRate: 1000,
          hardwareRate: 5000,
          equipmentRate: 10000,
          grandPrizeThreshold: 50000,
          updatedAt: new Date(),
          updatedBy: null
        };
        return res.json(defaultConfig);
      }
      
      res.json(config);
    } catch (error) {
      console.error("Get points config error:", error);
      res.status(500).json({ message: "Failed to get points configuration" });
    }
  });

  app.patch("/api/admin/points-config", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const updates = updatePointsConfigSchema.parse(req.body);
      const config = await storage.updatePointsConfig(updates, userId);
      
      if (!config) {
        return res.status(500).json({ message: "Failed to update points configuration" });
      }

      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Update points config error:", error);
      res.status(500).json({ message: "Failed to update points configuration" });
    }
  });

  // Regions configuration routes
  app.get("/api/admin/regions", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const regions = await storage.getAllRegionConfigs();
      res.json(regions);
    } catch (error) {
      console.error("Get regions error:", error);
      res.status(500).json({ message: "Failed to get regions" });
    }
  });

  app.post("/api/admin/regions", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const regionConfig = req.body;
      
      // Validar que no exista ya una región con la misma combinación
      const existingRegions = await storage.getAllRegionConfigs();
      const subcategoryToCheck = regionConfig.subcategory || null;
      
      const duplicate = existingRegions.find(r => 
        r.region === regionConfig.region && 
        r.category === regionConfig.category && 
        (r.subcategory || null) === subcategoryToCheck
      );
      
      if (duplicate) {
        return res.status(409).json({ 
          message: `Ya existe una configuración para ${regionConfig.region} - ${regionConfig.category}${subcategoryToCheck ? ' - ' + subcategoryToCheck : ''}`
        });
      }
      
      const newRegion = await storage.createRegionConfig(regionConfig);
      res.json(newRegion);
    } catch (error) {
      console.error("Create region error:", error);
      
      // Manejar error de constraint único de la base de datos
      if ((error as any).code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({ 
          message: "Ya existe una configuración regional con estos parámetros" 
        });
      }
      
      res.status(500).json({ message: "Failed to create region" });
    }
  });

  app.post("/api/admin/regions/seed", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      await storage.seedRegions();
      res.json({ message: "Regions seeded successfully" });
    } catch (error) {
      console.error("Seed regions error:", error);
      res.status(500).json({ message: "Failed to seed regions" });
    }
  });

  app.patch("/api/admin/regions/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const updates = req.body;
      console.log("Update region request:", { id, updates });
      
      const region = await storage.updateRegionConfig(id, updates);
      
      if (!region) {
        return res.status(404).json({ message: "Region not found" });
      }
      
      res.json(region);
    } catch (error) {
      console.error("Update region error:", error);
      res.status(500).json({ message: "Failed to update region" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
