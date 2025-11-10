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

redis.on("error", (error) => {
  console.error("Redis Error:", error);
});

redis.on("connect", () => {
  console.log("Redis Connected");
});

const IS_DEV = process.env.NODE_ENV === "development";
const redisErrorHandler = (error, key) => {
  console.error("Error getting Redis:", error);
  return {
    error: {
      message: `Redis Error: ${error.message} - ${key}`,
      code: errorCodes.REDIS_ERROR,
    },
    data: null,
  };
};

const formatKey = (key) => {
  return IS_DEV ? `DEV_${key}` : key;
};

export const setCache = async (key, value, interval) => {
  const formattedKey = formatKey(key);
  if (IS_DEV) {
    console.log("Setting Redis:", formattedKey, interval);
  }

  try {
    await redis.set(formattedKey, value, "EX", IS_DEV ? 60 * 10 : interval);

    return {
      error: null,
      data: null,
    };
  } catch (error) {
    return redisErrorHandler(error, key);
  }
};

export const getCache = async (key) => {
  const formattedKey = formatKey(key);
  if (IS_DEV) {
    console.log("Getting Redis:", formattedKey);
  }

  try {
    const data = await redis.get(formattedKey);

    return {
      error: null,
      data,
    };
  } catch (error) {
    return redisErrorHandler(error, key);
  }
};
