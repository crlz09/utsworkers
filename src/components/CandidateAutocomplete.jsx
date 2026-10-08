import { useEffect, useId, useState } from "react";
import { supabase } from "../lib/supabase";

export default function CandidateAutocomplete({
  selected,
  disabled,
  onSelect,
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [pickedName, setPickedName] = useState("");
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const items = result?.query === query ? result.items : [];
  const pending = open && result?.query !== query && !error;
  const value = editing ? query : selected?.name || pickedName;

  useEffect(() => {
    if (!open || disabled) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        let request = supabase
          .from("workers")
          .select("id,name,email")
          .order("name")
          .order("id")
          .limit(20);
        const search = query.trim();
        if (search)
          request = request.ilike(
            "name",
            `%${search.replace(/[\\%_]/g, "\\$&")}%`,
          );
        const { data, error: failure } = await request;
        if (failure) throw failure;
        if (active) {
          setResult({ query, items: data || [] });
          setError("");
        }
      } catch (failure) {
        if (active) {
          setResult({ query, items: [] });
          setError(failure.message || "Could not search candidates.");
        }
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, open, disabled]);

  const choose = (candidate) => {
    setPickedName(candidate.name || "Candidate");
    setEditing(false);
    setOpen(false);
    onSelect(candidate.id);
  };
  const inputKeys = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) =>
        items.length
          ? (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
            items.length
          : 0,
      );
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (items[activeIndex]) choose(items[activeIndex]);
    }
  };
  return (
    <div className="cert-autocomplete">
      <label htmlFor={id}>Find a candidate</label>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={
          open && items[activeIndex]
            ? `${id}-${items[activeIndex].id}`
            : undefined
        }
        autoComplete="off"
        placeholder="Start typing a candidate’s name…"
        value={value}
        disabled={disabled}
        onFocus={() => {
          setQuery(value);
          setEditing(true);
          setOpen(true);
          setActiveIndex(0);
          setError("");
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={inputKeys}
        onChange={(event) => {
          setQuery(event.target.value);
          setPickedName("");
          setEditing(true);
          setOpen(true);
          setActiveIndex(0);
          setError("");
          if (selected) onSelect("");
        }}
      />
      {open ? (
        <div className="cert-autocomplete-menu">
          <ul id={`${id}-list`} role="listbox" aria-label="Matching candidates">
            {items.map((candidate, index) => (
              <li
                key={candidate.id}
                id={`${id}-${candidate.id}`}
                role="option"
                aria-selected={index === activeIndex}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(candidate)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <strong>{candidate.name || "Candidate"}</strong>
                <small>{candidate.email}</small>
              </li>
            ))}
          </ul>
          {pending ? (
            <p role="status">Searching…</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : !items.length ? (
            <p role="status">No candidates found. Try another name.</p>
          ) : (
            <p>Choose a name to load their certificates.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
