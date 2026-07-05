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
    const offset = window.matchMedia("(min-width: 1024px)").matches ? 16 : 88;
    const top = root.scrollTop + (elRect.top - rootRect.top) - offset;
    root.scrollTo({ top, behavior: "smooth" });
    setActive(id);
  }

  const filesSectionActive =
    active === "opp-files" || active.startsWith("files-");

  const sectionButtonClass = (sectionId: SectionId, isActive: boolean) =>
    cn(
      "shrink-0 rounded-lg font-medium transition",
      sectionId === "opp-files"
        ? filesSectionActive
          ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/30"
          : "text-slate-400 hover:bg-cyan-500/10 hover:text-slate-200"
        : isActive
          ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/30"
          : "text-slate-400 hover:bg-cyan-500/10 hover:text-slate-200",
    );

  const fileButtonClass = (itemId: string) =>
    cn(
      "shrink-0 rounded-md transition",
      active === itemId
        ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/20"
        : "text-slate-500 hover:bg-cyan-500/10 hover:text-slate-300",
    );

  return (
    <>
      {/* 手机端：自动换行，适配屏宽 */}
      <nav className="w-full min-w-0 lg:hidden">
        <div className="flex flex-wrap gap-1.5">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollTo(section.id)}
              className={cn(
                sectionButtonClass(section.id, active === section.id),
                "px-3 py-1.5 text-xs",
              )}
            >
              {section.label}
            </button>
          ))}
        </div>
        {filesSectionActive && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {FILE_NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(item.id)}
                className={cn(fileButtonClass(item.id), "px-2 py-1 text-[11px]")}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* 电脑端：左侧竖向导航 */}
      <nav className="hidden rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-lg backdrop-blur-md lg:block">
        <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-widest text-slate-500">
          快速导航
        </p>
        <div className="flex max-h-[calc(100vh-6rem)] flex-col gap-1 overflow-y-auto pb-1">
          {SECTIONS.map((section) => (
            <div key={section.id} className="shrink-0">
              <button
                type="button"
                onClick={() => scrollTo(section.id)}
                className={cn(
                  sectionButtonClass(section.id, active === section.id),
                  "w-full px-3 py-2 text-left text-sm",
                )}
              >
                {section.label}
              </button>
              {section.id === "opp-files" && (
                <div className="ml-2 mt-1 space-y-0.5 border-l border-white/10 pl-2">
                  {FILE_NAV_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollTo(item.id)}
                      className={cn(
                        fileButtonClass(item.id),
                        "w-full px-2 py-1.5 text-left text-xs",
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
    </>
  );
}
