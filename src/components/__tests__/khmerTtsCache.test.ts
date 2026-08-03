import { describe, it, expect, beforeEach } from "vitest";
import { audioCache, generateScriptHash } from "@/utils/audioCache";

/**
 * Offline cache verification for Khmer TTS.
 *
 * Simulates the exact key scheme used by AnnouncementSystem / DriverAnnouncementPlayer
 * and asserts that after ONE successful generation the audio is served from the
 * client cache forever (no further provider calls) unless the script changes.
 */

const OPERATOR = "op-1";

const khmerKey = (text: string, scriptHash: string, provider: "gemini" | "kiritts", voice = "Kiri") =>
  provider === "kiritts"
    ? `kiritts_khmer_${voice}_${OPERATOR}_${btoa(unescape(encodeURIComponent(text)))}_${scriptHash}`
    : `gemini_khmer_${OPERATOR}_${btoa(unescape(encodeURIComponent(text)))}_${scriptHash}`;

/** Stand-in for the edge function: counts how many times TTS would be billed. */
const makeProvider = () => {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    async fetchOrGenerate(cacheKey: string) {
      const cached = await audioCache.get(cacheKey);
      if (cached) return { audio: cached, generated: false };
      calls += 1;
      const audio = `https://cdn.example/tts/${calls}.mp3`;
      await audioCache.set(cacheKey, audio); // permanent
      return { audio, generated: true };
    },
  };
};

describe("Khmer TTS client cache", () => {
  const script = { english: "e", khmer: "សួស្តី {destination}", chinese: "c" };
  const text = "សួស្តី ភ្នំពេញ";

  beforeEach(async () => {
    await audioCache.clear?.();
  });

  it("generates once, then replays from cache offline", async () => {
    const provider = makeProvider();
    const key = khmerKey(text, generateScriptHash(script as any), "kiritts");

    const first = await provider.fetchOrGenerate(key);
    expect(first.generated).toBe(true);
    expect(provider.calls).toBe(1);

    for (let i = 0; i < 5; i++) {
      const again = await provider.fetchOrGenerate(key);
      expect(again.generated).toBe(false);
      expect(again.audio).toBe(first.audio);
    }
    expect(provider.calls).toBe(1);
  });

  it("does not expire over time (permanent entries)", async () => {
    const key = khmerKey(text, generateScriptHash(script as any), "gemini");
    await audioCache.set(key, "https://cdn.example/permanent.mp3");

    // A year later the entry must still resolve.
    const realNow = Date.now;
    Date.now = () => realNow() + 365 * 24 * 60 * 60 * 1000;
    try {
      expect(await audioCache.get(key)).toBe("https://cdn.example/permanent.mp3");
    } finally {
      Date.now = realNow;
    }
  });

  it("regenerates only when the script changes", async () => {
    const provider = makeProvider();
    const k1 = khmerKey(text, generateScriptHash(script as any), "kiritts");
    await provider.fetchOrGenerate(k1);

    const updated = { ...script, khmer: "សួស្តី​អ្នកដំណើរ {destination}" };
    const k2 = khmerKey(text, generateScriptHash(updated as any), "kiritts");
    const second = await provider.fetchOrGenerate(k2);

    expect(k1).not.toBe(k2);
    expect(second.generated).toBe(true);
    expect(provider.calls).toBe(2);
  });

  it("regenerates when the provider or voice changes", async () => {
    const provider = makeProvider();
    const hash = generateScriptHash(script as any);
    await provider.fetchOrGenerate(khmerKey(text, hash, "gemini"));
    await provider.fetchOrGenerate(khmerKey(text, hash, "kiritts", "Kiri"));
    await provider.fetchOrGenerate(khmerKey(text, hash, "kiritts", "Maly"));
    expect(provider.calls).toBe(3);

    // ...and never again for those three combinations.
    await provider.fetchOrGenerate(khmerKey(text, hash, "kiritts", "Kiri"));
    expect(provider.calls).toBe(3);
  });
});
