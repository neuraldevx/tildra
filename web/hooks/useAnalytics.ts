import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AnalyticsMetrics, UserGoal, InsightData } from '@/types/analytics';

interface UseAnalyticsReturn {
  metrics: AnalyticsMetrics | null;
  goals: UserGoal[];
  insights: InsightData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createGoal: (goalData: Partial<UserGoal>) => Promise<void>;
  updateGoal: (goalId: string, updates: Partial<UserGoal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
}

export function useAnalytics(): UseAnalyticsReturn {
  const { getToken } = useAuth();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://tildra.fly.dev';

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication token not available');
    }

    const response = await fetch(`${baseApiUrl}${url}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    return response.json();
  };

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const [metricsData, goalsData, insightsData] = await Promise.all([
        fetchWithAuth('/api/analytics/metrics'),
        fetchWithAuth('/api/goals'),
        fetchWithAuth('/api/analytics/insights'),
      ]);

      setMetrics(metricsData);
      setGoals(goalsData);
      setInsights(insightsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics data';
      setError(errorMessage);
      console.error('Analytics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createGoal = async (goalData: Partial<UserGoal>) => {
    try {
      const newGoal = await fetchWithAuth('/api/goals', {
        method: 'POST',
        body: JSON.stringify(goalData),
      });

      setGoals(prev => [...prev, newGoal]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create goal';
      setError(errorMessage);
      throw err;
    }
  };

  const updateGoal = async (goalId: string, updates: Partial<UserGoal>) => {
    try {
      const updatedGoal = await fetchWithAuth(`/api/goals/${goalId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      setGoals(prev => prev.map(goal => goal.id === goalId ? updatedGoal : goal));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update goal';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      await fetchWithAuth(`/api/goals/${goalId}`, {
        method: 'DELETE',
      });

      setGoals(prev => prev.filter(goal => goal.id !== goalId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete goal';
      setError(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  return {
    metrics,
    goals,
    insights,
    isLoading,
    error,
    refetch: fetchAnalyticsData,
    createGoal,
    updateGoal,
    deleteGoal,
  };
}