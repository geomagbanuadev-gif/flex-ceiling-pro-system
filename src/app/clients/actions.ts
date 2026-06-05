"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type ClientPayload = {
  id?: string;
  name: string;
  trn: string;
  address: string;
  email: string;
  contact_person: string;
  contact_phone: string;
  notes: string;
};

export async function saveClient(p: ClientPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const fields = {
    name: p.name.trim(),
    trn: p.trn || null,
    address: p.address || null,
    email: p.email || null,
    contact_person: p.contact_person || null,
    contact_phone: p.contact_phone || null,
    notes: p.notes || null,
  };

  let id = p.id;
  if (id) {
    const { error } = await supabase.from("clients").update(fields).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("clients")
      .insert({ ...fields, created_by: user.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    id = data.id;
  }
  redirect(`/clients/${id}?flash=client-saved`);
}
