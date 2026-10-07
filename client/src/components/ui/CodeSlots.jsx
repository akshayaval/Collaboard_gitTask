// CodeSlots.jsx — animated alphanumeric slot-style code entry
// Adapted from the React Bits CodeSlots component.
// Key change: accepts letters + digits (8-char alphanumeric room codes),
// not digits-only.

import React, { useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import "./CodeSlots.css";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Keep only alphanumeric chars and uppercase them — replaces the
 *  original digits-only `digitsOf`. */
const charsOf = (raw) =>
  String(raw ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

// ---------------------------------------------------------------------------
// CodeSlots
// ---------------------------------------------------------------------------

/**
 * Props:
 *   length      {number}   — number of slots (default 8)
 *   value       {string}   — controlled value (uppercase alphanumeric)
 *   onChange    {fn}       — called with the new string on every change
 *   onComplete  {fn}       — called with the final string when all slots filled
 *   status      {string}   — "idle" | "error" | "success"
 *   autoFocus   {bool}
 *   slotSize    {number}   — width & height in px (default 44)
 *   gap         {number}   — gap between slots in px (default 8)
 *   accentColor {string}
 *   inkColor    {string}
 *   slotColor   {string}
 *   digitColor  {string}
 */
export default function CodeSlots({
  length = 8,
  value = "",
  onChange,
  onComplete,
  status = "idle",
  autoFocus = false,
  slotSize = 44,
  gap = 8,
  accentColor = "#2563EB",
  inkColor = "rgba(0,0,0,0.15)",
  slotColor = "rgba(255,255,255,0.85)",
  digitColor = "#0f172a",
}) {
  const inputRef = useRef(null);

  // Derived: array of chars from value, padded to `length`
  const chars = Array.from({ length }, (_, i) => charsOf(value)[i] ?? "");

  // The active slot = first empty slot
  const activeIdx = Math.min(charsOf(value).length, length - 1);

  // ------------------------------------------------------------------
  // focus helper
  // ------------------------------------------------------------------
  const focus = useCallback(() => inputRef.current?.focus(), []);

  useEffect(() => {
    if (autoFocus) focus();
  }, [autoFocus, focus]);

  // ------------------------------------------------------------------
  // insert / delete
  // ------------------------------------------------------------------
  const insert = useCallback(
    (ch) => {
      const current = charsOf(value);
      if (current.length >= length) return;
      const next = current + ch.toUpperCase();
      onChange?.(next);
      if (next.length === length) onComplete?.(next);
    },
    [value, length, onChange, onComplete]
  );

  const deleteOne = useCallback(() => {
    const current = charsOf(value);
    if (!current.length) return;
    onChange?.(current.slice(0, -1));
  }, [value, onChange]);

  // ------------------------------------------------------------------
  // keyboard handler
  // ------------------------------------------------------------------
  const onKeyDown = useCallback(
    (e) => {
      const k = e.key;

      if (k === "Backspace" || k === "Delete") {
        e.preventDefault();
        deleteOne();
        return;
      }

      if (k === "ArrowLeft" || k === "ArrowRight") {
        // intentionally swallowed — cursor position is implicit
        e.preventDefault();
        return;
      }

      // Single alphanumeric character
      if (/^[a-zA-Z0-9]$/.test(k)) {
        e.preventDefault();
        insert(k.toUpperCase());
        return;
      }
    },
    [insert, deleteOne]
  );

  // ------------------------------------------------------------------
  // input event (handles mobile / IME / autofill)
  // ------------------------------------------------------------------
  const onInput = useCallback(
    (e) => {
      // Pull the raw value the browser injected and process it
      const raw = e.target.value;
      const cleaned = charsOf(raw);
      // reset the hidden input so we rely on our own state
      e.target.value = "";
      if (!cleaned) return;

      // Insert each char in sequence up to remaining space
      const current = charsOf(value);
      const remaining = length - current.length;
      const toAdd = cleaned.slice(0, remaining);
      if (!toAdd) return;
      const next = current + toAdd;
      onChange?.(next);
      if (next.length === length) onComplete?.(next);
    },
    [value, length, onChange, onComplete]
  );

  // ------------------------------------------------------------------
  // paste
  // ------------------------------------------------------------------
  const onPaste = useCallback(
    (e) => {
      e.preventDefault();
      const pasted = charsOf(e.clipboardData?.getData("text") ?? "");
      if (!pasted) return;

      const current = charsOf(value);
      const remaining = length - current.length;
      const toAdd = pasted.slice(0, remaining);
      if (!toAdd) return;
      const next = current + toAdd;
      onChange?.(next);
      if (next.length === length) onComplete?.(next);
    },
    [value, length, onChange, onComplete]
  );

  // ------------------------------------------------------------------
  // CSS vars for theming
  // ------------------------------------------------------------------
  const cssVars = {
    "--cs-accent-color": accentColor,
    "--cs-ink-color": inkColor,
    "--cs-slot-color": slotColor,
    "--cs-digit-color": digitColor,
  };

  const isError = status === "error";
  const isSuccess = status === "success";

  return (
    <div className="cs-root" style={cssVars}>
      <div
        className="cs-slots"
        style={{ gap }}
        onClick={focus}
        aria-label="Room code entry"
        role="group"
      >
        {chars.map((ch, i) => {
          const isFilled = Boolean(ch);
          const isActive = !isError && !isSuccess && i === activeIdx;
          const slotStateClass = isError
            ? "cs-slot-error"
            : isSuccess
            ? "cs-slot-success"
            : isFilled
            ? "cs-slot-filled"
            : isActive
            ? "cs-slot-active"
            : "";

          return (
            <motion.div
              key={i}
              className={`cs-slot ${slotStateClass}`}
              style={{ width: slotSize, height: slotSize }}
              animate={
                isError
                  ? { x: [0, -4, 4, -4, 4, 0] }
                  : { x: 0 }
              }
              transition={
                isError
                  ? { duration: 0.35, ease: "easeInOut" }
                  : { duration: 0 }
              }
            >
              <AnimatePresence mode="wait">
                {isFilled ? (
                  <motion.span
                    key={`char-${i}`}
                    className="cs-slot-char"
                    style={{ fontSize: slotSize * 0.45 }}
                    initial={{ opacity: 0, scale: 0.6, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.6, y: -6 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    {ch}
                  </motion.span>
                ) : isActive ? (
                  <motion.span
                    key="cursor"
                    className="cs-slot-cursor"
                    style={{ height: slotSize * 0.45 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                  />
                ) : null}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {isSuccess && (
          <div className="cs-success-icon">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} color="#22C55E" />
          </div>
        )}

        {/* Hidden real input that receives all keyboard / IME / paste events */}
        <input
          ref={inputRef}
          className="cs-hidden-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          pattern="[a-zA-Z0-9]*"
          maxLength={length}
          value=""
          onChange={() => {}} // controlled via onInput
          onKeyDown={onKeyDown}
          onInput={onInput}
          onPaste={onPaste}
          aria-label="Room code"
          aria-hidden="true"
          tabIndex={0}
        />
      </div>
    </div>
  );
}
