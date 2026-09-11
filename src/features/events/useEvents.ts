import { useCallback, useState } from "react";
import {
  findDuplicateEvent,
  findEventOrderWarnings,
  type EventOrderWarning,
  type GaitEvent,
  type GaitEventType,
} from "../../domain/events";
import { videoToCsvTime } from "../../domain/sync";

export interface RegisterEventResult {
  success: boolean;
  reason?: string;
}

export interface EventsState {
  events: GaitEvent[];
  registerEvent: (type: GaitEventType, videoTimeSec: number, fps: number) => RegisterEventResult;
  updateEventType: (id: string, type: GaitEventType) => void;
  deleteEvent: (id: string) => void;
  /** JSON再読込（要件定義書15.3）でイベント一覧を丸ごと置き換える。 */
  replaceEvents: (events: GaitEvent[]) => void;
  orderWarnings: EventOrderWarning[];
}

/** 要件定義書8章：イベント登録・修正・削除、重複・順序チェックを提供する。 */
export function useEvents(
  videoDurationSec: number | null,
  csvDurationSec: number | null,
): EventsState {
  const [events, setEvents] = useState<GaitEvent[]>([]);

  const registerEvent = useCallback(
    (type: GaitEventType, videoTimeSec: number, fps: number): RegisterEventResult => {
      const estimatedFrame = Math.round(videoTimeSec * fps);

      // 要件定義書8.3：同一フレームへの同一イベント重複は警告し、原則として禁止する。
      const duplicate = findDuplicateEvent(events, type, videoTimeSec, estimatedFrame);
      if (duplicate) {
        return {
          success: false,
          reason: `同一フレームに${type}が既に登録されています。`,
        };
      }

      const csvTimeSec =
        videoDurationSec !== null && csvDurationSec !== null
          ? videoToCsvTime(videoTimeSec, videoDurationSec, csvDurationSec).csvTimeSec
          : 0;

      const newEvent: GaitEvent = {
        id: crypto.randomUUID(),
        type,
        videoTimeSec,
        estimatedFrame,
        csvTimeSec,
      };
      setEvents((prev) => [...prev, newEvent]);
      return { success: true };
    },
    [events, videoDurationSec, csvDurationSec],
  );

  const updateEventType = useCallback((id: string, type: GaitEventType) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, type } : e)));
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const replaceEvents = useCallback((next: GaitEvent[]) => {
    setEvents(next);
  }, []);

  return {
    events,
    registerEvent,
    updateEventType,
    deleteEvent,
    replaceEvents,
    orderWarnings: findEventOrderWarnings(events),
  };
}
