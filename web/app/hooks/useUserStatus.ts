"use client"

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

/**
 * Fetches and exposes the current user's subscription status.
 * Returns { isPro: boolean, loading: boolean }
 */
export function useUserStatus() {
  const { getToken, isSignedIn } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchStatus() {
      if (!isSignedIn) {
        if (mounted) {
          setIsPro(false);
          setLoading(false);
        }
        return;
      }

      try {
        const token = await getToken();
        const response = await fetch('/api/user/status', {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (mounted) setIsPro(data.is_pro);
        }
      } catch (error) {
        console.error('useUserStatus error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchStatus();
    return () => { mounted = false; };
  }, [isSignedIn, getToken]);

  return { isPro, loading };
} 