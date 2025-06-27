import {
  DynamoDBClient,
  CreateTableCommand,
  CreateTableCommandInput,
} from "@aws-sdk/client-dynamodb";

const tableName = process.env.TODO_TABLE_NAME || "TodoAppTableCDK"; // Default to CDK table name

export const up = async (client: DynamoDBClient) => {
  const params: CreateTableCommandInput = {
    TableName: tableName,
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" }, // Partition key
      { AttributeName: "todoId", KeyType: "RANGE" }, // Sort key
    ],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "todoId", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const command = new CreateTableCommand(params);
    await client.send(command);
    console.log(`Table "${tableName}" created successfully.`);
  } catch (err) {
    if (err instanceof Error && err.name === "ResourceInUseException") {
      console.log(`Table "${tableName}" already exists. Skipping creation.`);
    } else {
      console.error(`Error creating table "${tableName}":`, err);
      throw err;
    }
  }
};

// Optional: Add a down function to delete the table if needed for rollbacks
// export const down = async () => {
//     // Implementation to delete the table
// };

// If running this script directly (e.g., for testing a single migration)
// if (require.main === module) {
//     up().catch(console.error);
// }
