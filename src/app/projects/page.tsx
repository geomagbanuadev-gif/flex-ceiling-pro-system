import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LinkRow } from "@/components/LinkRow";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canSeeProjects } from "@/utils/profile";
import { money2 } from "@/utils/format";
import { Pagination } from "@/components/Pagination";
import { PAGE_SIZES } from "@/utils/pagination";
import { postgrestSearchTerm, uuidQueryParam } from "@/utils/query";

export default async function ProjectsPage(props: PageProps<"/projects">) {
  const profile = await getProfile();
  if (!profile || !canSeeProjects(profile.role)) redirect("/");
  const showFinance = profile.role === "super";
  const search = await props.searchParams;
  const q = postgrestSearchTerm(typeof search.q === "string" ? search.q : "");
  const status = typeof search.status === "string" ? search.status : "";
  const client = uuidQueryParam(search.client);
  const page = Math.max(1, parseInt(typeof search.page === "string" ? search.page : "") || 1);
  const requestedSize = parseInt(typeof search.size === "string" ? search.size : "") || 20;
  const pageSize = PAGE_SIZES.includes(requestedSize) ? requestedSize : 20;
  const from = (page - 1) * pageSize;
  const supabase = await createClient();
  let projectsQuery = showFinance
    ? supabase.from("project_finance_summary").select("*", { count: "exact" }).order("name").order("id").range(from, from + pageSize - 1)
    : supabase.from("projects").select("id, code, name, status, client_id, clients(name)", { count: "exact" }).order("name").order("id").range(from, from + pageSize - 1);
  if (q) projectsQuery = projectsQuery.or(`name.ilike.%${q}%,code.ilike.%${q}%`);
  if (status) projectsQuery = projectsQuery.eq("status", status);
  if (client) projectsQuery = projectsQuery.eq("client_id", client);
  const [{ data: projects, error, count }, { data: clients }] = await Promise.all([projectsQuery, supabase.from("clients").select("id, name").order("name")]);
  if (error) throw new Error(`Projects require read-performance.sql: ${error.message}`);
  const exportQuery = new URLSearchParams({ report: "projects" });
  for (const [key, value] of Object.entries({ q, status, client })) if (value) exportQuery.set(key, value);

  return (
    <AppShell active="projects" title="Projects" subtitle="Sales, purchases, expenses, and cash grouped by client job" action={<div className="flex gap-2">{showFinance && <><a href={`/finance/export?${exportQuery}&format=pdf`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">PDF</a><a href={`/finance/export?${exportQuery}&format=xlsx`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">Excel</a></>}<Link href="/projects/new" className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">+ New Project</Link></div>}>
      <form className="mb-5 flex flex-wrap gap-2"><input name="q" defaultValue={q} placeholder="Search projects…" className="min-w-56 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><select name="status" defaultValue={status} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><select name="client" defaultValue={client} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All clients</option>{(clients ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="rounded-xl bg-navy px-4 py-2 text-sm font-medium text-white">Apply filters</button><Link href="/projects" className="px-3 py-2 text-sm text-slate-500">Clear</Link>{pageSize !== 20 && <input type="hidden" name="size" value={pageSize} />}</form>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-[var(--shadow-card)] ring-1 ring-slate-200">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Project</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Status</th>{showFinance && <><th className="px-4 py-3 text-right">Net sales</th><th className="px-4 py-3 text-right">Costs</th><th className="px-4 py-3 text-right">Margin</th><th className="px-4 py-3 text-right">Net cash</th></>}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {(projects ?? []).map((project) => {
              const client = Array.isArray(project.clients) ? project.clients[0] : project.clients;
              const margin = Number(project.margin) || 0;
              return <LinkRow key={project.id} href={`/projects/${project.id}`} className="hover:bg-slate-50"><td className="px-4 py-3"><Link className="font-semibold text-navy" href={`/projects/${project.id}`}>{project.name}</Link>{project.code && <span className="ml-2 text-xs text-slate-400">{project.code}</span>}</td><td className="px-4 py-3 text-slate-600">{project.client ?? client?.name ?? "—"}</td><td className="px-4 py-3 capitalize text-slate-600">{project.status}</td>{showFinance && <><td className="px-4 py-3 text-right tabular-nums">{money2(project.net_sales)}</td><td className="px-4 py-3 text-right tabular-nums">{money2(project.costs)}</td><td className={`px-4 py-3 text-right font-semibold tabular-nums ${margin < 0 ? "text-red-600" : "text-green-700"}`}>{money2(margin)}</td><td className="px-4 py-3 text-right tabular-nums">{money2(project.net_cash)}</td></>}</LinkRow>;
            })}
            {!projects?.length && <tr><td colSpan={showFinance ? 7 : 3} className="px-4 py-12 text-center text-slate-500">No projects yet.</td></tr>}
          </tbody>
        </table>
      </div><Pagination page={page} pageSize={pageSize} total={count ?? 0} />
    </AppShell>
  );
}
