"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export function TimeSavedAnalytics() {
  const [minutesSaved, setMinutesSaved] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("library");
    if (!stored) return;
    try {
      const entries = JSON.parse(stored) as Array<{ original: string; summary: string }>;
      const readSpeedWpm = 200;
      const totalWordsSaved = entries.reduce((sum, e) => {
        const origWords = e.original.split(/\s+/).length;
        const sumWords = e.summary.split(/\s+/).length;
        return sum + Math.max(0, origWords - sumWords);
      }, 0);
      const mins = Math.round(totalWordsSaved / readSpeedWpm);
      setMinutesSaved(mins);
    } catch {
      setMinutesSaved(0);
    }
  }, []);

  return (
    <Card className="overflow-hidden border-2 transition-shadow hover:shadow-lg">
      <CardHeader>
        <CardTitle>Time Saved</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold text-primary"
        >
          {minutesSaved}
        </motion.div>
        <span className="ml-2 text-lg text-foreground/70">minutes</span>
      </CardContent>
    </Card>
  );
} 