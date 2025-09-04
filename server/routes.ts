import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { insertUserSchema, insertDealSchema, insertRewardSchema } from "@shared/schema";
import { z } from "zod";

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
      const user = await storage.getUserByUsername(username);
      
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
        partnerLevel: user.partnerLevel,
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
      partnerLevel: user.partnerLevel,
      country: user.country
    });
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
      res.json(deal);
    } catch (error) {
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

  app.post("/api/rewards/:id/redeem", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userReward = await storage.redeemReward(userId, req.params.id);
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

  // Admin endpoints for reward approval
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

  // Admin endpoint to get all reward redemptions
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
        partnerLevel: user.partnerLevel,
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
      const { role, partnerLevel } = req.body;

      if (!role || !partnerLevel) {
        return res.status(400).json({ message: "Role and partner level are required" });
      }

      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      if (!["bronze", "silver", "gold", "platinum"].includes(partnerLevel)) {
        return res.status(400).json({ message: "Invalid partner level" });
      }

      const updatedUser = await storage.updateUserRole(userId, role as "user" | "admin", partnerLevel as "bronze" | "silver" | "gold" | "platinum");
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
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
      
      // Validate headers
      const hasAllHeaders = expectedHeaders.every(h => header.includes(h));
      if (!hasAllHeaders) {
        return res.status(400).json({ 
          message: `CSV must have columns: ${expectedHeaders.join(', ')}. Found: ${header.join(', ')}` 
        });
      }

      const userIndex = header.indexOf('usuario');
      const valueIndex = header.indexOf('valor');
      const statusIndex = header.indexOf('status');
      const typeIndex = header.indexOf('tipo');

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

        if (!['software', 'hardware'].includes(type)) {
          errors.push(`Row ${i + 1}: Tipo must be software or hardware`);
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
          productType: type as "software" | "hardware",
          productName: `Imported Deal - ${type}`,
          dealValue: value, // Keep as string
          quantity: 1,
          closeDate: new Date(),
          clientInfo: `Bulk import from CSV on ${new Date().toISOString()}`,
          status: status as "pending" | "approved" | "rejected",
          pointsEarned: status === "approved" ? Math.floor(parseFloat(value) / 100) : 0,
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

  const httpServer = createServer(app);
  return httpServer;
}
