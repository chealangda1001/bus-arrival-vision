import { describe, it, expect, beforeEach } from "vitest";
import { audioCache } from "@/utils/audioCache";
import {
  splitTemplate,
  segmentCacheKey,
  areSegmentsCached,
  clearSegments,
  type SegmentVoiceContext,
} from "@/utils/announcementSegments";

/**
 * Fragment reuse: an announcement is stitched from small clips, so changing only
 * the departure time re-records the time clip and nothing else.
 */

const ctx: SegmentVoiceContext = {
  language: "khmer",
  provider: "kiritts",
  voice: "Kiri",
  speed: 0.9,
};

const TEMPLATE = "សូមអ្នកដំណើរ {fleet_type} ទៅ {destination} នឹងចេញនៅម៉ោង {time}។";

const values = (time: string) => ({
  fleet_type: "VIP Van",
  destination: "ភ្នំពេញ",
  time,
});

/** Stand-in for the provider: counts how many clips would be billed. */
const makeProvider = () => {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    async resolve(segments: ReturnType<typeof splitTemplate>) {
      const clips: string[] = [];
      for (const seg of segments) {
        const key = await segmentCacheKey(seg.text, ctx);
        const cached = await audioCache.get(key);
        if (cached) {
          clips.push(cached);
          continue;
        }
        calls += 1;
        const audio = `https://cdn.example/seg/${calls}.mp3`;
        await audioCache.set(key, audio); // permanent
        clips.push(audio);
      }
      return clips;
    },
  };
};

describe("announcement segmentation", () => {
  beforeEach(async () => {
    await audioCache.clear?.();
  });

  it("splits a template into ordered static and variable fragments", () => {
    const segments = splitTemplate(TEMPLATE, values("៣:៣០ រសៀល"));
    expect(segments.map((s) => s.kind)).toEqual([
      "static",
      "var",
      "static",
      "var",
      "static",
      "var",
    ]);
    expect(segments[1].text).toBe("VIP Van");
    expect(segments[5].text).toBe("៣:៣០ រសៀល");
  });

  it("keys fragments by their own wording, independent of the trip", async () => {
    const a = await segmentCacheKey("ភ្នំពេញ", ctx);
    const b = await segmentCacheKey("ភ្នំពេញ", ctx);
    const c = await segmentCacheKey("សៀមរាប", ctx);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("only re-records the fragment that changed", async () => {
    const provider = makeProvider();

    await provider.resolve(splitTemplate(TEMPLATE, values("៣:៣០ រសៀល")));
    expect(provider.calls).toBe(6);

    // Same trip again -> fully cached, nothing billed.
    await provider.resolve(splitTemplate(TEMPLATE, values("៣:៣០ រសៀល")));
    expect(provider.calls).toBe(6);

    // Only the departure time changed -> exactly one new clip.
    await provider.resolve(splitTemplate(TEMPLATE, values("៤:០០ រសៀល")));
    expect(provider.calls).toBe(7);
  });

  it("reports cache status and can clear a template's fragments", async () => {
    const segments = splitTemplate(TEMPLATE, values("៣:៣០ រសៀល"));
    expect(await areSegmentsCached(segments, ctx)).toBe(false);

    const provider = makeProvider();
    await provider.resolve(segments);
    expect(await areSegmentsCached(segments, ctx)).toBe(true);

    await clearSegments(segments, ctx);
    expect(await areSegmentsCached(segments, ctx)).toBe(false);
  });

  it("changing the speaking speed produces new fragment keys", async () => {
    const slow = await segmentCacheKey("ភ្នំពេញ", { ...ctx, speed: 0.8 });
    const normal = await segmentCacheKey("ភ្នំពេញ", ctx);
    expect(slow).not.toBe(normal);
  });
});
