
import { DataSource } from "typeorm";
import { Contact } from "../models/Contact";
import dotenv from "dotenv";

dotenv.config();

// Create TypeORM data source
export const AppDataSource = new DataSource({
  type: "postgres", 
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "identity_reconciliation",
  synchronize: true, // Set to false in production
  logging: false,
  entities: [Contact],
});

// Initialize database connection
export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log("Database connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    throw error;
  }
};