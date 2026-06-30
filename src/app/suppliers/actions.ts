"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canSeeProcurement } from "@/utils/profile";

export type SupplierPayload = {
  id?: string;
  name: string;
  trn: string;
  address: string;
  email: string;
  contact_person: string;
  contact_phone: string;
  default_payment_terms: string;
  notes: string;
};

async function requireProcurement() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const me = await getProfile();
  if (me && !canSeeProcurement(me.role)) throw new Error("Not authorized for procurement");
  return { supabase, user };
}

export async function saveSupplier(p: SupplierPayload) {
  const { supabase, user } = await requireProcurement();

  const fields = {
    name: p.name.trim(),
    trn: p.trn || null,
    address: p.address || null,
    email: p.email || null,
    contact_person: p.contact_person || null,
    contact_phone: p.contact_phone || null,
    default_payment_terms: p.default_payment_terms || null,
    notes: p.notes || null,
  };

  let id = p.id;
  if (id) {
    const { error } = await supabase.from("suppliers").update(fields).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("suppliers").insert({ ...fields, created_by: user.id }).select("id").single();
    if (error) throw new Error(error.message);
    id = data.id;
  }
  redirect(`/suppliers/${id}?flash=supplier-saved`);
}

export async function deleteSupplier(id: string) {
  const { supabase } = await requireProcurement();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/suppliers");
  redirect("/suppliers?flash=deleted");
}
