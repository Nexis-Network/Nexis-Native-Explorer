import React from "react";
import BN from "bn.js";
import {
  HumanizeDuration,
  HumanizeDurationLanguage,
} from "humanize-duration-ts";

// Switch to web3 constant when web3 updates superstruct
export const LAMPORTS_PER_NZT = 1000000000;

export const NUM_TICKS_PER_SECOND = 160;
export const DEFAULT_TICKS_PER_SLOT = 64;
export const NUM_SLOTS_PER_SECOND =
  NUM_TICKS_PER_SECOND / DEFAULT_TICKS_PER_SLOT;
export const MS_PER_SLOT = 1000 / NUM_SLOTS_PER_SECOND;

export function assertUnreachable(x: never): never {
  throw new Error("Unreachable!");
}

export function normalizeTokenAmount(
  raw: string | number,
  decimals: number
): number {
  let rawTokens: number;
  if (typeof raw === "string") rawTokens = parseInt(raw);
  else rawTokens = raw;
  return rawTokens / Math.pow(10, decimals);
}

export function lamportsToNzt(lamports: number | BN): number {
  if (typeof lamports === "number") {
    return Math.abs(lamports) / LAMPORTS_PER_NZT;
  }

  let signMultiplier = 1;
  if (lamports.isNeg()) {
    signMultiplier = -1;
  }

  const absLamports = lamports.abs();
  const lamportsString = absLamports.toString(10).padStart(10, "0");
  const splitIndex = lamportsString.length - 9;
  const nztString =
    lamportsString.slice(0, splitIndex) +
    "." +
    lamportsString.slice(splitIndex);
  return signMultiplier * parseFloat(nztString);
}

export function lamportsToNztString(
  lamports: number | BN,
  maximumFractionDigits: number = 9
): string {
  const nzt = lamportsToNzt(lamports);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(nzt);
}

export function NztBalance({
  lamports,
  maximumFractionDigits = 9,
}: {
  lamports: number | BN;
  maximumFractionDigits?: number;
}) {
  return (
    <span>
      <span className="text-monospace">
        {lamportsToNztString(lamports, maximumFractionDigits)}
      </span>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="9" cy="9" r="9" fill="#B1FF69" fill-opacity="0.15"/>
        <g filter="url(#filter0_d_2344_55)">
          <path d="M6.34906 12.1998C6.3564 12.2071 6.36466 12.2145 6.37198 12.2218L6.66173 11.8101C6.90197 11.3379 6.9955 10.907 6.99825 10.5402C6.99458 10.344 6.96707 10.1496 6.91756 9.96077C6.88271 9.84708 6.85704 9.72971 6.84053 9.61144C6.84053 9.61052 6.84053 9.60869 6.84053 9.60685C6.82953 9.528 6.82219 9.44731 6.81853 9.36663C6.7681 8.0665 7.77854 6.9525 9.07508 6.87915L9.06591 6.8709C9.37491 6.85164 9.82512 6.91949 10.2029 6.82047C10.5944 6.70952 10.9502 6.49406 11.2326 6.19699C11.2464 6.18232 11.262 6.16948 11.2784 6.15848L11.5443 5.78165C10.4312 5.00964 8.96229 4.79784 7.61442 5.34888C5.49816 6.21259 4.48404 8.62946 5.3487 10.7456C5.56509 11.2747 5.87776 11.7349 6.25921 12.1136C6.28855 12.1429 6.3179 12.1713 6.34814 12.1998H6.34906Z" fill="#C5FF69"/>
          <path d="M11.7386 6.49772C11.7322 6.51697 11.7249 6.53714 11.7138 6.55548C11.4635 7.024 11.3572 7.73183 11.3801 8.01148C11.4177 8.47633 11.5598 8.77799 11.5158 9.13374C11.5488 10.4238 10.5402 11.5194 9.25375 11.5901C9.25375 11.5901 9.25192 11.5901 9.25101 11.5901C8.96767 11.6084 8.93467 11.5809 8.67519 11.5928C8.1397 11.6166 7.56846 11.8404 7.17235 12.2584L6.90735 12.6353C6.98347 12.6857 7.06048 12.7334 7.13842 12.7811C7.17417 12.8012 7.20994 12.8205 7.2457 12.8397C8.29191 13.3917 9.56551 13.4935 10.7456 13.0112C12.8618 12.1466 13.876 9.7297 13.0113 7.61355C12.7748 7.03501 12.4217 6.53805 11.9908 6.14014L11.7386 6.49772Z" fill="#C5FF69"/>
        </g>
        <defs>
          <filter id="filter0_d_2344_55" x="4.85281" y="5.04004" width="8.65437" height="8.65449" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dy="0.187231"/>
            <feGaussianBlur stdDeviation="0.0936155"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_2344_55"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_2344_55" result="shape"/>
          </filter>
        </defs>
      </svg>
    </span>
  );
}

const HUMANIZER = new HumanizeDuration(new HumanizeDurationLanguage());
HUMANIZER.setOptions({
  language: "short",
  spacer: "",
  delimiter: " ",
  round: true,
  units: ["d", "h", "m", "s"],
  largest: 3,
});
HUMANIZER.addLanguage("short", {
  y: () => "y",
  mo: () => "mo",
  w: () => "w",
  d: () => "d",
  h: () => "h",
  m: () => "m",
  s: () => "s",
  ms: () => "ms",
  decimal: ".",
});

export function slotsToHumanString(
  slots: number,
  slotTime = MS_PER_SLOT
): string {
  return HUMANIZER.humanize(slots * slotTime);
}

export function wrap(input: string, length: number): string {
  var result = [];
  while (input.length) {
    result.push(input.substr(0, length));
    input = input.substr(length);
  }
  return result.join("\n");
}

export function localStorageIsAvailable() {
  const test = "test";
  try {
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

export function camelToTitleCase(str: string): string {
  const result = str.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function abbreviatedNumber(value: number, fixed = 1) {
  if (value < 1e3) return value;
  if (value >= 1e3 && value < 1e6) return +(value / 1e3).toFixed(fixed) + "K";
  if (value >= 1e6 && value < 1e9) return +(value / 1e6).toFixed(fixed) + "M";
  if (value >= 1e9 && value < 1e12) return +(value / 1e9).toFixed(fixed) + "B";
  if (value >= 1e12) return +(value / 1e12).toFixed(fixed) + "T";
}

export function nztToLamports(nzt: number): number | BN {
  const absNzt = Math.abs(nzt);
  const lamports = absNzt * LAMPORTS_PER_NZT;
  if (lamports > Number.MAX_SAFE_INTEGER) {
    return new BN(absNzt.toString()).mul(new BN(LAMPORTS_PER_NZT));
  }
  return lamports;
}
