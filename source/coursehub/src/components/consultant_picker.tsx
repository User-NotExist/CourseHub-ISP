"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";

export type Member = {
  name: string;
  email: string;
  role: string; // "lecturer" | "ta" | "student"
  initials: string;
};

type Props = {
  members: Member[]; // people already in the course
  value: Member | null;
  onChange: (member: Member | null) => void;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  describedBy?: string;
};

const ROLE_LABEL: Record<string, string> = { lecturer: "Lecturer", ta: "TA", student: "Student" };
const roleLabel = (role: string) => ROLE_LABEL[role] ?? role;

export default function ConsultantPicker({
  members,
  value,
  onChange,
  invalid,
  disabled,
  placeholder = "Search course members by name or email",
  describedBy,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [members, query]);

  const choose = (m: Member) => {
    onChange(m);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Selected: show the chosen person with a button to change it
  if (value) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#00695f] text-xs font-semibold text-white ring-2 ring-white/30">
          {value.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-white">{value.name}</p>
          <p className="truncate text-sm text-white/70">
            {value.email} · {roleLabel(value.role)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
        >
          <X className="size-4" aria-hidden />
          Change
        </button>
      </div>
    );
  }

  // Not selected: searchable list of course members
  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/60" aria-hidden />
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        disabled={disabled}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-white/10 py-3 pl-11 pr-4 text-base text-white placeholder:text-white/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
          invalid ? "border-red-300" : "border-white/10 focus:border-white/50"
        }`}
      />

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl bg-[#03332f] p-1.5 shadow-xl ring-1 ring-white/15"
        >
          {results.map((m, i) => (
            <li
              key={m.email}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()} // keep focus so the click lands
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(m)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 ${
                i === active ? "bg-white/15" : ""
              }`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#00695f] text-xs font-semibold text-white">
                {m.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{m.name}</span>
                <span className="block truncate text-sm text-white/65">{m.email}</span>
              </span>
              <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/75">
                {roleLabel(m.role)}
              </span>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-white/60">
              {query ? `No course members match “${query}”` : "No members in this course"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}