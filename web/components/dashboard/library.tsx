"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

type Entry = {
  id: string;
  original: string;
  summary: string;
  timestamp: number;
};

export function Library() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("library");
    if (stored) setEntries(JSON.parse(stored));
  }, []);

  const filtered = entries.filter(
    (e) =>
      e.original.toLowerCase().includes(search.toLowerCase()) ||
      e.summary.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="overflow-hidden border-2 transition-shadow hover:shadow-lg">
      <CardHeader>
        <CardTitle>Library</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search library..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />
        <div className="space-y-2 max-h-64 overflow-auto">
          {filtered.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="p-2 bg-card rounded"
            >
              <div className="font-semibold truncate">{e.summary}</div>
              <div className="text-xs text-foreground/70">
                {new Date(e.timestamp).toLocaleString()}
              </div>
            </motion.div>
          ))}
          {!filtered.length && <div className="text-sm text-foreground/70">No entries</div>}
        </div>
      </CardContent>
    </Card>
  );
} 