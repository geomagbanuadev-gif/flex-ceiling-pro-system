"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canSeeProjects } from "@/utils/profile";

export type ProjectPayload = {
  id?: string;
  clientId: string;
  code: string;
  name: string;
  status: "active" | "completed" | "cancelled";
  startDate: string;
  endDate: string;
  notes: string;
};

export async function saveProject(payload: ProjectPayload) {
  const profile = await getProfile();
  if (!profile || !canSeeProjects(profile.role)) throw new Error("Not authorized for projects");
  if (!payload.clientId) throw new Error("Choose a client");
  if (!payload.name.trim()) throw new Error("Project name is required");
  if (payload.startDate && payload.endDate && payload.endDate < payload.startDate) throw new Error("End date cannot be before start date");

  const supabase = await createClient();
  const fields = {
    client_id: payload.clientId,
    code: payload.code.trim() || null,
    name: payload.name.trim(),
    status: payload.status,
    start_date: payload.startDate || null,
    end_date: payload.endDate || null,
    notes: payload.notes.trim() || null,
    updated_at: new Date().toISOString(),
    updated_by: profile.id,
  };

  let id = payload.id;
  if (id) {
    const { error } = await supabase.from("projects").update(fields).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("projects").insert({ ...fields, created_by: profile.id }).select("id").single();
    if (error) throw new Error(error.message);
    id = data.id;
  }
  redirect(`/projects/${id}?flash=project-saved`);
}
