import express from "express";
import dotenv from "dotenv";
import { initializeDatabase } from "./database/database";
import contactRoutes from "./routes/contactRoutes";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use("/", contactRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("Identity Reconciliation API is running");
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;