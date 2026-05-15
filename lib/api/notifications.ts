"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  clearNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  snoozeNotification,
  subscribeNotifications,
} from "@/lib/mocks/store";
import type { Notification } from "@/lib/mocks/notifications";

const KEY = ["notifications", "list"] as const;

export function useNotifications() {
  const qc = useQueryClient();
  const query = useQuery<Notification[]>({
    queryKey: KEY,
    queryFn: () => listNotifications(),
    staleTime: 15_000,
  });
  useEffect(() => {
    return subscribeNotifications(() => {
      qc.invalidateQueries({ queryKey: KEY });
    });
  }, [qc]);
  return query;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; read: boolean }) =>
      markNotificationRead(input.id, input.read),
    onMutate: async ({ id, read }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<Notification[]>(KEY);
      if (previous) {
        qc.setQueryData<Notification[]>(
          KEY,
          previous.map((n) => (n.id === id ? { ...n, read } : n))
        );
      }
      return { previous };
    },
    onError: (_e, _i, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<Notification[]>(KEY);
      if (previous) {
        qc.setQueryData<Notification[]>(
          KEY,
          previous.map((n) => ({ ...n, read: true }))
        );
      }
      return { previous };
    },
    onError: (_e, _i, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSnoozeNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; hours: number }) =>
      snoozeNotification(input.id, input.hours),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useClearNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clearNotification(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<Notification[]>(KEY);
      if (previous) {
        qc.setQueryData<Notification[]>(
          KEY,
          previous.filter((n) => n.id !== id)
        );
      }
      return { previous };
    },
    onError: (_e, _i, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export type { Notification };
