"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type SettingsPayload = {
  legal_name: string;
  address: string;
  email: string;
  phone: string;
  trn: string;
  bank_account_name: string;
  bank_account_no: string;
  bank_iban: string;
  bank_currency: string;
  bank_name: string;
  default_payment_terms: string;
  default_validity_days: number;
  quote_prefix: string;
  invoice_prefix: string;
  vat_rate: number;
};

export async function saveSettings(p: SettingsPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("company_settings")
    .update({
      legal_name: p.legal_name,
      address: p.address || null,
      email: p.email || null,
      phone: p.phone || null,
      trn: p.trn || null,
      bank_account_name: p.bank_account_name || null,
      bank_account_no: p.bank_account_no || null,
      bank_iban: p.bank_iban || null,
      bank_currency: p.bank_currency || null,
      bank_name: p.bank_name || null,
      default_payment_terms: p.default_payment_terms || null,
      default_validity_days: Number(p.default_validity_days) || 0,
      quote_prefix: p.quote_prefix || null,
      invoice_prefix: p.invoice_prefix || null,
      vat_rate: Number(p.vat_rate) || 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw new Error(`Could not save settings: ${error.message}`);
  revalidatePath("/settings");
  revalidatePath("/quotes/new");
}
