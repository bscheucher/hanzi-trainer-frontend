import type { CardState, CardType } from "./types";

/** Display names of review card types and states (spec 09), shared by vocabulary and review pages. */
export const CARD_TYPE_LABELS: Record<CardType, string> = { RECOGNITION: "Recognition", WRITING: "Writing", TONE: "Tones" };

export const CARD_STATE_LABELS: Record<CardState, string> = {
  NEW: "New",
  LEARNING: "Learning",
  REVIEW: "Review",
  RELEARNING: "Relearning",
};
