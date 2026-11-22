import * as z from "zod";
import { decisionHandler } from "@/lib/arcjet/arcjet";
import {
  categoryQuestion,
  feedbackTypes,
  maxFeedbackLength,
  question,
  questionId,
  surveyProperties,
} from "@/lib/constants/feedbackSurvey";

const feedbackSchema = z.object({
  id: z.uuid(),
  timestamp: z.iso.datetime(),
  distinctId: z.uuid().optional(),
  message: z.string().trim().min(1).max(maxFeedbackLength),
  category: z.union([z.literal(""), z.enum(feedbackTypes)]),
});

export async function POST(request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const expectedOrigin = `${request.nextUrl.protocol}//${request.headers.get("host")}`;
  if (
    (origin && origin !== expectedOrigin) ||
    (fetchSite && fetchSite !== "same-origin")
  ) {
    return new Response(null, { status: 403 });
  }

  const contentType = request.headers.get("content-type")?.split(";")[0];
  if (contentType !== "application/json") {
    return new Response(null, { status: 415 });
  }

  const protection = await decisionHandler(request);
  if (protection.isDenied) return new Response(null, { status: protection.status });

  const feedback = feedbackSchema.safeParse(await request.json().catch(() => null));
  if (!feedback.success) return new Response(null, { status: 400 });

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!token || !host) return new Response(null, { status: 503 });

  const { id, timestamp, distinctId, message, category } = feedback.data;
  try {
    const result = await fetch(new URL("/i/v0/e/", host), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: token,
        event: "survey sent",
        uuid: id,
        timestamp,
        properties: {
          distinct_id: distinctId ?? id,
          $process_person_profile: false,
          $geoip_disable: true,
          ...surveyProperties,
          $survey_submission_id: id,
          $survey_completed: true,
          $survey_questions: [{ id: questionId, question }, categoryQuestion],
          [`$survey_response_${questionId}`]: message,
          ...(category && { [`$survey_response_${categoryQuestion.id}`]: category }),
        },
      }),
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    if (result.ok && (await result.json()).status === "Ok") {
      return new Response(null, { status: 204 });
    }
  } catch {
    // Never report success or log the response text when delivery fails.
  }

  return new Response(null, { status: 502 });
}
