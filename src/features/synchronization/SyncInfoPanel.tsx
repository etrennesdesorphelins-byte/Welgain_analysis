import type { SyncState } from "./useSync";

interface SyncInfoPanelProps {
  sync: SyncState;
  currentVideoTimeSec: number;
}

/** 要件定義書7.2：同期情報の表示（動画時間、CSV時間、時間差、同期方式、対応時刻）。 */
export function SyncInfoPanel({ sync, currentVideoTimeSec }: SyncInfoPanelProps) {
  if (sync.videoDurationSec === null || sync.csvDurationSec === null) {
    return <p className="sync-info-panel__empty">動画とCSVの両方を読み込むと同期情報を表示します。</p>;
  }

  const csvTime = sync.toCsvTime(currentVideoTimeSec);
  const level = sync.durationDiff?.level ?? "none";

  return (
    <div>
      <dl className="file-info">
        <dt>動画時間</dt>
        <dd>{sync.videoDurationSec.toFixed(2)} 秒</dd>
        <dt>CSV時間</dt>
        <dd>{sync.csvDurationSec.toFixed(2)} 秒</dd>
        <dt>時間差</dt>
        <dd>
          {sync.durationDiff?.diffSec.toFixed(2)} 秒（
          {((sync.durationDiff?.diffRatio ?? 0) * 100).toFixed(1)}%）
        </dd>
        <dt>同期方式</dt>
        <dd>比例同期（動画0〜100% ↔ CSV0〜100%）</dd>
        <dt>現在の対応</dt>
        <dd>
          動画 {currentVideoTimeSec.toFixed(2)}秒 → CSV {csvTime.toFixed(2)}秒
        </dd>
      </dl>
      {level !== "none" && (
        <p className={`sync-info-panel__warning sync-info-panel__warning--${level}`}>
          {level === "strong"
            ? "動画とCSVの長さの差が大きく、同期精度に強い懸念があります。"
            : "動画とCSVの長さにわずかな差があり、時間比率補正を使用しています。"}
        </p>
      )}
      <p className="file-import-panel__note">
        被験者が動画に映っていない区間は、イベント登録・解析の対象としません（要件定義書7.5）。
      </p>
    </div>
  );
}
