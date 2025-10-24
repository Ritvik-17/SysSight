import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
dotenv.config({ debug: false });

const uri =  process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

let db, metricsCollection, agentsCollection;

export async function connectDB(DB_NAME) {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    db = client.db(DB_NAME);
    metricsCollection = db.collection("metrics");
    agentsCollection = db.collection("agents");

    await metricsCollection.createIndex({ agentId: 1, createdAt: -1 });
    await metricsCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
    await agentsCollection.createIndex({ agentId: 1 }, { unique: true });

    console.log(`Database ready: ${DB_NAME}`);
    return { db, metricsCollection, agentsCollection };
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

export { metricsCollection, agentsCollection };
