"use client";

import { useEffect, useState } from "react";
import type { PicklistUser } from "@/lib/user-display";

export function useUserPicklist() {
  const [salesOwners, setSalesOwners] = useState<PicklistUser[]>([]);
  const [techOwners, setTechOwners] = useState<PicklistUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/picklist")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSalesOwners(Array.isArray(data.salesOwners) ? data.salesOwners : []);
          setTechOwners(Array.isArray(data.techOwners) ? data.techOwners : []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return { salesOwners, techOwners, loading };
}
