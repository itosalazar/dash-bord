import { boardNameFromSlug, parsePinterestBoardUrl } from "@/lib/settings";
import type { InspirationPin } from "@/lib/types";
import type { InspirationProvider } from "../types";

/** Local, original illustrations shipped in /public/demo — no network needed. */
export const DEMO_PINS: InspirationPin[] = [
  {
    id: "demo-lounge",
    imageUrl: "/demo/warm-modernism-lounge.svg",
    width: 1200,
    height: 800,
    alt: "Sunlit warm-modernist living room: terracotta lounge chair, travertine drum table, a vase of olive branches and a walnut sideboard against a sage wall with leaf shadows.",
    title: "Afternoon lounge",
    dominantColor: "#6f6a48",
  },
  {
    id: "demo-arch",
    imageUrl: "/demo/warm-modernism-arch.svg",
    width: 1200,
    height: 800,
    alt: "Plaster archway in clay tones opening onto a pale sky, with a wooden stool and a potted olive tree.",
    title: "Clay arch",
    dominantColor: "#b5683f",
  },
  {
    id: "demo-still",
    imageUrl: "/demo/warm-modernism-still.svg",
    width: 1200,
    height: 800,
    alt: "Still life of stoneware vessels on a travertine plinth with long late-day shadows.",
    title: "Stoneware still life",
    dominantColor: "#d8c7a6",
  },
];

export const mockInspirationProvider: InspirationProvider = {
  id: "mock",
  async getBoard({ boardUrl }) {
    const parsed = boardUrl ? parsePinterestBoardUrl(boardUrl) : null;
    return {
      ok: true,
      source: "mock",
      fetchedAt: new Date().toISOString(),
      data: {
        boardName: parsed ? boardNameFromSlug(parsed.slug) : "Warm modernism",
        boardUrl: parsed ? boardUrl : undefined,
        pins: DEMO_PINS,
      },
    };
  },
};
