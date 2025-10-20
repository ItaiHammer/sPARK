import arcjet, { shield, detectBot, tokenBucket } from "@arcjet/next";
import { isSpoofedBot } from "@arcjet/inspect";

export const aj = arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ["ip.src"],
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow:
        process.env.NODE_ENV === "development"
          ? ["CATEGORY:SEARCH_ENGINE", "POSTMAN"]
          : ["CATEGORY:SEARCH_ENGINE"],
    }),
    tokenBucket({
      mode: "LIVE",
      refillRate: 15, // refill 15 tokens per 30 seconds
      interval: 30,
      capacity: 150,
    }),
  ],
});

export const decisionHandler = async (req) => {
  const decision = await aj.protect(req, { requested: 1 });
  if (process.env.NODE_ENV === "development")
    console.log(
      `Arcjet Decision: ${decision.conclusion} - [${decision.reason.type}]`
    );

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return {
        ...decision,
        message: "Too many requests have been sent. Please try again later.",
        code: errorCodes.TOO_MANY_REQUESTS,
        status: 429,
      };
    } else if (decision.reason.isBot()) {
      return {
        ...decision,
        message:
          "Bots Detected. Please refrain from using bots to access our API.",
        code: errorCodes.BOTS_DETECTED,
        status: 403,
      };
    } else {
      return {
        ...decision,
        message: "Your access has been denied.",
        code: errorCodes.ACCESS_DENIED,
        status: 403,
      };
    }
  } else if (decision.results.some(isSpoofedBot)) {
    return {
      ...decision,
      message: "Your access has been denied.",
      code: errorCodes.ACCESS_DENIED,
      status: 403,
    };
  }

  return decision;
};
