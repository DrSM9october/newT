export interface ReviewCard {
  id: string;
  wordId: string;
  easeFactor: number; // Defaults to 2.5
  interval: number; // Days until next review
  repetitions: number;
  lastReviewedDate: string; // ISO String
  nextReviewDate: string; // ISO String
  difficultyScore: number; // 0-5
}

export interface ReviewResult {
  grade: 0 | 1 | 2 | 3 | 4 | 5; // 0: total blackout, 5: perfect recall
}

export class SpacedRepetitionEngine {
  /**
   * SM-2 Algorithm Calculation
   */
  public calculateNextReview(card: ReviewCard, grade: number): ReviewCard {
    let { easeFactor, interval, repetitions } = card;

    // Constrain grade between 0 and 5
    const q = Math.max(0, Math.min(5, grade));

    if (q >= 3) {
      // Correct response
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    } else {
      // Incorrect response: Reset repetitions
      repetitions = 0;
      interval = 1;
    }

    // Update Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (easeFactor < 1.3) {
      easeFactor = 1.3;
    }

    const now = new Date();
    const nextDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    return {
      ...card,
      easeFactor,
      interval,
      repetitions,
      lastReviewedDate: now.toISOString(),
      nextReviewDate: nextDate.toISOString(),
      difficultyScore: 5 - q,
    };
  }

  public createNewCard(wordId: string): ReviewCard {
    const now = new Date();
    return {
      id: `srs_${wordId}_${Date.now()}`,
      wordId,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      lastReviewedDate: now.toISOString(),
      nextReviewDate: now.toISOString(),
      difficultyScore: 3,
    };
  }

  public isDueForReview(card: ReviewCard): boolean {
    const now = new Date().getTime();
    const next = new Date(card.nextReviewDate).getTime();
    return now >= next;
  }
}

export const srsEngine = new SpacedRepetitionEngine();
