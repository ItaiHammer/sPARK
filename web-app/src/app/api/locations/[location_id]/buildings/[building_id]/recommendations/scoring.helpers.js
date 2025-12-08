import { roundToTwoDecimalPlaces } from "@/lib/utils/formatters";

export const scoringModels = {
  closest: "closest",
  least_full: "least-full",
  balanced: "balanced",
};

export const getScoringModel = (scoring_model) => {
  // Scoring Weights
  let durationWeight = 0.6;
  let occupancyWeight = 0.4;

  // Selecting weights based on scoring model
  switch (scoring_model) {
    case scoringModels.closest:
      durationWeight = 0.8;
      occupancyWeight = 0.2;
      break;

    case scoringModels.least_full:
      durationWeight = 0.2;
      occupancyWeight = 0.8;
      break;

    case scoringModels.balanced:
      durationWeight = 0.6;
      occupancyWeight = 0.4;
      break;

    default:
      durationWeight = 0.6;
      occupancyWeight = 0.4;
      break;
  }

  return {
    durationWeight,
    occupancyWeight,
  };
};

export const calculateRecommendationScore = (
  scoring_model,
  lot,
  highestTotalTravelTime
) => {
  const { durationWeight, occupancyWeight } = getScoringModel(scoring_model);
  const normalizedDuration = lot.total_travel_time / highestTotalTravelTime;
  const durationScore = normalizedDuration * durationWeight;

  // Square the occupancy percentage to give make higher occupancy percentages more detrimental to score
  const normalizedOccupancy = lot.occupancy_pct / 100;
  const occupancyScore = Math.pow(normalizedOccupancy, 2) * occupancyWeight;

  const rawScore = roundToTwoDecimalPlaces(durationScore + occupancyScore);
  return {
    raw_score: rawScore,
    recommendation_score: roundToTwoDecimalPlaces(1 - rawScore), // Flip because higher scores are worse, so invert it for UI display
    duration_score: roundToTwoDecimalPlaces(durationScore),
    occupancy_score: roundToTwoDecimalPlaces(occupancyScore),
  };
};

export const sortRecommendationsByScore = (
  scoring_model,
  combinedRecommendations,
  highestTotalTravelTime
) => {
  const scoredRecommendations = combinedRecommendations.map((lot) => {
    return {
      ...lot,
      scoring: calculateRecommendationScore(
        scoring_model,
        lot,
        highestTotalTravelTime
      ),
    };
  });

  return scoredRecommendations.sort(
    (a, b) => b.scoring.recommendation_score - a.scoring.recommendation_score
  );
};
