"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Zap,
  BookOpen,
  Calendar,
  Award,
  Brain,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, PieChart as RechartsPieChart, Cell } from "recharts";
import { AnalyticsMetrics, WeeklyMetric, CategoryMetric } from "@/types/analytics";

interface AnalyticsDashboardProps {
  metrics: AnalyticsMetrics;
  isLoading?: boolean;
}

const chartConfig = {
  timeSaved: { label: "Time Saved (min)", color: "hsl(var(--chart-1))" },
  summaries: { label: "Summaries", color: "hsl(var(--chart-2))" },
  efficiency: { label: "Efficiency %", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const CATEGORY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function AnalyticsDashboard({ metrics, isLoading = false }: AnalyticsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
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

  const getProductivityLevel = (score: number) => {
    if (score >= 80) return { level: "Excellent", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" };
    if (score >= 60) return { level: "Good", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" };
    if (score >= 40) return { level: "Average", color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" };
    return { level: "Needs Improvement", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" };
  };

  const productivityInfo = getProductivityLevel(metrics.productivityScore);

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="relative overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Total Time Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatTime(metrics.totalTimeSaved)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {metrics.totalSummaries} summaries
              </p>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="relative overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Weekly Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatTime(metrics.weeklyTimeSaved)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.averageReadingTimeReduction}% reduction in reading time
              </p>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-full" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="relative overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-600" />
                Productivity Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.productivityScore}
                </div>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${productivityInfo.color} ${productivityInfo.bgColor} border-0`}
                >
                  {productivityInfo.level}
                </Badge>
              </div>
              <Progress value={metrics.productivityScore} className="mt-2 h-1.5" />
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="relative overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-orange-600" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {metrics.streakDays}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.streakDays === 1 ? 'day' : 'days'} of consistent usage
              </p>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-bl-full" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as 'week' | 'month')} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="week" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Weekly View
          </TabsTrigger>
          <TabsTrigger value="month" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Monthly View
          </TabsTrigger>
        </TabsList>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Time Saved Trend */}
          <TabsContent value="week" className="space-y-0">
            <Card className="border-border/40 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Weekly Time Savings Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.weeklyData}>
                      <defs>
                        <linearGradient id="timeSavedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="week" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                      />
                      <Area
                        type="monotone"
                        dataKey="timeSaved"
                        stroke="hsl(var(--chart-1))"
                        fillOpacity={1}
                        fill="url(#timeSavedGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="month" className="space-y-0">
            <Card className="border-border/40 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Monthly Summary Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="month" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                      />
                      <Bar
                        dataKey="summaries"
                        fill="hsl(var(--chart-2))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category Breakdown */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Content Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.topCategories.slice(0, 5).map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: CATEGORY_COLORS[index] }}
                      />
                      <span className="text-sm font-medium capitalize">
                        {category.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {category.count} summaries
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(category.timeSaved)} saved
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}