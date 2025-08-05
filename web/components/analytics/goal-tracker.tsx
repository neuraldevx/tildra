"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Clock,
  BookOpen,
  Zap,
  Trophy,
  Flag
} from "lucide-react";
import { UserGoal, AnalyticsMetrics } from "@/types/analytics";

interface GoalTrackerProps {
  goals: UserGoal[];
  metrics: AnalyticsMetrics;
  onCreateGoal: (goal: Partial<UserGoal>) => Promise<void>;
  onUpdateGoal: (goalId: string, updates: Partial<UserGoal>) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  isLoading?: boolean;
}

const GOAL_TYPES = [
  { value: 'daily_summaries', label: 'Daily Summaries', icon: BookOpen, unit: 'summaries' },
  { value: 'weekly_time_saved', label: 'Weekly Time Saved', icon: Clock, unit: 'minutes' },
  { value: 'monthly_summaries', label: 'Monthly Summaries', icon: Calendar, unit: 'summaries' },
  { value: 'reading_efficiency', label: 'Reading Efficiency', icon: TrendingUp, unit: '%' },
] as const;

const GOAL_PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

export function GoalTracker({
  goals,
  metrics,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
  isLoading = false
}: GoalTrackerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<UserGoal | null>(null);
  const [newGoal, setNewGoal] = useState({
    type: 'daily_summaries' as const,
    target: 3,
    period: 'daily' as const,
  });

  const getGoalIcon = (type: UserGoal['type']) => {
    const goalType = GOAL_TYPES.find(gt => gt.value === type);
    const Icon = goalType?.icon || Target;
    return <Icon className="h-4 w-4" />;
  };

  const getGoalProgress = (goal: UserGoal): number => {
    const percentage = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
    return Math.round(percentage);
  };

  const getGoalStatus = (goal: UserGoal) => {
    const progress = getGoalProgress(goal);
    if (progress >= 100) return { status: 'completed', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' };
    if (progress >= 80) return { status: 'on-track', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' };
    if (progress >= 50) return { status: 'behind', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' };
    return { status: 'needs-attention', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' };
  };

  const getCurrentValue = (goal: UserGoal): number => {
    switch (goal.type) {
      case 'daily_summaries':
        // This would need to be calculated from today's summaries
        return Math.floor(metrics.totalSummaries / 30); // Rough daily average
      case 'weekly_time_saved':
        return metrics.weeklyTimeSaved;
      case 'monthly_summaries':
        return metrics.totalSummaries; // This would need monthly filtering
      case 'reading_efficiency':
        return metrics.averageReadingTimeReduction;
      default:
        return 0;
    }
  };

  const formatGoalValue = (value: number, type: UserGoal['type']): string => {
    const goalType = GOAL_TYPES.find(gt => gt.value === type);
    const unit = goalType?.unit || '';
    
    if (type === 'weekly_time_saved') {
      const hours = Math.floor(value / 60);
      const minutes = Math.round(value % 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
    
    return `${value}${unit}`;
  };

  const handleCreateGoal = async () => {
    try {
      await onCreateGoal({
        ...newGoal,
        current: getCurrentValue({ ...newGoal } as UserGoal),
        isActive: true,
      });
      setIsCreateDialogOpen(false);
      setNewGoal({ type: 'daily_summaries', target: 3, period: 'daily' });
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const handleUpdateGoal = async (goal: UserGoal, updates: Partial<UserGoal>) => {
    try {
      await onUpdateGoal(goal.id, updates);
      setEditingGoal(null);
    } catch (error) {
      console.error('Failed to update goal:', error);
    }
  };

  const activeGoals = goals.filter(goal => goal.isActive);
  const completedGoals = goals.filter(goal => !goal.isActive && getGoalProgress(goal) >= 100);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-6 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Goals & Progress
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set and track your productivity goals
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="goal-type">Goal Type</Label>
                <Select 
                  value={newGoal.type} 
                  onValueChange={(value) => setNewGoal(prev => ({ ...prev, type: value as UserGoal['type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-target">Target</Label>
                <Input
                  id="goal-target"
                  type="number"
                  value={newGoal.target}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, target: parseInt(e.target.value) || 0 }))}
                  placeholder="Enter target value"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-period">Period</Label>
                <Select 
                  value={newGoal.period} 
                  onValueChange={(value) => setNewGoal(prev => ({ ...prev, period: value as UserGoal['period'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_PERIODS.map(period => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGoal}>
                Create Goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" />
            Active Goals
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <AnimatePresence>
              {activeGoals.map((goal) => {
                const progress = getGoalProgress(goal);
                const status = getGoalStatus(goal);
                const goalType = GOAL_TYPES.find(gt => gt.value === goal.type);
                
                return (
                  <motion.div
                    key={goal.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="relative overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getGoalIcon(goal.type)}
                            <CardTitle className="text-base">
                              {goalType?.label}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingGoal(goal)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteGoal(goal.id)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {formatGoalValue(goal.current, goal.type)} / {formatGoalValue(goal.target, goal.type)}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <Progress value={progress} className="h-2" />
                          <div className="flex items-center justify-between">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${status.color} ${status.bgColor} border-0`}
                            >
                              {progress}% complete
                            </Badge>
                            <span className="text-xs text-muted-foreground capitalize">
                              {goal.period}
                            </span>
                          </div>
                        </div>

                        {progress >= 100 && (
                          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <Trophy className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">Goal achieved!</span>
                          </div>
                        )}
                      </CardContent>
                      
                      {/* Progress indicator overlay */}
                      <div 
                        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Completed Goals
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {completedGoals.slice(0, 6).map((goal) => {
              const goalType = GOAL_TYPES.find(gt => gt.value === goal.type);
              
              return (
                <Card key={goal.id} className="border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">{goalType?.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Target: {formatGoalValue(goal.target, goal.type)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeGoals.length === 0 && completedGoals.length === 0 && (
        <Card className="border-2 border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 bg-muted/50 rounded-full mb-4">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No goals set yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Set productivity goals to track your progress and stay motivated. Goals help you build consistent habits and achieve better results.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Goal Dialog */}
      {editingGoal && (
        <Dialog open={true} onOpenChange={() => setEditingGoal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Goal Type</Label>
                <div className="p-2 bg-muted/50 rounded text-sm">
                  {GOAL_TYPES.find(gt => gt.value === editingGoal.type)?.label}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-target">Target</Label>
                <Input
                  id="edit-target"
                  type="number"
                  defaultValue={editingGoal.target}
                  onChange={(e) => setEditingGoal(prev => prev ? { ...prev, target: parseInt(e.target.value) || 0 } : null)}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={editingGoal.isActive ? 'active' : 'inactive'}
                  onValueChange={(value) => setEditingGoal(prev => prev ? { ...prev, isActive: value === 'active' } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingGoal(null)}>
                Cancel
              </Button>
              <Button onClick={() => editingGoal && handleUpdateGoal(editingGoal, editingGoal)}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}