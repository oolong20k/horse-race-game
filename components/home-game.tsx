"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createId,
  DISTANCES,
  loadCharacters,
  loadSettings,
  randomCharacterIcon,
  saveCharacters,
  saveCurrentRace,
  saveSettings,
} from "@/lib/storage";
import type { Character, DistanceKey } from "@/lib/types";

const MAX_NAME_LENGTH = 24;

function validateName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Tên không được để trống.";
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return "Tên tối đa 24 ký tự.";
  }
  return "";
}

export function HomeGame() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editError, setEditError] = useState("");
  const [distance, setDistance] = useState<DistanceKey>("medium");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedCharacters = loadCharacters();
      setCharacters(storedCharacters);
      setSelectedIds(new Set(storedCharacters.map((character) => character.id)));
      setDistance(loadSettings().distance);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedCharacters = useMemo(
    () => characters.filter((character) => selectedIds.has(character.id)),
    [characters, selectedIds],
  );
  const canStartRace = selectedCharacters.length >= 2;

  function updateCharacters(nextCharacters: Character[], autoSelectIds: string[] = []) {
    setCharacters(nextCharacters);
    saveCharacters(nextCharacters);
    setSelectedIds((previous) => {
      const validIds = new Set(nextCharacters.map((character) => character.id));
      const next = new Set([...previous].filter((id) => validIds.has(id)));
      autoSelectIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function addCharacter() {
    const error = validateName(newName);
    setAddError(error);
    if (error) {
      return;
    }

    const character: Character = {
      id: createId(),
      name: newName.trim(),
      icon: randomCharacterIcon(),
      createdAt: new Date().toISOString(),
    };
    const nextCharacters = [...characters, character];
    updateCharacters(nextCharacters, [character.id]);
    setNewName("");
  }

  function beginEdit(character: Character) {
    setEditingId(character.id);
    setEditingName(character.name);
    setEditError("");
  }

  function saveEdit(characterId: string) {
    const error = validateName(editingName);
    setEditError(error);
    if (error) {
      return;
    }

    updateCharacters(
      characters.map((character) =>
        character.id === characterId ? { ...character, name: editingName.trim() } : character,
      ),
    );
    setEditingId(null);
    setEditingName("");
  }

  function deleteCharacter(character: Character) {
    if (!window.confirm(`Delete ${character.name}?`)) {
      return;
    }
    updateCharacters(characters.filter((item) => item.id !== character.id));
  }

  function toggleSelected(characterId: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(characterId)) {
        next.delete(characterId);
      } else {
        next.add(characterId);
      }
      return next;
    });
  }

  function updateDistance(nextDistance: DistanceKey) {
    setDistance(nextDistance);
    saveSettings({ ...loadSettings(), distance: nextDistance });
  }

  function startRace() {
    if (!canStartRace) {
      return;
    }

    saveCurrentRace({
      participants: selectedCharacters,
      distance,
      startedAt: new Date().toISOString(),
    });
    router.push("/race");
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-sm font-bold uppercase text-[#be4f2f]">Whimsical race manager</p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight text-[#243b31] sm:text-5xl">
              Build a roster, pick your racers, and run a ridiculous derby.
            </h1>
          </div>

          <div className="panel space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="min-w-0 flex-1">
                <label className="label" htmlFor="new-character">
                  Add Character
                </label>
                <input
                  className="text-input"
                  id="new-character"
                  maxLength={MAX_NAME_LENGTH + 1}
                  onChange={(event) => {
                    setNewName(event.target.value);
                    setAddError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      addCharacter();
                    }
                  }}
                  placeholder="Type a name"
                  value={newName}
                />
                {addError ? <p className="error-text">{addError}</p> : null}
              </div>
              <button className="primary-button sm:self-end" onClick={addCharacter} type="button">
                Add Character
              </button>
            </div>

            {characters.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {characters.map((character) => {
                  const isEditing = editingId === character.id;
                  return (
                    <article className="character-card" key={character.id}>
                      <label className="flex min-w-0 flex-1 items-center gap-3">
                        <input
                          checked={selectedIds.has(character.id)}
                          className="h-5 w-5 accent-[#2f7d68]"
                          onChange={() => toggleSelected(character.id)}
                          type="checkbox"
                        />
                        <span className="text-3xl" aria-hidden="true">
                          {character.icon}
                        </span>
                        {isEditing ? (
                          <input
                            autoFocus
                            className="text-input h-11 min-w-0"
                            maxLength={MAX_NAME_LENGTH + 1}
                            onChange={(event) => {
                              setEditingName(event.target.value);
                              setEditError("");
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                saveEdit(character.id);
                              }
                              if (event.key === "Escape") {
                                setEditingId(null);
                                setEditingName("");
                              }
                            }}
                            value={editingName}
                          />
                        ) : (
                          <span className="min-w-0 truncate font-bold text-[#1d2428]">{character.name}</span>
                        )}
                      </label>
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <button className="icon-button" onClick={() => saveEdit(character.id)} title="Save" type="button">
                            ✓
                          </button>
                        ) : (
                          <button className="icon-button" onClick={() => beginEdit(character)} title="Edit" type="button">
                            ✏️
                          </button>
                        )}
                        <button className="icon-button danger" onClick={() => deleteCharacter(character)} title="Delete" type="button">
                          🗑️
                        </button>
                      </div>
                      {isEditing && editError ? <p className="error-text col-span-full">{editError}</p> : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">No characters yet. Add the first racer to unlock setup.</div>
            )}
          </div>
        </div>

        <aside className="panel space-y-5">
          <div>
            <p className="label">Race Distance</p>
            <p className="mt-1 text-xl font-black text-[#243b31]">
              {DISTANCES[distance].label} — {DISTANCES[distance].durationLabel}
            </p>
          </div>
          <input
            aria-label="Race Distance"
            className="w-full accent-[#2f7d68]"
            max={2}
            min={0}
            onChange={(event) => updateDistance(["short", "medium", "long"][Number(event.target.value)] as DistanceKey)}
            type="range"
            value={["short", "medium", "long"].indexOf(distance)}
          />
          <div className="flex justify-between text-sm font-bold text-[#5d695e]">
            <span>Short</span>
            <span>Medium</span>
            <span>Long</span>
          </div>
          <div className="rounded-md bg-[#eef5dc] p-4 text-sm font-semibold text-[#3e4b3c]">
            {selectedCharacters.length} selected racer{selectedCharacters.length === 1 ? "" : "s"}
          </div>
          <button
            className="primary-button w-full"
            disabled={!canStartRace}
            onClick={startRace}
            title={canStartRace ? "Start Race" : "Select at least 2 characters to start"}
            type="button"
          >
            Start Race
          </button>
        </aside>
      </section>
    </main>
  );
}
