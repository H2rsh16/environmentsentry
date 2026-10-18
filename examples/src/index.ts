import { config } from "./config";

console.log(`Server starting on ${config.baseUrl}`);
console.log(`Environment: ${config.nodeEnv}`);
console.log(`Database: ${config.databaseUrl}`);
console.log(`Analytics enabled: ${config.enableAnalytics}`);

if (!config.jwtSecret) {
  console.error("⚠️  JWT_SECRET is not set!");
  process.exit(1);
}

console.log("✅ All configuration loaded successfully");
