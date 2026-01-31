import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Aperture,
  Archive,
  BarChart3,
  Bookmark,
  Command,
  FileUp,
  Filter,
  Hash,
  Home,
  Layers,
  LineChart,
  Link as LinkIcon,
  MapPin,
  MessageSquareText,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Tag,
  Timer,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type NavKey =
  | "dashboard"
  | "timeline"
  | "imports"
  | "search"
  | "people"
  | "tags"
  | "insights"
  | "studio"
  | "exports"
  | "settings"
  | "security";

type Memory = {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel?: string;
  snippet: string;
  source: "Messages" | "Photos" | "Notes" | "Events" | "Snapshot";
  tags: { id: string; name: string; color: "c" | "v" | "m" | "g" | "y" }[];
  people: string[];
  location?: string;
  pinned?: boolean;
};

const TAG_COLOR: Record<Memory["tags"][number]["color"], string> = {
  c: "bg-[hsl(var(--chart-1))]",
  v: "bg-[hsl(var(--chart-2))]",
  m: "bg-[hsl(var(--chart-3))]",
  g: "bg-[hsl(var(--chart-4))]",
  y: "bg-[hsl(var(--chart-5))]",
};

const NAV: { key: NavKey; label: string; icon: any }[] = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "timeline", label: "Timeline", icon: Archive },
  { key: "imports", label: "Imports", icon: FileUp },
  { key: "search", label: "Search", icon: Search },
  { key: "people", label: "People", icon: Users },
  { key: "tags", label: "Tags", icon: Hash },
  { key: "insights", label: "Insights", icon: LineChart },
  { key: "studio", label: "Studio", icon: Sparkles },
  { key: "exports", label: "Exports", icon: Layers },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "security", label: "Security", icon: Shield },
];

const MOCK_MEMORIES: Memory[] = [
  {
    id: "m-1021",
    title: "Blue hour walk — the city felt unusually quiet",
    dateLabel: "Jan 18, 2026",
    timeLabel: "9:41 PM",
    snippet:
      "Streetlights buzzing. A message from Mira landed mid-step: ‘Are you still up?’ I remember thinking the night looked like a film still.",
    source: "Notes",
    tags: [
      { id: "t-1", name: "City", color: "c" },
      { id: "t-2", name: "Mira", color: "v" },
    ],
    people: ["Mira"],
    location: "Downtown",
  },
  {
    id: "m-1022",
    title: "Message thread: planning the weekend trip",
    dateLabel: "Jan 19, 2026",
    timeLabel: "2:12 PM",
    snippet:
      "A messy braid of screenshots, links, and ‘what if we…’ — it reads like excitement trying to become a plan.",
    source: "Messages",
    tags: [
      { id: "t-3", name: "Trips", color: "y" },
      { id: "t-4", name: "Plans", color: "g" },
    ],
    people: ["Mira", "Jon"],
  },
  {
    id: "m-1023",
    title: "Photo moment: neon reflections",
    dateLabel: "Jan 22, 2026",
    timeLabel: "7:06 PM",
    snippet:
      "The glass caught the signage like it was painted on. This is the frame that always pulls me back into that hour.",
    source: "Photos",
    tags: [
      { id: "t-5", name: "Neon", color: "m" },
      { id: "t-1", name: "City", color: "c" },
    ],
    people: ["Mira"],
    location: "Station District",
    pinned: true,
  },
  {
    id: "m-1024",
    title: "Snapshot: January’s pacing and mood",
    dateLabel: "Jan 28, 2026",
    snippet:
      "You moved between bursts of social energy and long, quiet evenings. The most frequent thread: city walks + planning + reconnecting.",
    source: "Snapshot",
    tags: [
      { id: "t-6", name: "Snapshot", color: "v" },
      { id: "t-7", name: "Mood", color: "g" },
    ],
    people: ["Mira"],
  },
];

function Chip({
  label,
  icon,
  tone = "muted",
  testId,
}: {
  label: string;
  icon?: React.ReactNode;
  tone?: "muted" | "info" | "warn" | "ok";
  testId: string;
}) {
  const toneClass =
    tone === "ok"
      ? "border-[rgba(46,229,157,0.35)] bg-[rgba(46,229,157,0.08)] text-[rgba(255,255,255,0.86)]"
      : tone === "warn"
        ? "border-[rgba(255,194,71,0.35)] bg-[rgba(255,194,71,0.08)] text-[rgba(255,255,255,0.86)]"
        : tone === "info"
          ? "border-[rgba(53,211,255,0.35)] bg-[rgba(53,211,255,0.08)] text-[rgba(255,255,255,0.86)]"
          : "border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.82)]";

  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.02em]",
        toneClass,
      )}
    >
      {icon ? <span className="text-white/70">{icon}</span> : null}
      <span className="leading-none">{label}</span>
    </span>
  );
}

function TagChip({
  name,
  color,
  testId,
}: {
  name: string;
  color: Memory["tags"][number]["color"];
  testId: string;
}) {
  return (
    <span
      data-testid={testId}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/80"
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", TAG_COLOR[color])} />
      <span className="leading-none">{name}</span>
    </span>
  );
}

function MemoryCard({
  memory,
  selected,
  onSelect,
}: {
  memory: Memory;
  selected: boolean;
  onSelect: () => void;
}) {
  const accent = memory.pinned
    ? "before:bg-[hsl(var(--primary))]"
    : selected
      ? "before:bg-[rgba(255,255,255,0.22)]"
      : "before:bg-transparent";

  return (
    <button
      type="button"
      data-testid={`card-memory-${memory.id}`}
      onClick={onSelect}
      className={cn(
        "group relative w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left shadow-[var(--shadow-xs)] transition",
        "hover:-translate-y-[2px] hover:border-white/16 hover:bg-white/[0.05]",
        selected ? "memoir-ring" : "",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute left-0 top-4 h-[calc(100%-2rem)] w-[2px] rounded-full",
        )}
      >
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-0 transition-opacity group-hover:opacity-100",
            accent.replace("before:", ""),
          )}
        />
      </span>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {memory.pinned ? (
              <Star className="h-4 w-4 text-[hsl(var(--primary))]" strokeWidth={1.75} />
            ) : (
              <Bookmark
                className="h-4 w-4 text-white/40 group-hover:text-white/55"
                strokeWidth={1.75}
              />
            )}
            <h3
              data-testid={`text-memory-title-${memory.id}`}
              className="truncate text-[14px] font-semibold text-white/90"
            >
              {memory.title}
            </h3>
          </div>

          <p
            data-testid={`text-memory-snippet-${memory.id}`}
            className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-white/60"
          >
            {memory.snippet}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Chip
            testId={`chip-date-${memory.id}`}
            label={memory.timeLabel ? `${memory.dateLabel} · ${memory.timeLabel}` : memory.dateLabel}
            icon={<Timer className="h-3.5 w-3.5" strokeWidth={1.75} />}
          />
          <Chip
            testId={`chip-source-${memory.id}`}
            label={memory.source}
            icon={<MessageSquareText className="h-3.5 w-3.5" strokeWidth={1.75} />}
            tone={memory.source === "Snapshot" ? "info" : "muted"}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {memory.tags.slice(0, 3).map((t) => (
          <TagChip
            key={t.id}
            name={t.name}
            color={t.color}
            testId={`chip-tag-${t.id}-${memory.id}`}
          />
        ))}
        {memory.tags.length > 3 ? (
          <span
            data-testid={`text-tag-overflow-${memory.id}`}
            className="text-[11px] font-medium text-white/45"
          >
            +{memory.tags.length - 3}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[12px] text-white/55">
          <Users className="h-4 w-4 text-white/40" strokeWidth={1.75} />
          <span data-testid={`text-people-${memory.id}`} className="truncate">
            {memory.people.join(", ")}
          </span>
        </div>

        {memory.location ? (
          <div className="flex shrink-0 items-center gap-1.5 text-[12px] text-white/50">
            <MapPin className="h-4 w-4 text-white/35" strokeWidth={1.75} />
            <span data-testid={`text-location-${memory.id}`}>{memory.location}</span>
          </div>
        ) : null}
      </div>
    </button>
  );
}

function Sidebar({
  active,
  onNavigate,
  collapsed,
  onToggleCollapsed,
}: {
  active: NavKey;
  onNavigate: (k: NavKey) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <div
      className={cn(
        "memoir-noise relative h-full border-r border-white/10 bg-[hsl(var(--sidebar))]",
        collapsed ? "w-[72px]" : "w-[280px]",
      )}
    >
      <div className="flex h-full flex-col">
        <div className={cn("p-4", collapsed ? "px-3" : "")}
          >
          <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "")}
          >
            <div
              data-testid="img-app-logo"
              className="relative grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-[var(--shadow-xs)]"
            >
              <Aperture className="h-5 w-5 text-white/85" strokeWidth={1.75} />
              <span className="pointer-events-none absolute -inset-1 rounded-[18px] bg-[linear-gradient(90deg,#35D3FF_0%,#7C4DFF_50%,#FF3DBD_100%)] opacity-[0.10] blur-[10px]" />
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <div
                  data-testid="text-app-name"
                  className="text-[14px] font-semibold text-white/90"
                >
                  Memoir.ai
                </div>
                <div
                  data-testid="text-library-name"
                  className="mt-0.5 truncate text-[12px] text-white/55"
                >
                  Library · Personal Archive
                </div>
              </div>
            ) : null}
          </div>

          {!collapsed ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-white/80">Status</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Chip
                      testId="chip-status-indexing"
                      label="Indexing"
                      icon={<Activity className="h-3.5 w-3.5" strokeWidth={1.75} />}
                      tone="ok"
                    />
                    <Chip
                      testId="chip-status-sync"
                      label="Sync"
                      icon={<LinkIcon className="h-3.5 w-3.5" strokeWidth={1.75} />}
                      tone="info"
                    />
                    <Chip
                      testId="chip-status-lastimport"
                      label="Last import · 2d"
                      icon={<FileUp className="h-3.5 w-3.5" strokeWidth={1.75} />}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className={cn("px-3", collapsed ? "px-2" : "px-3")}>
          <div className="mb-3 text-[11px] font-medium tracking-[0.12em] text-white/40">
            {!collapsed ? "NAV" : ""}
          </div>
          <div className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  data-testid={`nav-${item.key}`}
                  onClick={() => onNavigate(item.key)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition",
                    isActive
                      ? "border-white/14 bg-white/[0.06]"
                      : "border-transparent hover:border-white/10 hover:bg-white/[0.04]",
                    collapsed ? "justify-center" : "",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5",
                      isActive ? "text-white/85" : "text-white/55 group-hover:text-white/75",
                    )}
                    strokeWidth={1.75}
                  />
                  {!collapsed ? (
                    <span
                      className={cn(
                        "text-[13px] font-medium",
                        isActive ? "text-white/85" : "text-white/65 group-hover:text-white/85",
                      )}
                    >
                      {item.label}
                    </span>
                  ) : null}
                  {isActive && !collapsed ? (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[linear-gradient(90deg,#35D3FF_0%,#7C4DFF_50%,#FF3DBD_100%)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-auto p-3">
          <button
            type="button"
            data-testid="button-sidebar-collapse"
            onClick={onToggleCollapsed}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] font-medium text-white/75 transition hover:bg-white/[0.05]",
              collapsed ? "justify-center px-0" : "",
            )}
          >
            <PanelRightClose
              className={cn("h-4 w-4", collapsed ? "hidden" : "")}
              strokeWidth={1.75}
            />
            <PanelRightOpen
              className={cn("h-4 w-4", collapsed ? "" : "hidden")}
              strokeWidth={1.75}
            />
            {!collapsed ? "Collapse" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function TopBar({
  query,
  setQuery,
  onNew,
  onCommand,
}: {
  query: string;
  setQuery: (v: string) => void;
  onNew: () => void;
  onCommand: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(10,10,18,0.72)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-6 py-4">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            strokeWidth={1.75}
          />
          <Input
            data-testid="input-global-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find memory, date, tag…"
            className={cn(
              "h-11 rounded-xl border-white/10 bg-white/[0.04] pl-9 text-[14px] text-white/85 placeholder:text-white/40",
              "focus-visible:ring-[hsl(var(--ring))]",
            )}
          />
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="secondary"
            data-testid="button-filter-people"
            className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.06]"
          >
            <Filter className="mr-2 h-4 w-4" strokeWidth={1.75} />
            People
          </Button>
          <Button
            variant="secondary"
            data-testid="button-filter-locations"
            className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.06]"
          >
            <MapPin className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Locations
          </Button>
          <Button
            variant="secondary"
            data-testid="button-filter-topics"
            className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.06]"
          >
            <Tag className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Topics
          </Button>
        </div>

        <Button
          data-testid="button-new"
          onClick={onNew}
          className="h-11 rounded-xl bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)] hover:bg-[hsl(19_100%_62%)]"
        >
          New
        </Button>
        <Button
          variant="secondary"
          data-testid="button-command"
          onClick={onCommand}
          className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.06]"
        >
          <Command className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Cmd K
        </Button>
      </div>
    </div>
  );
}

function Inspector({
  open,
  onToggle,
  memory,
}: {
  open: boolean;
  onToggle: () => void;
  memory?: Memory;
}) {
  return (
    <div
      className={cn(
        "relative h-full border-l border-white/10 bg-[rgba(13,14,22,0.78)] backdrop-blur-xl",
        open ? "w-[380px]" : "w-[56px]",
      )}
    >
      <div className="flex h-full flex-col">
        <div className={cn("flex items-center gap-2 border-b border-white/10 p-3", open ? "" : "justify-center")}
        >
          <button
            type="button"
            data-testid="button-inspector-toggle"
            onClick={onToggle}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80 transition hover:bg-white/[0.06]",
            )}
          >
            {open ? (
              <PanelRightClose className="h-4.5 w-4.5" strokeWidth={1.75} />
            ) : (
              <PanelRightOpen className="h-4.5 w-4.5" strokeWidth={1.75} />
            )}
          </button>

          {open ? (
            <div className="min-w-0">
              <div data-testid="text-inspector-title" className="text-[13px] font-semibold text-white/85">
                Inspector
              </div>
              <div data-testid="text-inspector-sub" className="mt-0.5 text-[12px] text-white/45">
                Details · AI · Links · History
              </div>
            </div>
          ) : null}
        </div>

        {open ? (
          <ScrollArea className="flex-1">
            <div className="p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={memory?.id ?? "none"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  {!memory ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-2 text-white/80">
                        <Aperture className="h-4.5 w-4.5" strokeWidth={1.75} />
                        <div data-testid="text-nothing-selected" className="text-[13px] font-semibold">
                          Nothing selected
                        </div>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-white/55">
                        Select a memory in the center column to see provenance, metadata, and AI tools.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Card className="rounded-2xl border-white/10 bg-white/[0.03] p-4 shadow-[var(--shadow-xs)]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Aperture className="h-4.5 w-4.5 text-white/70" strokeWidth={1.75} />
                              <div
                                data-testid="text-selected-title"
                                className="truncate text-[14px] font-semibold text-white/90"
                              >
                                {memory.title}
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Chip
                                testId="chip-selected-date"
                                label={
                                  memory.timeLabel
                                    ? `${memory.dateLabel} · ${memory.timeLabel}`
                                    : memory.dateLabel
                                }
                                icon={<Timer className="h-3.5 w-3.5" strokeWidth={1.75} />}
                              />
                              <Chip
                                testId="chip-selected-source"
                                label={memory.source}
                                icon={<MessageSquareText className="h-3.5 w-3.5" strokeWidth={1.75} />}
                                tone={memory.source === "Snapshot" ? "info" : "muted"}
                              />
                            </div>
                          </div>
                          {memory.pinned ? (
                            <Badge
                              data-testid="badge-selected-pinned"
                              className="rounded-full bg-[rgba(255,107,44,0.14)] text-white/85"
                            >
                              Pinned
                            </Badge>
                          ) : null}
                        </div>

                        <p
                          data-testid="text-selected-snippet"
                          className="mt-3 text-[13px] leading-relaxed text-white/60"
                        >
                          {memory.snippet}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {memory.tags.map((t) => (
                            <TagChip
                              key={t.id}
                              name={t.name}
                              color={t.color}
                              testId={`chip-selected-tag-${t.id}`}
                            />
                          ))}
                        </div>
                      </Card>

                      <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 rounded-xl border border-white/10 bg-white/[0.03]">
                          <TabsTrigger
                            data-testid="tab-details"
                            value="details"
                            className="rounded-lg text-[12px]"
                          >
                            Details
                          </TabsTrigger>
                          <TabsTrigger
                            data-testid="tab-ai"
                            value="ai"
                            className="rounded-lg text-[12px]"
                          >
                            AI
                          </TabsTrigger>
                          <TabsTrigger
                            data-testid="tab-links"
                            value="links"
                            className="rounded-lg text-[12px]"
                          >
                            Links
                          </TabsTrigger>
                          <TabsTrigger
                            data-testid="tab-history"
                            value="history"
                            className="rounded-lg text-[12px]"
                          >
                            History
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="mt-3 space-y-3">
                          <Card className="rounded-2xl border-white/10 bg-white/[0.03] p-4">
                            <div className="text-[12px] font-semibold text-white/80">Metadata</div>
                            <div className="mt-3 space-y-2 text-[13px] text-white/60">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-white/45">People</span>
                                <span data-testid="text-selected-people" className="text-white/75">
                                  {memory.people.join(", ")}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-white/45">Location</span>
                                <span data-testid="text-selected-location" className="text-white/75">
                                  {memory.location ?? "—"}
                                </span>
                              </div>
                            </div>
                          </Card>

                          <Card className="rounded-2xl border-white/10 bg-white/[0.03] p-4">
                            <div className="text-[12px] font-semibold text-white/80">Provenance</div>
                            <div className="mt-3 space-y-2 text-[13px] text-white/60">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-white/45">Source</span>
                                <span data-testid="text-provenance-source" className="text-white/75">
                                  {memory.source}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-white/45">Imported</span>
                                <span data-testid="text-provenance-imported" className="text-white/75">
                                  Jan 21, 2026
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-white/45">Transforms</span>
                                <span data-testid="text-provenance-transforms" className="text-white/75">
                                  normalize → index → entity extract
                                </span>
                              </div>
                            </div>
                          </Card>
                        </TabsContent>

                        <TabsContent value="ai" className="mt-3 space-y-3">
                          <Card className="rounded-2xl border-white/10 bg-white/[0.03] p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-[12px] font-semibold text-white/80">AI Tools</div>
                              <Chip
                                testId="chip-ai-mode"
                                label="Cited · Versioned"
                                icon={<Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />}
                                tone="info"
                              />
                            </div>
                            <div className="mt-3 grid gap-2">
                              <Button
                                data-testid="button-ai-summarize"
                                className="h-11 justify-start rounded-xl bg-white/[0.04] text-white/85 hover:bg-white/[0.06]"
                                variant="secondary"
                              >
                                /summarize
                              </Button>
                              <Button
                                data-testid="button-ai-expand"
                                className="h-11 justify-start rounded-xl bg-white/[0.04] text-white/85 hover:bg-white/[0.06]"
                                variant="secondary"
                              >
                                /expand
                              </Button>
                              <Button
                                data-testid="button-ai-rewrite"
                                className="h-11 justify-start rounded-xl bg-white/[0.04] text-white/85 hover:bg-white/[0.06]"
                                variant="secondary"
                              >
                                /rewrite
                              </Button>
                              <Button
                                data-testid="button-ai-tag"
                                className="h-11 justify-start rounded-xl bg-white/[0.04] text-white/85 hover:bg-white/[0.06]"
                                variant="secondary"
                              >
                                /tag
                              </Button>
                            </div>
                          </Card>
                        </TabsContent>

                        <TabsContent value="links" className="mt-3 space-y-3">
                          <Card className="rounded-2xl border-white/10 bg-white/[0.03] p-4">
                            <div className="text-[12px] font-semibold text-white/80">Related</div>
                            <p className="mt-2 text-[13px] leading-relaxed text-white/55">
                              Related memories are inferred from co-occurring people, tags, and time proximity.
                            </p>
                            <div className="mt-3 space-y-2">
                              {MOCK_MEMORIES.filter((m) => m.id !== memory.id)
                                .slice(0, 3)
                                .map((m) => (
                                  <div
                                    key={m.id}
                                    data-testid={`row-related-${m.id}`}
                                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate text-[13px] font-medium text-white/80">
                                        {m.title}
                                      </div>
                                      <div className="mt-0.5 text-[12px] text-white/45">{m.dateLabel}</div>
                                    </div>
                                    <ArrowIcon />
                                  </div>
                                ))}
                            </div>
                          </Card>
                        </TabsContent>

                        <TabsContent value="history" className="mt-3 space-y-3">
                          <Card className="rounded-2xl border-white/10 bg-white/[0.03] p-4">
                            <div className="text-[12px] font-semibold text-white/80">Version history</div>
                            <div className="mt-3 space-y-2">
                              {[3, 2, 1].map((v) => (
                                <div
                                  key={v}
                                  data-testid={`row-version-${v}`}
                                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
                                >
                                  <div className="text-[13px] text-white/70">v{v}</div>
                                  <div className="text-[12px] text-white/45">Jan {20 + v}, 2026</div>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </TabsContent>
                      </Tabs>

                      <Card className="rounded-2xl border-white/10 bg-white/[0.03] p-4">
                        <div className="text-[12px] font-semibold text-white/80">Actions</div>
                        <div className="mt-3 grid gap-2">
                          <Button
                            data-testid="button-edit"
                            variant="secondary"
                            className="h-11 justify-start rounded-xl border-white/10 bg-white/[0.04] text-white/85 hover:bg-white/[0.06]"
                          >
                            Edit
                          </Button>
                          <Button
                            data-testid="button-merge"
                            variant="secondary"
                            className="h-11 justify-start rounded-xl border-white/10 bg-white/[0.04] text-white/85 hover:bg-white/[0.06]"
                          >
                            Merge
                          </Button>
                          <Button
                            data-testid="button-export"
                            variant="secondary"
                            className="h-11 justify-start rounded-xl border-white/10 bg-white/[0.04] text-white/85 hover:bg-white/[0.06]"
                          >
                            Export
                          </Button>
                          <Button
                            data-testid="button-delete"
                            variant="destructive"
                            className="h-11 justify-start rounded-xl"
                          >
                            Delete
                          </Button>
                        </div>
                      </Card>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>
        ) : null}
      </div>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-white/45"
      aria-hidden="true"
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashboardContent({
  memories,
  selectedId,
  onSelect,
}: {
  memories: Memory[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const recents = memories.slice(0, 3);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[var(--shadow-md)] memoir-noise">
        <div className="pointer-events-none absolute -right-24 -top-20 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(124,77,255,0.42),rgba(53,211,255,0.0)_70%)] blur-2xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-28 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,61,189,0.22),rgba(255,61,189,0.0)_70%)] blur-2xl" />

        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[60ch]">
            <div
              data-testid="text-dashboard-kicker"
              className="text-[11px] font-medium tracking-[0.20em] text-white/45"
            >
              ARCHIVE VAULT
            </div>
            <h1
              data-testid="text-dashboard-title"
              className="mt-2 text-[28px] font-semibold leading-tight text-white/92"
            >
              Your life, structured.
              <span className="block bg-[linear-gradient(90deg,#35D3FF_0%,#7C4DFF_50%,#FF3DBD_100%)] bg-clip-text text-transparent">
                Browse. Search. Craft snapshots.
              </span>
            </h1>
            <p
              data-testid="text-dashboard-subtitle"
              className="mt-3 text-[14px] leading-relaxed text-white/60"
            >
              Memoir.ai turns scattered exports into a coherent timeline—so you can revisit moments, see patterns, and generate citations you can trust.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              data-testid="button-add-memory"
              className="h-11 rounded-xl bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)] hover:bg-[hsl(19_100%_62%)]"
            >
              <Sparkles className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Add memory
            </Button>
            <Button
              data-testid="button-import"
              variant="secondary"
              className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.06]"
            >
              <FileUp className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Import
            </Button>
            <Button
              data-testid="button-prompt-ai"
              variant="secondary"
              className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.06]"
            >
              <Command className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Prompt AI
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[12px] font-semibold text-white/80">Recent moments</div>
              <button
                type="button"
                data-testid="link-view-all-recents"
                className="text-[12px] font-medium text-white/55 hover:text-white/75"
              >
                View all
              </button>
            </div>
            <div className="grid gap-3">
              {recents.map((m) => (
                <MemoryCard
                  key={m.id}
                  memory={m}
                  selected={selectedId === m.id}
                  onSelect={() => onSelect(m.id)}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[12px] font-semibold text-white/80">Insights</div>
              <button
                type="button"
                data-testid="link-open-insights"
                className="text-[12px] font-medium text-white/55 hover:text-white/75"
              >
                Open
              </button>
            </div>

            <div className="grid gap-3">
              <Card className="rounded-2xl border-white/10 bg-white/[0.03] p-4 shadow-[var(--shadow-xs)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4.5 w-4.5 text-white/70" strokeWidth={1.75} />
                    <div className="text-[13px] font-semibold text-white/85">Mood trend</div>
                  </div>
                  <Badge
                    data-testid="badge-mood"
                    className="rounded-full bg-white/[0.06] text-white/75"
                  >
                    Neutral → Positive
                  </Badge>
                </div>
                <div className="mt-3 h-[88px] rounded-xl border border-white/10 bg-[linear-gradient(90deg,rgba(53,211,255,0.12),rgba(124,77,255,0.10),rgba(255,61,189,0.08))]" />
                <div className="mt-3 text-[12px] text-white/55">
                  Most active tags: <span className="text-white/75">City</span>,{" "}
                  <span className="text-white/75">Trips</span>,{" "}
                  <span className="text-white/75">Plans</span>
                </div>
              </Card>

              <Card className="rounded-2xl border-white/10 bg-white/[0.03] p-4 shadow-[var(--shadow-xs)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4.5 w-4.5 text-white/70" strokeWidth={1.75} />
                    <div className="text-[13px] font-semibold text-white/85">Quick actions</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    data-testid="button-quick-new"
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[13px] text-white/75 transition hover:bg-white/[0.05]"
                  >
                    <span className="flex items-center gap-2">
                      <Aperture className="h-4 w-4 text-white/60" strokeWidth={1.75} />
                      New memory
                    </span>
                    <ArrowIcon />
                  </button>
                  <button
                    type="button"
                    data-testid="button-quick-import"
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[13px] text-white/75 transition hover:bg-white/[0.05]"
                  >
                    <span className="flex items-center gap-2">
                      <FileUp className="h-4 w-4 text-white/60" strokeWidth={1.75} />
                      Import source
                    </span>
                    <ArrowIcon />
                  </button>
                  <button
                    type="button"
                    data-testid="button-quick-snapshot"
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[13px] text-white/75 transition hover:bg-white/[0.05]"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-white/60" strokeWidth={1.75} />
                      Generate snapshot
                    </span>
                    <ArrowIcon />
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineContent({
  memories,
  selectedId,
  onSelect,
}: {
  memories: Memory[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const byDate = new Map<string, Memory[]>();
    for (const m of memories) {
      if (!byDate.has(m.dateLabel)) byDate.set(m.dateLabel, []);
      byDate.get(m.dateLabel)!.push(m);
    }
    return Array.from(byDate.entries());
  }, [memories]);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <div
            data-testid="text-timeline-kicker"
            className="text-[11px] font-medium tracking-[0.20em] text-white/45"
          >
            UNIFIED TIMELINE
          </div>
          <h2
            data-testid="text-timeline-title"
            className="mt-2 text-[22px] font-semibold text-white/92"
          >
            Chronological stream
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            data-testid="button-density"
            variant="secondary"
            className="h-10 rounded-xl border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.06]"
          >
            <Moon className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Cozy
          </Button>
          <Button
            data-testid="button-jump-today"
            className="h-10 rounded-xl bg-[hsl(var(--primary))] text-white hover:bg-[hsl(19_100%_62%)]"
          >
            Jump
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <Card className="memoir-noise lg:col-span-12 rounded-3xl border-white/10 bg-white/[0.02] p-6">
          <div className="relative">
            <div className="pointer-events-none absolute left-4 top-0 h-full w-px bg-white/10" />
            <div className="space-y-6">
              {groups.map(([date, items]) => (
                <div key={date} className="relative">
                  <div
                    data-testid={`text-date-header-${date.replaceAll(" ", "-")}`}
                    className="sticky top-[84px] z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(18,19,38,0.72)] px-3 py-1 text-[11px] font-medium text-white/70 backdrop-blur-xl"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
                    {date}
                  </div>
                  <div className="mt-3 grid gap-3 pl-8">
                    {items.map((m) => (
                      <MemoryCard
                        key={m.id}
                        memory={m}
                        selected={selectedId === m.id}
                        onSelect={() => onSelect(m.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PlaceholderContent({
  title,
  subtitle,
  icon,
  primaryAction,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  primaryAction?: { label: string; testId: string };
}) {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-[var(--shadow-md)] memoir-noise">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
            {icon}
          </div>
          <div>
            <div data-testid="text-placeholder-title" className="text-[18px] font-semibold text-white/90">
              {title}
            </div>
            <div data-testid="text-placeholder-sub" className="mt-1 text-[13px] text-white/55">
              {subtitle}
            </div>
          </div>
        </div>

        <Separator className="my-6 bg-white/10" />

        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              data-testid={`card-placeholder-${i}`}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="h-2 w-16 rounded-full bg-white/10" />
              <div className="mt-3 h-2 w-28 rounded-full bg-white/10" />
              <div className="mt-3 h-2 w-20 rounded-full bg-white/10" />
            </div>
          ))}
        </div>

        {primaryAction ? (
          <div className="mt-6">
            <Button
              data-testid={primaryAction.testId}
              className="h-11 rounded-xl bg-[hsl(var(--primary))] text-white hover:bg-[hsl(19_100%_62%)]"
            >
              {primaryAction.label}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function MemoirApp() {
  const [active, setActive] = useState<NavKey>("dashboard");
  const [query, setQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | undefined>(MOCK_MEMORIES[2]?.id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_MEMORIES;
    return MOCK_MEMORIES.filter((m) => {
      const hay = [m.title, m.snippet, m.dateLabel, m.source, m.people.join(" "), m.tags.map((t) => t.name).join(" ")]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const selected = useMemo(
    () => MOCK_MEMORIES.find((m) => m.id === selectedId),
    [selectedId],
  );

  return (
    <div className="memoir-bg min-h-[100dvh]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1600px] overflow-hidden md:gap-0">
        <div className="hidden md:block">
          <Sidebar
            active={active}
            onNavigate={setActive}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((s) => !s)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            query={query}
            setQuery={setQuery}
            onNew={() => setSelectedId(MOCK_MEMORIES[0]?.id)}
            onCommand={() => setActive("search")}
          />

          <div className="min-h-0 flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {active === "dashboard" ? (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <DashboardContent
                    memories={filtered}
                    selectedId={selectedId}
                    onSelect={(id) => setSelectedId(id)}
                  />
                </motion.div>
              ) : null}

              {active === "timeline" ? (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <TimelineContent
                    memories={filtered}
                    selectedId={selectedId}
                    onSelect={(id) => setSelectedId(id)}
                  />
                </motion.div>
              ) : null}

              {active !== "dashboard" && active !== "timeline" ? (
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <PlaceholderContent
                    title={NAV.find((n) => n.key === active)?.label ?? "Screen"}
                    subtitle="This is a mockup surface. Next we’ll flesh out the real interactions and layouts for this module."
                    icon={<OrbitIcon />}
                    primaryAction={{ label: "Design this screen", testId: "button-design-screen" }}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <MobileNav
            active={active}
            onNavigate={setActive}
            onToggleInspector={() => setInspectorOpen((s) => !s)}
            inspectorOpen={inspectorOpen}
          />
        </div>

        <div className="hidden xl:block">
          <Inspector
            open={inspectorOpen}
            onToggle={() => setInspectorOpen((s) => !s)}
            memory={selected}
          />
        </div>
      </div>

      <MobileInspector
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        memory={selected}
      />
    </div>
  );
}

function MobileNav({
  active,
  onNavigate,
  onToggleInspector,
  inspectorOpen,
}: {
  active: NavKey;
  onNavigate: (k: NavKey) => void;
  onToggleInspector: () => void;
  inspectorOpen: boolean;
}) {
  const items: { key: NavKey; label: string; icon: any }[] = [
    { key: "dashboard", label: "Home", icon: Home },
    { key: "timeline", label: "Timeline", icon: Archive },
    { key: "search", label: "Search", icon: Search },
    { key: "imports", label: "Import", icon: FileUp },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="sticky bottom-0 z-30 border-t border-white/10 bg-[rgba(10,10,18,0.70)] backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-3 py-2">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              type="button"
              data-testid={`nav-mobile-${it.key}`}
              onClick={() => onNavigate(it.key)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition",
                isActive ? "text-white/90" : "text-white/55 hover:text-white/80",
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-white/90" : "text-white/55")} strokeWidth={1.75} />
              <span className="truncate">{it.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          data-testid="button-mobile-inspector"
          onClick={onToggleInspector}
          className={cn(
            "ml-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80",
            inspectorOpen ? "memoir-ring" : "hover:bg-white/[0.06]",
          )}
        >
          {inspectorOpen ? (
            <PanelRightClose className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <PanelRightOpen className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>
      </div>
    </div>
  );
}

function MobileInspector({
  open,
  onClose,
  memory,
}: {
  open: boolean;
  onClose: () => void;
  memory?: Memory;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="mobile-inspector"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm xl:hidden"
        >
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 18, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute bottom-0 left-0 right-0 max-h-[86dvh] overflow-hidden rounded-t-3xl border border-white/10 bg-[rgba(13,14,22,0.86)] shadow-[var(--shadow-xl)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <div data-testid="text-mobile-inspector-title" className="text-[13px] font-semibold text-white/85">
                  Inspector
                </div>
                <div className="mt-0.5 truncate text-[12px] text-white/45">
                  {memory ? memory.title : "Nothing selected"}
                </div>
              </div>
              <button
                type="button"
                data-testid="button-mobile-inspector-close"
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/85"
              >
                <PanelRightClose className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="max-h-[calc(86dvh-56px)] overflow-y-auto">
              <Inspector open={true} onToggle={onClose} memory={memory} />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function OrbitIcon() {
  return (
    <div className="relative">
      <div className="h-6 w-6 rounded-full bg-[linear-gradient(90deg,#35D3FF_0%,#7C4DFF_50%,#FF3DBD_100%)]" />
      <div className="pointer-events-none absolute -inset-3 rounded-full border border-white/10" />
    </div>
  );
}
