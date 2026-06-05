import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ClientForm } from "@/components/ClientForm";

export default function NewClientPage() {
  return (
    <AppShell
      active="clients"
      title="New Client"
      action={<Link href="/clients" className="text-sm font-medium text-navy-600 hover:underline">← All clients</Link>}
    >
      <div className="max-w-3xl">
        <ClientForm />
      </div>
    </AppShell>
  );
}
