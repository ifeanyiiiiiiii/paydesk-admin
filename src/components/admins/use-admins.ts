"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Admin, AdminChange, InviteForm } from "@/lib/admins/admins";
import { request } from "@/lib/api-client";

const adminsKey = ["admins"] as const;

export function useAdmins(initialData: Admin[]) {
  return useQuery({
    queryKey: adminsKey,
    queryFn: () => request<Admin[]>("/api/admins"),
    initialData,
  });
}

/**
 * Account changes wait for the server rather than updating optimistically:
 * access to a payments platform shouldn't look granted or removed before it is.
 */
function useAdminMutation<T>(mutationFn: (variables: T) => Promise<Admin[]>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (admins) => queryClient.setQueryData(adminsKey, admins),
  });
}

export function useChangeAdmin() {
  return useAdminMutation(({ id, change }: { id: string; change: AdminChange }) =>
    request<Admin[]>(`/api/admins/${id}`, {
      method: "PATCH",
      body: JSON.stringify(change),
    }),
  );
}

export function useInviteAdmin() {
  return useAdminMutation((invite: InviteForm) =>
    request<Admin[]>("/api/admins", {
      method: "POST",
      body: JSON.stringify(invite),
    }),
  );
}

export function useRevokeInvite() {
  return useAdminMutation((id: string) =>
    request<Admin[]>(`/api/admins/${id}`, { method: "DELETE" }),
  );
}
