import { GAIT_EVENT_TYPES, type GaitEventType } from "../../domain/events";
import type { EventsState } from "./useEvents";

/** 要件定義書8.2：登録済みイベントの一覧表示・修正・削除。 */
export function EventList({ eventsState }: { eventsState: EventsState }) {
  const sorted = [...eventsState.events].sort((a, b) => a.videoTimeSec - b.videoTimeSec);

  if (sorted.length === 0) {
    return <p className="event-list__empty">登録済みイベントはありません。</p>;
  }

  function handleDelete(id: string) {
    if (window.confirm("このイベントを削除しますか？")) {
      eventsState.deleteEvent(id);
    }
  }

  return (
    <div>
      <table className="event-list-table">
        <thead>
          <tr>
            <th>種類</th>
            <th>動画時刻(秒)</th>
            <th>推定フレーム</th>
            <th>CSV時刻(秒)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((event) => (
            <tr key={event.id}>
              <td>
                <select
                  value={event.type}
                  onChange={(e) =>
                    eventsState.updateEventType(event.id, e.target.value as GaitEventType)
                  }
                >
                  {GAIT_EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </td>
              <td>{event.videoTimeSec.toFixed(3)}</td>
              <td>{event.estimatedFrame ?? "—"}</td>
              <td>{event.csvTimeSec.toFixed(3)}</td>
              <td>
                <button type="button" onClick={() => handleDelete(event.id)}>
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {eventsState.orderWarnings.length > 0 && (
        <ul className="validation-issue-list">
          {eventsState.orderWarnings.map((w) => (
            <li key={`${w.previousEvent.id}-${w.event.id}`} className="validation-issue validation-issue--warning">
              <span className="validation-issue__badge">警告</span>
              {w.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
