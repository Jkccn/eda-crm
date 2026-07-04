"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DOCUMENT_CATEGORIES } from "@/lib/constants";

export const APP_MAIN_SCROLL_ID = "app-main-scroll";

const SECTIONS = [
  { id: "opp-overview", label: "概览" },
  { id: "opp-activities", label: "销售活动" },
  { id: "opp-quotes", label: "报价记录" },
  { id: "opp-execution", label: "合同与执行" },
  { id: "opp-finance", label: "财务与 License" },
  { id: "opp-files", label: "阶段文件" },
] as const;

const FILE_NAV_ITEMS = DOCUMENT_CATEGORIES.map((cat) => ({
  id: `files-${cat.key}`,
  label: cat.label,
}));

type SectionId = (typeof SECTIONS)[number]["id"];
type NavTargetId = SectionId | (typeof FILE_NAV_ITEMS)[number]["id"];

const OBSERVED_IDS: NavTargetId[] = [
  ...SECTIONS.map((s) => s.id),
  ...FILE_NAV_ITEMS.map((f) => f.id),
];

function getMainScrollRoot(): HTMLElement | null {
  return document.getElementById(APP_MAIN_SCROLL_ID);
}

export function OpportunitySectionNav() {
  const [active, setActive] = useState<NavTargetId>(SECTIONS[0].id);

  useEffect(() => {
    const root = getMainScrollRoot();
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActive(visible[0].target.id as NavTargetId);
        }
      },
      {
        root,
        rootMargin: "-12% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 1],
      },
    );

    for (const id of OBSERVED_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: NavTargetId) {
    const el = document.getElementById(id);
    const root = getMainScrollRoot();
    if (!el || !root) return;

    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const top = root.scrollTop + (elRect.top - rootRect.top) - 16;
    root.scrollTo({ top, behavior: "smooth" });
    setActive(id);
  }

  const filesSectionActive =
    active === "opp-files" || active.startsWith("files-");

  return (
    <nav className="rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-lg backdrop-blur-md">
      <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-widest text-slate-500">
        快速导航
      </p>
      <div className="flex max-h-[calc(100vh-8rem)] flex-col gap-1 overflow-y-auto pb-1 lg:max-h-[calc(100vh-6rem)]">
        {SECTIONS.map((section) => (
          <div key={section.id} className="shrink-0">
            <button
              type="button"
              onClick={() => scrollTo(section.id)}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                section.id === "opp-files"
                  ? filesSectionActive
                    ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/30"
                    : "text-slate-400 hover:bg-cyan-500/10 hover:text-slate-200"
                  : active === section.id
                    ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/30"
                    : "text-slate-400 hover:bg-cyan-500/10 hover:text-slate-200",
              )}
            >
              {section.label}
            </button>
            {section.id === "opp-files" && (
              <div className="mt-1 space-y-0.5 border-l border-white/10 pl-2 ml-2">
                {FILE_NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollTo(item.id)}
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left text-xs transition",
                      active === item.id
                        ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/20"
                        : "text-slate-500 hover:bg-cyan-500/10 hover:text-slate-300",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
