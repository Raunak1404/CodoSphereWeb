export interface MatchQueueEntry {
  userId: string;
  timestamp: number;
  status: 'waiting' | 'matched';
  rating?: number;
}

export interface Match {
  id: string;
  player1: string;
  player2: string;
  problemId: number;
  startTime: number;
  endTime?: number;
  status: 'matched' | 'in_progress' | 'completed' | 'cancelled';
  submissions: {
    [userId: string]: {
      code: string;
      language: string;
      submissionTime: number;
      testCasesPassed: number;
      totalTestCases: number;
    };
  };
  winner?: string;
}

export interface UserStats {
  problemsSolved: number;
  currentStreak: number;
  bestStreak: number;
  averageSolveTime?: number;
  totalPoints: number;
  totalRankPoints: number;
  rankWins: number;
  rankMatches: number;
  rank: string;
}

export interface UserProfile {
  id: string;
  name: string;
  coderName?: string;
  profileImage?: string;
  stats: UserStats;
  solvedProblems: number[];
}