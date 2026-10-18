"use client";

import { useSyncExternalStore } from "react";

const HIDE_KEY = "wealth:hide-balance";
const HIDE_EVENT = "wealth:hide-balance-changed";

function subscribeHidden(cb: () => void) {
  window.addEventListener(HIDE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(HIDE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function readHidden() {
  try {
    return window.localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Shared privacy toggle (persisted per device). */
export function useHiddenAmounts() {
  const hidden = useSyncExternalStore(subscribeHidden, readHidden, () => false);
  const toggle = () => {
    try {
      window.localStorage.setItem(HIDE_KEY, hidden ? "0" : "1");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(HIDE_EVENT));
  };
  return { hidden, toggle };
}
