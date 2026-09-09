import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { StadiumTrajectory } from "./StadiumTrajectory";
import { cn } from "./ui/utils";
import { getHomeRunFeedPage, mergeHomeRunEntries } from "../services";
import type { HomeRunFeedEntry } from "../services";
import { ChevronDown, Gauge, Loader2, Ruler, Rocket } from "lucide-react";

const REFRESH_INTERVAL_MS = 30_000;
/** Max consecutive empty windows to skip while scrolling before yielding. */
const MAX_EMPTY_SCANS = 4;

export function HomeRunFeed() {
  const [homeRuns, setHomeRuns] = useState<HomeRunFeedEntry[]>([]);
  const [loadStatus, setLoadStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  // Initial page load.
  useEffect(() => {
    const controller = new AbortController();

    async function loadFirstPage() {
      try {
        const page = await getHomeRunFeedPage({ signal: controller.signal });
        setHomeRuns(page.entries);
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
        setLoadStatus("loaded");
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Unable to load home run feed", error);
          setLoadStatus("error");
        }
      }
    }

    loadFirstPage();
    return () => controller.abort();
  }, []);

  // Periodically fold in newly hit home runs without dropping loaded history.
  useEffect(() => {
    const controller = new AbortController();

    const interval = setInterval(async () => {
      try {
        const page = await getHomeRunFeedPage({ signal: controller.signal });
        setHomeRuns((prev) => mergeHomeRunEntries(prev, page.entries));
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Unable to refresh home run feed", error);
        }
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  // Load the next (older) page for infinite scroll.
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || cursor === null) return;

    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    const controller = new AbortController();

    try {
      let nextCursor: string | null = cursor;
      let collectedAny = false;
      let scans = 0;

      // Skip past empty stretches (days with no rostered-player homers)
      // until we collect at least one entry or reach the season start.
      while (nextCursor !== null && !collectedAny && scans < MAX_EMPTY_SCANS) {
        const page = await getHomeRunFeedPage({ cursor: nextCursor, signal: controller.signal });
        if (page.entries.length > 0) {
          setHomeRuns((prev) => mergeHomeRunEntries(prev, page.entries));
          collectedAny = true;
        }
        nextCursor = page.nextCursor;
        scans += 1;
      }

      setCursor(nextCursor);
      setHasMore(nextCursor !== null);
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("Unable to load more home runs", error);
      }
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [cursor, hasMore]);

  // Trigger loadMore when the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || loadStatus !== "loaded" || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "240px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadStatus, hasMore, loadMore]);

  return (
    <Card className="overflow-hidden rounded-2xl border-white/8 bg-card shadow-xl shadow-black/30">
      <div className="flex flex-col gap-1 border-b border-white/8 px-5 py-4">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Live Feed
        </p>
        <h2 className="text-xl font-black tracking-tight text-white">
          Home Run History
        </h2>
      </div>
      <CardContent className="p-0">
        {loadStatus === "loading" ? (
          <div className="px-5 py-10 text-center text-sm font-semibold text-muted-foreground">
            Loading home runs...
          </div>
        ) : loadStatus === "error" ? (
          <div className="px-5 py-10 text-center text-sm font-semibold text-muted-foreground">
            Unable to load the feed right now.
          </div>
        ) : homeRuns.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm font-semibold text-muted-foreground">
            No home runs from your league&apos;s players yet this season.
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[820px] caption-bottom text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-left text-[0.65rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="w-10 px-4 py-3" />
                    <th className="px-2 py-3">Player</th>
                    <th className="px-2 py-3">HR Details</th>
                    <th className="px-2 py-3">Would it Dong?</th>
                    <th className="px-2 py-3">Team</th>
                    <th className="px-2 py-3">Pitcher</th>
                    <th className="px-2 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {homeRuns.map((homeRun) => {
                    const isExpanded = expandedId === homeRun.id;

                    return (
                      <Fragment key={homeRun.id}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : homeRun.id)}
                          className="cursor-pointer border-b border-white/6 transition-colors hover:bg-white/[0.03]"
                        >
                          <td className="px-4 py-3">
                            <ChevronDown
                              className={cn(
                                "size-4 text-muted-foreground transition-transform",
                                isExpanded && "rotate-180",
                              )}
                            />
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-2.5">
                              <PersonHeadshot imageUrl={homeRun.playerImageUrl} name={homeRun.playerName} />
                              <span className="font-bold text-white">{homeRun.playerName}</span>
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-white">
                                <Gauge className="size-3.5 text-accent" />
                                {homeRun.exitVelocity ? `${Math.round(homeRun.exitVelocity)} mph` : "—"}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                <Ruler className="size-3.5 text-primary" />
                                {homeRun.distance ? `${Math.round(homeRun.distance)} ft` : "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <DongBadge dongCount={homeRun.dongCount} />
                          </td>
                          <td className="px-2 py-3 font-semibold text-white">{homeRun.team}</td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-2.5">
                              <PersonHeadshot imageUrl={homeRun.pitcherImageUrl} name={homeRun.pitcherName} />
                              <span className="font-semibold text-white">{homeRun.pitcherName}</span>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-muted-foreground">{formatDate(homeRun.date)}</td>
                        </tr>
                        {isExpanded ? (
                          <tr className="border-b border-white/6 bg-black/10">
                            <td colSpan={7} className="px-4 py-4 sm:px-5">
                              <StadiumTrajectory homeRun={homeRun} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div ref={sentinelRef} />

            <div className="px-5 py-4 text-center text-xs font-semibold text-muted-foreground">
              {isLoadingMore ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading more home runs...
                </span>
              ) : hasMore ? (
                <button
                  type="button"
                  onClick={loadMore}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-bold text-white transition-colors hover:bg-white/10"
                >
                  Load more
                </button>
              ) : (
                `That's all ${homeRuns.length} home runs this season.`
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DongBadge({ dongCount }: { dongCount: number }) {
  const tier = getDongTier(dongCount);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold",
        tier.className,
      )}
    >
      <Rocket className="size-3.5" />
      {dongCount}/30 parks
    </span>
  );
}

function getDongTier(dongCount: number) {
  if (dongCount >= 25) {
    return { className: "border-[var(--gold)]/30 bg-[var(--gold)]/15 text-[var(--gold)]" };
  }

  if (dongCount >= 10) {
    return { className: "border-accent/30 bg-accent/15 text-accent" };
  }

  return { className: "border-primary/30 bg-primary/15 text-red-300" };
}

function PersonHeadshot({ imageUrl, name }: { imageUrl: string; name: string }) {
  const [didError, setDidError] = useState(false);

  if (didError) {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-secondary text-[0.65rem] font-black text-white">
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={`${name} headshot`}
      loading="lazy"
      onError={() => setDidError(true)}
      className="size-9 shrink-0 rounded-full border border-white/10 bg-secondary object-cover object-[center_18%]"
    />
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
