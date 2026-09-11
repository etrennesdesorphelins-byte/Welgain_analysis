import { describe, expect, it } from "vitest";
import { buildEventsCsv } from "../features/export/csvExport";
import type { GaitEvent } from "../domain/events";

describe("buildEventsCsv", () => {
  it("時刻順に並べ替えてCSV形式にする", () => {
    const events: GaitEvent[] = [
      { id: "b", type: "Lt_IC", videoTimeSec: 2, estimatedFrame: 60, csvTimeSec: 2 },
      { id: "a", type: "Rt_IC", videoTimeSec: 1, estimatedFrame: 30, csvTimeSec: 1 },
    ];
    const csv = buildEventsCsv(events);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("type,video_time_sec,estimated_frame,csv_time_sec");
    expect(lines[1]).toBe("Rt_IC,1,30,1");
    expect(lines[2]).toBe("Lt_IC,2,60,2");
  });
});
