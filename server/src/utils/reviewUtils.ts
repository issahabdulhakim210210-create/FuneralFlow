export type ReviewSummary = {
  averageRating: number;
  reviewCount: number;
};

export function buildReviewSummary(reviews: Array<{ rating?: number | null }> | null | undefined): ReviewSummary {
  const list = Array.isArray(reviews) ? reviews : [];
  const count = list.length;
  if (count === 0) {
    return { averageRating: 0, reviewCount: 0 };
  }

  const total = list.reduce((sum, review) => sum + Number(review?.rating || 0), 0);
  return {
    averageRating: Math.round((total / count) * 10) / 10,
    reviewCount: count,
  };
}
