import Redis from "ioredis";

export const redis = new Redis(
  {
    host: process.env.REDIS_URL,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
  {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  }
);

// export const getRedis = () => {
//   if (!redis) {
//     redis = new Redis(process.env.REDIS_URL, {
//       maxRetriesPerRequest: 3,
//       retryStrategy(times) {
//         const delay = Math.min(times * 50, 2000);
//         return delay;
//       },
//     });
//   }
//   return redis;
// };
