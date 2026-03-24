"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export type MemberType = "danka" | "goen" | null;
export type UserRole = "super_admin" | "admin" | "staff" | "member" | null;

interface DbProfile {
  role: UserRole;
  memberType: MemberType;
  memberId: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile>({
    role: null,
    memberType: null,
    memberId: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/me");
    if (!res.ok) {
      setProfile({ role: null, memberType: null, memberId: null });
      return;
    }
    const data = await res.json();
    if (data.user) {
      setProfile({
        role: data.user.role as UserRole,
        memberType: data.user.memberType as MemberType,
        memberId: data.user.memberId,
      });
    } else {
      setProfile({ role: null, memberType: null, memberId: null });
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile();
      } else {
        setProfile({ role: null, memberType: null, memberId: null });
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const { role, memberType, memberId } = profile;
  const isDanka = memberType === "danka";
  const isGoen = memberType === "goen";
  const isAdmin = role === "admin" || role === "super_admin";
  const isStaff = role === "staff" || isAdmin;

  return {
    user,
    memberType,
    memberId,
    role,
    loading,
    isDanka,
    isGoen,
    isAdmin,
    isStaff,
  };
}
