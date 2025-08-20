import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { insertUserSchema, insertDealSchema, insertRewardSchema } from "@shared/schema";
import { z } from "zod";

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
      });

      res.status(201).json({ 
        id: user.id, 
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
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
      const deal = await storage.approveDeal(req.params.id, userId);
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
      const userRewards = await storage.getUserRewards(userId);
      res.json(userRewards);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user rewards" });
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

  app.get("/api/admin/deals", async (req, res) => {
    const userRole = req.session?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const deals = await storage.getAllDeals();
      res.json(deals);
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
          dealValue: parseFloat(value),
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

  const httpServer = createServer(app);
  return httpServer;
}
