"use client";

import { useState, useEffect } from "react";

export function useClasses() {
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("school");
  const [classLabel, setClassLabel] = useState<string>("Class");

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch("/api/classes");
        if (res.ok) {
          const json = await res.json();
          setClasses(json.data ?? []);
          if (json.category) setCategory(json.category);
          if (json.classLabel) setClassLabel(json.classLabel);
        }
      } catch {
        // silently fail — dropdown will just be empty
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  return { classes, loading, category, classLabel };
}
