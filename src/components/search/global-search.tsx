"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, Building2, Briefcase, Headphones, Truck, User, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

type SearchResult = {
  customers: {
    id: string;
    accountName: string;
    englishName: string | null;
    region: string | null;
    _count: { opportunities: number };
  }[];
  opportunities: {
    id: string;
    name: string;
    stage: string;
    customer: { id: string; accountName: string };
  }[];
  supportCases: {
    id: string;
    title: string;
    status: string;
    customer: { id: string; accountName: string };
  }[];
  vendors: {
    id: string;
    name: string;
    productLines: string | null;
  }[];
  contacts: {
    id: string;
    name: string;
    email: string | null;
    customer: { id: string; accountName: string };
  }[];
  documents: {
    id: string;
    fileName: string;
    category: string;
    opportunity: {
      id: string;
      name: string;
      customer: { id: string; accountName: string };
    };
  }[];
};

const emptyResults: SearchResult = {
  customers: [],
  opportunities: [],
  supportCases: [],
  vendors: [],
  contacts: [],
  documents: [],
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        setResults(await res.json());
        setOpen(true);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const r = results || emptyResults;
  const hasResults =
    r.customers.length > 0 ||
    r.opportunities.length > 0 ||
    r.supportCases.length > 0 ||
    r.vendors.length > 0 ||
    r.contacts.length > 0 ||
    r.documents.length > 0;
  const isEmpty = results && !hasResults;

  return (
    <div ref={containerRef} className="relative px-4 pb-3 pt-2 md:px-0 md:pb-0 md:pt-0">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          placeholder="搜索客户、商机、工单、文件…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          className="pl-9"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute left-4 right-4 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-lg md:left-0 md:right-0">
          {isEmpty && (
            <p className="px-4 py-3 text-sm text-slate-400">无匹配结果</p>
          )}
          {r.customers.length > 0 && (
            <Section title="客户">
              {r.customers.map((c) => (
                <ResultLink
                  key={c.id}
                  href={`/customers/${c.id}`}
                  icon={Building2}
                  title={c.accountName}
                  subtitle={`${c.englishName ? `${c.englishName} · ` : ""}${c._count.opportunities} 个商机`}
                  onPick={() => { setOpen(false); setQuery(""); }}
                />
              ))}
            </Section>
          )}
          {r.opportunities.length > 0 && (
            <Section title="销售机会">
              {r.opportunities.map((o) => (
                <ResultLink
                  key={o.id}
                  href={`/opportunities/${o.id}`}
                  icon={Briefcase}
                  title={o.name}
                  subtitle={`${o.customer.accountName} · ${o.stage}`}
                  onPick={() => { setOpen(false); setQuery(""); }}
                />
              ))}
            </Section>
          )}
          {r.supportCases.length > 0 && (
            <Section title="技术支持">
              {r.supportCases.map((s) => (
                <ResultLink
                  key={s.id}
                  href="/support"
                  icon={Headphones}
                  title={s.title}
                  subtitle={`${s.customer.accountName} · ${s.status}`}
                  onPick={() => { setOpen(false); setQuery(""); }}
                />
              ))}
            </Section>
          )}
          {r.documents.length > 0 && (
            <Section title="上传文件">
              {r.documents.map((d) => (
                <ResultLink
                  key={d.id}
                  href={`/opportunities/${d.opportunity.id}`}
                  icon={FileText}
                  title={d.fileName}
                  subtitle={`${d.opportunity.customer.accountName} · ${d.opportunity.name} · ${d.category}`}
                  onPick={() => { setOpen(false); setQuery(""); }}
                />
              ))}
            </Section>
          )}
          {r.contacts.length > 0 && (
            <Section title="联系人">
              {r.contacts.map((c) => (
                <ResultLink
                  key={c.id}
                  href={`/customers/${c.customer.id}`}
                  icon={User}
                  title={c.name}
                  subtitle={`${c.customer.accountName}${c.email ? ` · ${c.email}` : ""}`}
                  onPick={() => { setOpen(false); setQuery(""); }}
                />
              ))}
            </Section>
          )}
          {r.vendors.length > 0 && (
            <Section title="供应商">
              {r.vendors.map((v) => (
                <ResultLink
                  key={v.id}
                  href="/vendors"
                  icon={Truck}
                  title={v.name}
                  subtitle={v.productLines || ""}
                  onPick={() => { setOpen(false); setQuery(""); }}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1">
      <p className="px-2 py-1 text-xs font-medium text-slate-400">{title}</p>
      {children}
    </div>
  );
}

function ResultLink({
  href,
  icon: Icon,
  title,
  subtitle,
  onPick,
}: {
  href: string;
  icon: typeof Building2;
  title: string;
  subtitle: string;
  onPick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onPick}
      className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
    >
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{title}</p>
        {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
      </div>
    </Link>
  );
}
