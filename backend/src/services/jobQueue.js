const { sendEmailNow } = require("./emailService");

let emailQueue = null;
let worker = null;

function getRedisConnection() {
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL };
  }
  if (process.env.REDIS_HOST) {
    return {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    };
  }
  return null;
}

function isQueueEnabled() {
  return Boolean(getRedisConnection());
}

async function initEmailQueue() {
  if (emailQueue || !isQueueEnabled()) return emailQueue;

  try {
    const { Queue, Worker } = require("bullmq");
    const connection = getRedisConnection();

    emailQueue = new Queue("email", { connection });

    worker = new Worker(
      "email",
      async (job) => {
        const result = await sendEmailNow(job.data);
        if (!result?.success) {
          throw new Error(result?.error || "Email send failed");
        }
        return result;
      },
      {
        connection,
        concurrency: Number(process.env.EMAIL_QUEUE_CONCURRENCY || 3),
      }
    );

    worker.on("failed", (job, err) => {
      console.error("[queue:email] Job failed:", job?.id, err?.message);
    });

    console.log("[queue] Email worker started (BullMQ)");
    return emailQueue;
  } catch (err) {
    console.warn("[queue] BullMQ unavailable — emails will send inline:", err.message);
    emailQueue = null;
    worker = null;
    return null;
  }
}

async function enqueueEmail(payload, { priority } = {}) {
  const queue = await initEmailQueue();
  if (!queue) {
    return sendEmailNow(payload);
  }

  const job = await queue.add("send", payload, {
    priority: priority ?? 5,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  });

  return { success: true, queued: true, jobId: job.id };
}

async function shutdownQueue() {
  const closes = [];
  if (worker) closes.push(worker.close());
  if (emailQueue) closes.push(emailQueue.close());
  await Promise.all(closes);
  worker = null;
  emailQueue = null;
}

module.exports = {
  isQueueEnabled,
  initEmailQueue,
  enqueueEmail,
  shutdownQueue,
};
