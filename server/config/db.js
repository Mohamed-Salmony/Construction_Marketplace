import mongoose from 'mongoose';

// Retry Mongo connection with exponential backoff to avoid immediate server crash
export async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/construction_marketplace';
  const dbName = process.env.MONGO_DBNAME || undefined;

  const maxAttempts = Number(process.env.MONGO_MAX_ATTEMPTS || 10);
  const baseDelayMs = Number(process.env.MONGO_RETRY_DELAY_MS || 1000); // 1s base

  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      await mongoose.connect(uri, { dbName });
      console.log(`[db] connected (attempt ${attempt})`);
      return;
    } catch (err) {
      const name = err?.name || 'Error';
      const msg = err?.message || String(err);
      console.error(`[db] connection error (attempt ${attempt}/${maxAttempts})`, name + ':', msg);

      // For common server selection errors, keep retrying with backoff
      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), 15_000); // cap at 15s
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }

      // Exhausted retries: surface a clear error and exit with non-zero code
      console.error('[db] Unable to connect to MongoDB after multiple attempts. Please verify MONGO_URI and DB availability.');
      process.exit(1);
    }
  }
}
