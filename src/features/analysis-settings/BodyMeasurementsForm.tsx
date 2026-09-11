import type { ChangeEvent } from "react";
import type { LengthUnit } from "../../domain/analysisSettings";
import type { AnalysisSettingsState } from "./useAnalysisSettings";

function parseNumberOrNull(text: string): number | null {
  if (text.trim() === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function BodyMeasurementsForm({ state }: { state: AnalysisSettingsState }) {
  const { settings, setThighLength, setShankLength, setPelvisWidth, setLengthUnit } = state;

  function handleChange(setter: (v: number | null) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => setter(parseNumberOrNull(e.target.value));
  }

  return (
    <div className="body-measurements-form">
      <h3>身体計測値</h3>
      <div className="body-measurements-form__row">
        <label>
          大腿長
          <input
            type="number"
            min={0}
            step="0.1"
            value={settings.thighLength ?? ""}
            onChange={handleChange(setThighLength)}
          />
        </label>
        <label>
          下腿長
          <input
            type="number"
            min={0}
            step="0.1"
            value={settings.shankLength ?? ""}
            onChange={handleChange(setShankLength)}
          />
        </label>
        <label>
          骨盤幅
          <input
            type="number"
            min={0}
            step="0.1"
            value={settings.pelvisWidth ?? ""}
            onChange={handleChange(setPelvisWidth)}
          />
        </label>
        <label>
          単位
          <select
            value={settings.lengthUnit}
            onChange={(e) => setLengthUnit(e.target.value as LengthUnit)}
          >
            <option value="cm">cm</option>
            <option value="m">m</option>
          </select>
        </label>
      </div>
      <p className="body-measurements-form__note">
        左右共通値として扱います（初期版の仕様。formulas.md第11章参照）。
      </p>
    </div>
  );
}
