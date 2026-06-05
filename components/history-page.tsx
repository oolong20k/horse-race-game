"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearHistory, loadHistory } from "@/lib/storage";
import type { RaceRecord } from "@/lib/types";

function distanceLabel(distance: number) {
  if (distance <= 500) {
    return "Short";
  }
  if (distance >= 3000) {
    return "Long";
  }
  return "Medium";
}

export function HistoryPage() {
  const [records, setRecords] = useState<RaceRecord[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setRecords(loadHistory()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function handleClearHistory() {
    if (!window.confirm("Clear all race history?")) {
      return;
    }
    clearHistory();
    setRecords([]);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-[#be4f2f]">Race log</p>
          <h1 className="text-4xl font-black text-[#243b31]">History</h1>
        </div>
        <button className="secondary-button" disabled={!records.length} onClick={handleClearHistory} type="button">
          Clear History
        </button>
      </section>

      {records.length ? (
        <section className="space-y-3">
          {records.map((record) => (
            <article className="history-row" key={record.id}>
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-3xl" aria-hidden="true">
                  {record.winnerIcon ?? "🏆"}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black text-[#243b31]">{record.winner}</h2>
                  <p className="text-sm font-semibold text-[#5d695e]">{distanceLabel(record.distance)} race</p>
                </div>
              </div>
              <time className="text-sm font-semibold text-[#5d695e]" dateTime={record.racedAt}>
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(record.racedAt))}
              </time>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state space-y-4">
          <p>No races yet. Go race!</p>
          <Link className="primary-button inline-flex" href="/">
            Back to Setup
          </Link>
        </section>
      )}
    </main>
  );
}
