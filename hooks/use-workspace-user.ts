"use client";

import { useState, useEffect } from "react";

interface WorkspaceUser {
  id: string;
  email: string;
  name: string;
  role: string;
  company: string | null;
}

export function useWorkspaceUser() {
  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        setUser({ id: "unknown", email: "user@workspace", name: "User", role: "installer", company: null });
        setLoading(false);
      });
  }, []);

  return { user, loading };
}
