export interface AnalyticsMetrics {
  totalTimeSaved: number; // in minutes
  totalSummaries: number;
  averageReadingTimeReduction: number; // percentage
  weeklyTimeSaved: number;
  monthlyTimeSaved: number;
  productivityScore: number; // 0-100
  streakDays: number;
  topCategories: CategoryMetric[];
  weeklyData: WeeklyMetric[];
  monthlyData: MonthlyMetric[];
}

export interface CategoryMetric {
  category: string;
  count: number;
  timeSaved: number;
  averageLength: number;
}

export interface WeeklyMetric {
  week: string;
  summaries: number;
  timeSaved: number;
  avgWordsReduced: number;
}

export interface MonthlyMetric {
  month: string;
  summaries: number;
  timeSaved: number;
  avgWordsReduced: number;
}

export interface UserGoal {
  id: string;
  userId: string;
  type: 'daily_summaries' | 'weekly_time_saved' | 'monthly_summaries' | 'reading_efficiency';
  target: number;
  current: number;
  period: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface InsightData {
  type: 'time_saved' | 'productivity_trend' | 'goal_progress' | 'efficiency_tip' | 'milestone';
  title: string;
  description: string;
  value?: number;
  trend?: 'up' | 'down' | 'stable';
  actionable?: string;
  priority: 'high' | 'medium' | 'low';
  icon?: string;
}

export interface ProductivityReport {
  period: 'week' | 'month';
  startDate: string;
  endDate: string;
  totalTimeSaved: number;
  summariesCreated: number;
  averageWordsReduced: number;
  topPerformingDays: string[];
  insights: InsightData[];
  goals: UserGoal[];
  nextWeekRecommendations: string[];
}

export interface SummaryAnalytics {
  id: string;
  summaryId: string;
  originalWordCount: number;
  summaryWordCount: number;
  estimatedReadingTime: number; // original content in minutes
  actualTimeTaken: number; // time to read summary in minutes
  timeSaved: number;
  category: string;
  complexity: 'low' | 'medium' | 'high';
  createdAt: string;
}