"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSound, type SoundEffect } from "@/lib/audio";
import { createId, DISTANCES, loadCurrentRace, loadSettings, saveRaceRecord } from "@/lib/storage";
import type { Character, DistanceKey } from "@/lib/types";

type EventType = "boost" | "slow" | "sleep" | "stumble" | "turbo";

interface RunnerState {
  character: Character;
  baseSpeed: number;
  position: number;
  activeEvent: EventType | null;
  eventUntil: number;
  eventId: number;
}

const COUNTDOWN = ["3", "2", "1", "GO!"];
const EVENT_META: Record<EventType, { emoji: string; label: string; sound: SoundEffect; duration: number }> = {
  boost: { emoji: "🚀", label: "Speed Boost", sound: "boost", duration: 2000 },
  slow: { emoji: "🐌", label: "Slow Down", sound: "slow", duration: 2000 },
  sleep: { emoji: "😴", label: "Sleep", sound: "sleep", duration: 1500 },
  stumble: { emoji: "🌀", label: "Stumble", sound: "stumble", duration: 900 },
  turbo: { emoji: "⚡", label: "Turbo", sound: "turbo", duration: 700 },
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createRunners(participants: Character[], distance: DistanceKey): RunnerState[] {
  const speedBase = 100 / DISTANCES[distance].targetSeconds;
  return participants.map((character) => ({
    character,
    baseSpeed: speedBase * randomBetween(0.82, 1.22),
    position: 0,
    activeEvent: null,
    eventUntil: 0,
    eventId: 0,
  }));
}

export function RaceGame() {
  const currentRace = useMemo(() => (typeof window === "undefined" ? null : loadCurrentRace()), []);
  const [distance, setDistance] = useState<DistanceKey>(currentRace?.distance ?? "medium");
  const [runners, setRunners] = useState<RunnerState[]>(() =>
    currentRace ? createRunners(currentRace.participants, currentRace.distance) : [],
  );
  const [countdownIndex, setCountdownIndex] = useState(0);
  const [phase, setPhase] = useState<"missing" | "countdown" | "running" | "finished">(
    currentRace && currentRace.participants.length >= 2 ? "countdown" : "missing",
  );
  const [winner, setWinner] = useState<Character | null>(null);
  const [muted, setMuted] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const runnersRef = useRef<RunnerState[]>(runners);
  const nextEventAtRef = useRef(0);
  const lastFrameRef = useRef(0);
  const savedWinnerRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMuted(loadSettings().muted), 0);

    function onSettingsChange() {
      setMuted(loadSettings().muted);
    }

    window.addEventListener("hrc-settings-change", onSettingsChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hrc-settings-change", onSettingsChange);
    };
  }, []);

  useEffect(() => {
    const element = trackRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => setTrackWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    runnersRef.current = runners;
  }, [runners]);

  useEffect(() => {
    if (phase !== "countdown") {
      return;
    }

    playSound("drum", muted);
    const timer = window.setInterval(() => {
      setCountdownIndex((index) => {
        if (index >= COUNTDOWN.length - 1) {
          window.clearInterval(timer);
          playSound("go", muted);
          setPhase("running");
          return index;
        }
        return index + 1;
      });
    }, 850);

    return () => window.clearInterval(timer);
  }, [muted, phase]);

  const finishRace = useCallback(
    (winningCharacter: Character) => {
      if (savedWinnerRef.current) {
        return;
      }

      savedWinnerRef.current = true;
      setWinner(winningCharacter);
      setPhase("finished");
      playSound("cheer", muted);
      saveRaceRecord({
        id: createId(),
        winner: winningCharacter.name,
        winnerIcon: winningCharacter.icon,
        distance: DISTANCES[distance].value,
        racedAt: new Date().toISOString(),
      });
    },
    [distance, muted],
  );

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    let frameId = 0;
    lastFrameRef.current = performance.now();
    nextEventAtRef.current = performance.now() + randomBetween(700, 1500);

    function triggerEvent(now: number, currentRunners: RunnerState[]) {
      const available = currentRunners.filter((runner) => !runner.activeEvent || runner.eventUntil <= now);
      if (!available.length) {
        return currentRunners;
      }

      const target = available[Math.floor(Math.random() * available.length)];
      const eventTypes = Object.keys(EVENT_META) as EventType[];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const meta = EVENT_META[eventType];
      playSound(meta.sound, muted);

      return currentRunners.map((runner) => {
        if (runner.character.id !== target.character.id) {
          return runner;
        }

        const eventPosition =
          eventType === "stumble"
            ? Math.max(0, runner.position - 5)
            : eventType === "turbo"
              ? Math.min(100, runner.position + 15)
              : runner.position;

        return {
          ...runner,
          position: eventPosition,
          activeEvent: eventType,
          eventUntil: now + meta.duration,
          eventId: runner.eventId + 1,
        };
      });
    }

    function step(now: number) {
      const deltaSeconds = Math.min((now - lastFrameRef.current) / 1000, 0.08);
      lastFrameRef.current = now;

      let nextRunners = runnersRef.current.map((runner) => {
        const eventActive = runner.activeEvent && runner.eventUntil > now;
        const multiplier =
          eventActive && runner.activeEvent === "boost"
            ? 1.85
            : eventActive && runner.activeEvent === "slow"
              ? 0.42
              : eventActive && runner.activeEvent === "sleep"
                ? 0
                : 1;
        return {
          ...runner,
          activeEvent: eventActive ? runner.activeEvent : null,
          position: Math.min(100, runner.position + runner.baseSpeed * multiplier * deltaSeconds),
        };
      });

      if (now >= nextEventAtRef.current) {
        nextRunners = triggerEvent(now, nextRunners);
        nextEventAtRef.current = now + randomBetween(900, 1800);
      }

      const winningRunner = nextRunners.find((runner) => runner.position >= 100);
      runnersRef.current = nextRunners;
      setRunners(nextRunners);

      if (winningRunner) {
        finishRace(winningRunner.character);
        return;
      }

      frameId = window.requestAnimationFrame(step);
    }

    frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [finishRace, muted, phase]);

  function resetRace() {
    const storedRace = loadCurrentRace();
    if (!storedRace || storedRace.participants.length < 2) {
      setPhase("missing");
      return;
    }

    savedWinnerRef.current = false;
    setDistance(storedRace.distance);
    setRunners(createRunners(storedRace.participants, storedRace.distance));
    setCountdownIndex(0);
    setWinner(null);
    setPhase("countdown");
  }

  if (phase === "missing") {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center px-4 py-10">
        <div className="panel space-y-4">
          <h1 className="text-3xl font-black text-[#243b31]">No race is ready.</h1>
          <p className="text-[#5d695e]">Pick at least two characters on the setup screen first.</p>
          <Link className="primary-button inline-flex" href="/">
            Back to Setup
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-[#be4f2f]">Live race</p>
          <h1 className="text-3xl font-black text-[#243b31] sm:text-4xl">
            {DISTANCES[distance].label} Derby
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="secondary-button" onClick={resetRace} type="button">
            Race Again
          </button>
          <Link className="secondary-button" href="/">
            Back to Setup
          </Link>
        </div>
      </section>

      <section className="race-board" ref={trackRef}>
        <div className="finish-line" aria-hidden="true" />
        <div className="max-h-[68vh] space-y-3 overflow-y-auto pr-1">
          {runners.map((runner) => {
            const x = trackWidth ? (Math.min(runner.position, 100) / 100) * Math.max(trackWidth - 126, 0) : 0;
            return (
              <div className="race-lane" key={runner.character.id}>
                <motion.div
                  animate={{ x }}
                  className="runner"
                  transition={{ duration: 0.18, ease: "linear" }}
                >
                  <AnimatePresence>
                    {runner.activeEvent ? (
                      <motion.span
                        animate={{ opacity: 0, y: -42, scale: 1.25 }}
                        className="event-pop"
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 1, y: -8, scale: 0.9 }}
                        key={`${runner.character.id}-${runner.eventId}`}
                        title={EVENT_META[runner.activeEvent].label}
                      >
                        {EVENT_META[runner.activeEvent].emoji}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                  <span className="runner-icon">{runner.character.icon}</span>
                  <span className="runner-name">{runner.character.name}</span>
                </motion.div>
              </div>
            );
          })}
        </div>
      </section>

      <AnimatePresence>
        {phase === "countdown" ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="race-overlay"
            exit={{ opacity: 0, scale: 0.9 }}
            initial={{ opacity: 0, scale: 0.85 }}
            key={COUNTDOWN[countdownIndex]}
          >
            {COUNTDOWN[countdownIndex]}
          </motion.div>
        ) : null}
        {phase === "finished" && winner ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="winner-banner"
            initial={{ opacity: 0, y: 20 }}
          >
            <div className="confetti" aria-hidden="true">
              🎉 ✨ 🏆 ✨ 🎉
            </div>
            <h2>
              🏆 {winner.name} wins!
            </h2>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button className="primary-button" onClick={resetRace} type="button">
                Race Again
              </button>
              <Link className="secondary-button" href="/">
                Back to Setup
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
