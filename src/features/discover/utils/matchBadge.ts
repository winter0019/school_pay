export interface MatchBadge {
  color: string;
  bg: string;
  progress: string;
  label: string;
}

export function getMatchBadge(score: number): MatchBadge {
  if (score >= 90) {
    return {
      color: "text-green-700",
      bg: "bg-green-100",
      progress: "bg-green-500",
      label: "Excellent Match",
    };
  }

  if (score >= 75) {
    return {
      color: "text-blue-700",
      bg: "bg-blue-100",
      progress: "bg-blue-500",
      label: "Great Match",
    };
  }

  if (score >= 60) {
    return {
      color: "text-yellow-700",
      bg: "bg-yellow-100",
      progress: "bg-yellow-500",
      label: "Good Match",
    };
  }

  if (score >= 40) {
    return {
      color: "text-orange-700",
      bg: "bg-orange-100",
      progress: "bg-orange-500",
      label: "Fair Match",
    };
  }

  return {
    color: "text-red-700",
    bg: "bg-red-100",
    progress: "bg-red-500",
    label: "Low Match",
  };
}