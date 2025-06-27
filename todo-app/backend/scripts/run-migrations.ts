import fs from 'fs';
import path from 'path';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import url from 'url';

// Configure AWS SDK
const endpoint = process.env.DYNAMODB_ENDPOINT || "http://localhost:8080"; // For local development, e.g., http://localhost:8000

const dynamodbClient = new DynamoDBClient({
    region: "localhost",
    endpoint,
    credentials: {
        accessKeyId: "dummy",
        secretAccessKey: "dummy",
    },
});

// ESM compatible way to get __dirname
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
    console.log("Starting migrations...");
    console.log(`Looking for migration scripts in: ${migrationsDir}`);

    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.ts') || file.endsWith('.js')) // Allow .js files if compiled
        .sort();

    if (migrationFiles.length === 0) {
        console.log("No migration files found.");
        return;
    }

    console.log(`Found migration files: ${migrationFiles.join(', ')}`);

    for (const file of migrationFiles) {
        console.log(`\nExecuting migration: ${file}`);
        try {
            // Construct the full path to the migration script.
            // Important for dynamic import in ESM context.
            const migrationScriptPath = path.join(migrationsDir, file);
            // Convert to file URL for dynamic import, especially on Windows
            const migrationScriptUrl = url.pathToFileURL(migrationScriptPath).href;

            console.log(`Attempting to import: ${migrationScriptUrl}`);
            const migrationModule = await import(migrationScriptUrl);

            if (typeof migrationModule.up === 'function') {
                if (migrationModule.up.length === 1) {
                     await migrationModule.up(dynamodbClient);
                } else {
                    console.warn(`Migration script ${file} 'up' function does not accept DynamoDB client. Skipping.`);
                    throw new Error(`Migration script ${file} 'up' function must accept a DynamoDB client as an argument.`);
                }
                console.log(`Successfully executed migration: ${file}`);
            } else {
                console.warn(`Migration script ${file} does not have an 'up' function. Skipping.`);
            }
        } catch (error) {
            console.error(`Failed to execute migration ${file}:`, error);
            throw new Error(`Migration ${file} failed.`);
        }
    }

    console.log("\nAll migrations completed successfully.");
}

runMigrations().catch(error => {
    console.error("Migration process failed:", error);
    process.exit(1);
});
