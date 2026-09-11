import { useState } from "react";

interface TimeRecoveryFormProps {
  onApply: (assumedSampleRateHz: number) => void;
}

const COMMON_RATES = [10, 20, 30, 50, 60, 100];

/**
 * 要件定義書5章「重大な不備は解析を停止し」の例外的な回避手段。
 * 時刻列が実測として使用できない場合に、行番号と仮定サンプリング周波数から
 * 代替の相対時刻を生成する。実測ではないことを利用者に明示したうえで選択させる。
 */
export function TimeRecoveryForm({ onApply }: TimeRecoveryFormProps) {
  const [rateHz, setRateHz] = useState(20);

  return (
    <div className="time-recovery-form">
      <p className="time-recovery-form__warning">
        時刻列が使用できないため、行番号と一定サンプリング周波数を仮定して代替の時刻を生成できます。
        <strong>これは実測値ではなく推定値です。</strong>
        元のCSVで実際に使われているサンプリング周波数が分かっている場合のみ使用してください
        （不明な場合は元データを確認してから読み込み直すことを推奨します）。
      </p>
      <div className="time-recovery-form__row">
        <label>
          仮定サンプリング周波数 (Hz)
          <select value={rateHz} onChange={(e) => setRateHz(Number(e.target.value))}>
            {COMMON_RATES.map((r) => (
              <option key={r} value={r}>
                {r} Hz
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => onApply(rateHz)}>
          この周波数を仮定して時刻を生成する
        </button>
      </div>
    </div>
  );
}
