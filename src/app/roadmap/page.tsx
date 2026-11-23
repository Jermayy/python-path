import type { Metadata } from "next";
import { RoadmapView } from "./RoadmapView";

export const metadata: Metadata = { title: "Roadmap" };

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Your roadmap</h1>
      <p className="text-muted mt-2">
        Five tracks from first line of Python to interview-ready. Pick up
        wherever you left off.
      </p>
      <RoadmapView />
    </div>
  );
}
