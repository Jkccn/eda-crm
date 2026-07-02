"use client";

import { useEffect, useState } from "react";
import { DEFAULT_INDUSTRIES, DEFAULT_REGIONS } from "@/lib/constants";

async function fetchConfigValues(url: string, fallback: readonly string[]) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [...fallback];
    const text = await res.text();
    if (!text.trim()) return [...fallback];
    const data = JSON.parse(text) as { values?: string[] };
    return Array.isArray(data.values) ? data.values : [...fallback];
  } catch {
    return [...fallback];
  }
}

export function useConfigOptions() {
  const [regions, setRegions] = useState<string[]>([...DEFAULT_REGIONS]);
  const [industries, setIndustries] = useState<string[]>([...DEFAULT_INDUSTRIES]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchConfigValues("/api/config/regions", DEFAULT_REGIONS),
      fetchConfigValues("/api/config/industries", DEFAULT_INDUSTRIES),
    ])
      .then(([r, i]) => {
        setRegions(r);
        setIndustries(i);
      })
      .finally(() => setLoading(false));
  }, []);

  return { regions, industries, loading };
}
