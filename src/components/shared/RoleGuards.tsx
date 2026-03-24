"use client";

import { useAuth } from "@/hooks/useAuth";

interface GuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function DankaOnly({ children, fallback = null }: GuardProps) {
  const { isDanka, loading } = useAuth();
  if (loading) return null;
  return isDanka ? <>{children}</> : <>{fallback}</>;
}

export function GoenOnly({ children, fallback = null }: GuardProps) {
  const { isGoen, loading } = useAuth();
  if (loading) return null;
  return isGoen ? <>{children}</> : <>{fallback}</>;
}

export function AdminOnly({ children, fallback = null }: GuardProps) {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  return isAdmin ? <>{children}</> : <>{fallback}</>;
}

export function StaffOnly({ children, fallback = null }: GuardProps) {
  const { isStaff, loading } = useAuth();
  if (loading) return null;
  return isStaff ? <>{children}</> : <>{fallback}</>;
}
