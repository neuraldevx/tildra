"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Target,
  Clock,
  Trophy,
  Zap,
  BookOpen,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  Calendar,
  Brain,
  Flame
} from "lucide-react";
import { InsightData, AnalyticsMetrics } from "@/types/analytics";

interface PersonalizedInsightsProps {
  metrics: AnalyticsMetrics;
  insights: InsightData[];
  onGoalClick?: () => void;
  isLoading?: boolean;
}

const getInsightIcon = (type: InsightData['type'], priority: InsightData['priority']) => {
  const iconClass = `h-5 w-5 ${
    priority === 'high' ? 'text-red-500' : 
    priority === 'medium' ? 'text-yellow-500' : 
    'text-blue-500'
  }`;

  switch (type) {
    case 'time_saved': return <Clock className={iconClass} />;
    case 'productivity_trend': return <TrendingUp className={iconClass} />;
    case 'goal_progress': return <Target className={iconClass} />;
    case 'efficiency_tip': return <Lightbulb className={iconClass} />;
    case 'milestone': return <Trophy className={iconClass} />;
    default: return <Info className={iconClass} />;
  }
};

const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
    case 'stable': return <div className="h-4 w-4 rounded-full bg-gray-400" />;
    default: return null;
  }
};

export function PersonalizedInsights({ 
  metrics, 
  insights, 
  onGoalClick,
  isLoading = false 
}: PersonalizedInsightsProps) {
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  // Auto-rotate insights every 8 seconds
  useEffect(() => {
    if (!isAutoRotating || insights.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentInsightIndex((prev) => (prev + 1) % insights.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [insights.length, isAutoRotating]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader><div className="h-6 bg-muted rounded w-1/3"></div></CardHeader>
          <CardContent className="space-y-3">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const generateWeeklyInsights = (): InsightData[] => {
    const weeklyTime = metrics.weeklyTimeSaved;
    const totalSummaries = metrics.totalSummaries;
    const streak = metrics.streakDays;
    const productivityScore = metrics.productivityScore;

    const baseInsights: InsightData[] = [
      {
        type: 'time_saved',
        title: `You've saved ${formatTime(weeklyTime)} this week!`,
        description: `That's equivalent to ${Math.round(weeklyTime / 30)} episodes of your favorite show or ${Math.round(weeklyTime / 15)} coffee breaks.`,
        value: weeklyTime,
        trend: weeklyTime > 120 ? 'up' : weeklyTime > 60 ? 'stable' : 'down',
        actionable: weeklyTime < 60 ? 'Try summarizing 2-3 more articles this week to boost your time savings!' : 'Keep up the great work! You\'re being highly productive.',
        priority: weeklyTime > 120 ? 'low' : 'medium',
        icon: 'clock'
      }
    ];

    if (streak >= 7) {
      baseInsights.push({
        type: 'milestone',
        title: `🔥 ${streak}-day streak! You're on fire!`,
        description: `You've been consistently using Tildra for ${streak} days. Consistency is key to building productive habits.`,
        value: streak,
        actionable: 'Keep this momentum going! Set a goal to reach a 30-day streak.',
        priority: 'high',
        icon: 'flame'
      });
    }

    if (productivityScore >= 80) {
      baseInsights.push({
        type: 'productivity_trend',
        title: 'Outstanding productivity level!',
        description: `Your productivity score of ${productivityScore} puts you in the top 20% of Tildra users.`,
        value: productivityScore,
        trend: 'up',
        actionable: 'Share your productivity tips with others or consider upgrading to unlock advanced features.',
        priority: 'low',
        icon: 'trophy'
      });
    } else if (productivityScore < 40) {
      baseInsights.push({
        type: 'efficiency_tip',
        title: 'Let\'s boost your productivity!',
        description: `Your current score is ${productivityScore}. Small changes can make a big difference.`,
        value: productivityScore,
        trend: 'down',
        actionable: 'Try summarizing articles daily and focus on longer content for maximum time savings.',
        priority: 'high',
        icon: 'lightbulb'
      });
    }

    if (totalSummaries >= 50) {
      baseInsights.push({
        type: 'milestone',
        title: `${totalSummaries} summaries milestone reached!`,
        description: 'You\'ve built a substantial knowledge library. Your research efficiency has significantly improved.',
        value: totalSummaries,
        actionable: 'Consider organizing your summaries by topic or sharing insights with your team.',
        priority: 'medium',
        icon: 'star'
      });
    }

    return baseInsights;
  };

  const allInsights = [...insights, ...generateWeeklyInsights()];
  const currentInsight = allInsights[currentInsightIndex] || allInsights[0];

  return (
    <div className="space-y-6">
      {/* Main Insight Card */}
      <Card className="relative overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Personal Insights
            </CardTitle>
            {allInsights.length > 1 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {currentInsightIndex + 1} of {allInsights.length}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAutoRotating(!isAutoRotating)}
                  className="text-xs"
                >
                  {isAutoRotating ? 'Pause' : 'Auto'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentInsightIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3">
                {getInsightIcon(currentInsight.type, currentInsight.priority)}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{currentInsight.title}</h3>
                    {currentInsight.trend && getTrendIcon(currentInsight.trend)}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {currentInsight.description}
                  </p>
                  {currentInsight.actionable && (
                    <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-primary font-medium">
                        {currentInsight.actionable}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation dots */}
          {allInsights.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {allInsights.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentInsightIndex(index);
                    setIsAutoRotating(false);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentInsightIndex 
                      ? 'bg-primary scale-125' 
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="text-center border-border/40 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(metrics.weeklyTimeSaved / 7)}
              </div>
              <p className="text-sm text-muted-foreground">
                Avg daily time saved
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="text-center border-border/40 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {metrics.averageReadingTimeReduction}%
              </div>
              <p className="text-sm text-muted-foreground">
                Reading time reduction
              </p>
              <Badge variant="outline" className="mt-1 text-xs">
                vs original content
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="text-center border-border/40 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-primary/20"
                onClick={onGoalClick}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {metrics.streakDays}
              </div>
              <p className="text-sm text-muted-foreground">
                Day streak
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Set goals</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Weekly Summary */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            This Week's Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Time Saved</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatTime(metrics.weeklyTimeSaved)}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.weeklyTimeSaved > 120 ? 'Excellent!' : 
                 metrics.weeklyTimeSaved > 60 ? 'Good progress' : 
                 'Room for improvement'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Top Category</span>
              </div>
              <p className="text-lg font-semibold capitalize">
                {metrics.topCategories[0]?.category || 'General'}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.topCategories[0]?.count || 0} summaries
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}