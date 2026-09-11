export type GaitEventType = "Rt_IC" | "Lt_IC" | "Rt_Off" | "Lt_Off";
export type IcEventType = "Rt_IC" | "Lt_IC";

export const GAIT_EVENT_TYPES: GaitEventType[] = ["Rt_IC", "Lt_IC", "Rt_Off", "Lt_Off"];

export interface GaitEvent {
  id: string;
  type: GaitEventType;
  videoTimeSec: number;
  estimatedFrame: number | null;
  csvTimeSec: number;
}

/**
 * 要件定義書8.3の標準的な歩行順序：
 * Rt_IC → Lt_Off → Lt_IC → Rt_Off → 次のRt_IC
 * Lt_IC → Rt_Off → Rt_IC → Lt_Off → 次のLt_IC
 */
const EXPECTED_NEXT_TYPE: Record<GaitEventType, GaitEventType> = {
  Rt_IC: "Lt_Off",
  Lt_Off: "Lt_IC",
  Lt_IC: "Rt_Off",
  Rt_Off: "Rt_IC",
};

export interface EventOrderWarning {
  event: GaitEvent;
  previousEvent: GaitEvent;
  message: string;
}

/**
 * 時間順に並べたイベント列を検査し、標準順序と一致しない遷移を警告として返す。
 * 病的歩行を考慮し、警告のみで登録自体は妨げない（要件定義書8.3）。
 */
export function findEventOrderWarnings(events: GaitEvent[]): EventOrderWarning[] {
  const sorted = [...events].sort((a, b) => a.videoTimeSec - b.videoTimeSec);
  const warnings: EventOrderWarning[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const previousEvent = sorted[i - 1];
    const event = sorted[i];
    if (previousEvent.videoTimeSec === event.videoTimeSec) continue;

    const expected = EXPECTED_NEXT_TYPE[previousEvent.type];
    if (expected !== event.type) {
      warnings.push({
        event,
        previousEvent,
        message: `${previousEvent.type}の次に${event.type}が登録されています（標準的な順序では${expected}）。`,
      });
    }
  }

  return warnings;
}

const DUPLICATE_FRAME_TOLERANCE = 0;

/**
 * 要件定義書8.3：同一フレームへの同一イベント重複を検出する。
 * estimatedFrameが取得できる場合はフレーム一致、できない場合は動画時刻の完全一致で判定する。
 */
export function findDuplicateEvent(
  events: GaitEvent[],
  type: GaitEventType,
  videoTimeSec: number,
  estimatedFrame: number | null,
): GaitEvent | null {
  return (
    events.find((e) => {
      if (e.type !== type) return false;
      if (estimatedFrame !== null && e.estimatedFrame !== null) {
        return Math.abs(e.estimatedFrame - estimatedFrame) <= DUPLICATE_FRAME_TOLERANCE;
      }
      return e.videoTimeSec === videoTimeSec;
    }) ?? null
  );
}
