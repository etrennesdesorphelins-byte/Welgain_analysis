import { useState } from "react";
import { GAIT_EVENT_TYPES, type GaitEventType } from "../../domain/events";
import type { EventsState } from "./useEvents";

const LABELS: Record<GaitEventType, string> = {
  Rt_IC: "右IC (Rt_IC)",
  Lt_IC: "左IC (Lt_IC)",
  Rt_Off: "右Off (Rt_Off)",
  Lt_Off: "左Off (Lt_Off)",
};

interface EventRegistrationButtonsProps {
  eventsState: EventsState;
  currentVideoTimeSec: number;
  fps: number;
  disabled: boolean;
}

/** 要件定義書8.2：現在の動画時刻に4種類の歩行イベントを登録するボタン群。 */
export function EventRegistrationButtons({
  eventsState,
  currentVideoTimeSec,
  fps,
  disabled,
}: EventRegistrationButtonsProps) {
  const [message, setMessage] = useState<string | null>(null);

  function handleClick(type: GaitEventType) {
    const result = eventsState.registerEvent(type, currentVideoTimeSec, fps);
    setMessage(result.success ? null : (result.reason ?? "登録に失敗しました。"));
  }

  return (
    <div className="event-registration">
      <div className="event-registration__buttons">
        {GAIT_EVENT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            disabled={disabled}
            className={`event-registration__button event-registration__button--${type}`}
            onClick={() => handleClick(type)}
          >
            {LABELS[type]}
          </button>
        ))}
      </div>
      {message && <p className="event-registration__message">{message}</p>}
    </div>
  );
}
