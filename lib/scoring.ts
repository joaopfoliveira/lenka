/**
 * Lenka Scoring System
 * 
 * Implements per-round scoring with accuracy-based points and position bonuses.
 * All scoring is server-side only and per-game instance.
 */

export interface PlayerGuess {
  playerId: string;
  playerName: string;
  guess: number | null;
}

export interface RoundResultEntry {
  playerId: string;
  playerName: string;
  guess: number | null;
  realPrice: number;
  errorPercentage: number;    // 0–1.5 (capped)
  baseScore: number;          // 0–1000
  bonus: number;              // 0, 40, 80, 150
  roundScore: number;         // baseScore + bonus
  totalScore: number;         // cumulative after this round
}

/**
 * Calculate round results with scoring
 * 
 * @param guesses - All player guesses for this round
 * @param realPrice - The actual price of the product
 * @param previousTotals - Each player's total score before this round
 * @returns Ordered array of results (best to worst)
 */
export function calculateRoundResults(
  guesses: PlayerGuess[],
  realPrice: number,
  previousTotals: Record<string, number>
): RoundResultEntry[] {
  // Step 1: Calculate base scores and error percentages for all players
  const resultsWithScores = guesses.map(({ playerId, playerName, guess }) => {
    let errorPercentage = 1.5; // Default max error for invalid guesses
    let baseScore = 0;

    if (guess !== null && guess > 0) {
      // Calculate error percentage
      const rawError = Math.abs(guess - realPrice) / realPrice;
      errorPercentage = Math.min(rawError, 1.5); // Cap at 150%
      
      // Calculate base score (0-1000 based on accuracy)
      const accuracy = Math.max(0, 1 - errorPercentage);
      baseScore = Math.round(accuracy * 1000);
    }

    return {
      playerId,
      playerName,
      guess,
      realPrice,
      errorPercentage,
      baseScore,
      bonus: 0, // Will be assigned in next step
      roundScore: 0, // Will be calculated after bonus
      totalScore: 0, // Will be calculated at end
    };
  });

  // Step 2: Sort by error (closest first) to determine positions
  const sortedByAccuracy = [...resultsWithScores].sort((a, b) => {
    // Sort by error percentage ascending (lower is better)
    return a.errorPercentage - b.errorPercentage;
  });

  // Step 3: Assign position bonuses
  // Group players by error percentage to handle ties
  const bonuses = [150, 80, 40]; // 1st, 2nd, 3rd place bonuses
  let currentPosition = 0;
  let previousError = -1;

  sortedByAccuracy.forEach((result) => {
    // If error changed, advance position
    if (result.errorPercentage !== previousError) {
      previousError = result.errorPercentage;
      // Only advance position if we're not at the last bonus tier
      if (currentPosition > 0 || result.errorPercentage > sortedByAccuracy[0].errorPercentage) {
        currentPosition++;
      }
    }

    // Assign bonus based on position (if within top 3)
    if (currentPosition < bonuses.length) {
      result.bonus = bonuses[currentPosition];
    }
  });

  // Step 4: Calculate final round scores and update totals
  const finalResults = resultsWithScores.map((result) => {
    result.roundScore = result.baseScore + result.bonus;
    result.totalScore = (previousTotals[result.playerId] || 0) + result.roundScore;
    return result;
  });

  // Step 5: Sort by round score descending (best first) for display
  finalResults.sort((a, b) => {
    // Primary: Round score (highest first)
    if (b.roundScore !== a.roundScore) {
      return b.roundScore - a.roundScore;
    }
    // Secondary: Total score (highest first)
    return b.totalScore - a.totalScore;
  });

  return finalResults;
}

/**
 * Generate leaderboard from results
 * 
 * @param results - Round results with updated totals
 * @returns Leaderboard ordered by total score descending
 */
export function generateLeaderboard(
  results: RoundResultEntry[]
): Array<{ playerId: string; playerName: string; totalScore: number }> {
  const leaderboard = results.map(({ playerId, playerName, totalScore }) => ({
    playerId,
    playerName,
    totalScore,
  }));

  // Sort by total score descending
  leaderboard.sort((a, b) => b.totalScore - a.totalScore);

  return leaderboard;
}

