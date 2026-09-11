import { useState, type ChangeEvent } from "react";
import type { SavedAnalysisState } from "../../domain/persistence";
import { useSaveLoad } from "./useSaveLoad";

interface FileIdentity {
  fileName: string;
  fileSizeBytes: number;
}

interface SaveLoadPanelProps {
  subjectId: string;
  onSubjectIdChange: (v: string) => void;
  trialName: string;
  onTrialNameChange: (v: string) => void;
  buildCurrentSaveState: () => SavedAnalysisState;
  currentVideoFile: FileIdentity | null;
  currentCsvFile: FileIdentity | null;
  onApply: (state: SavedAnalysisState) => void;
  onSaved: () => void;
}

function identityMismatch(current: FileIdentity | null, saved: FileIdentity): string | null {
  if (!current) return null;
  if (saved.fileName === "" && saved.fileSizeBytes === 0) return null;
  if (current.fileName !== saved.fileName || current.fileSizeBytes !== saved.fileSizeBytes) {
    return `保存時（${saved.fileName}）と現在選択中のファイルが異なる可能性があります。`;
  }
  return null;
}

/** 要件定義書15.3：解析状態のJSON保存・再読込。ファイルの取り違え検出（技術提案書5.4）を含む。 */
export function SaveLoadPanel({
  subjectId,
  onSubjectIdChange,
  trialName,
  onTrialNameChange,
  buildCurrentSaveState,
  currentVideoFile,
  currentCsvFile,
  onApply,
  onSaved,
}: SaveLoadPanelProps) {
  const saveLoad = useSaveLoad();
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);

  function handleSave() {
    const state = buildCurrentSaveState();
    const safeTrialName = (state.trialName || "trial").replace(/[^\w\-ぁ-んァ-ヶ一-龠]/g, "_");
    saveLoad.saveToFile(state, `${safeTrialName}_analysis_state.json`);
    onSaved();
  }

  async function handleLoadChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await saveLoad.loadFromFile(file);
    if (!data) return;

    const warnings: string[] = [];
    const videoWarning = identityMismatch(currentVideoFile, data.video);
    const csvWarning = identityMismatch(currentCsvFile, data.csv);
    if (videoWarning) warnings.push(videoWarning);
    if (csvWarning) warnings.push(csvWarning);
    setLoadWarnings(warnings);

    onApply(data);
  }

  return (
    <div className="save-load-panel">
      <div className="save-load-panel__row">
        <label>
          被験者ID
          <input type="text" value={subjectId} onChange={(e) => onSubjectIdChange(e.target.value)} />
        </label>
        <label>
          試行名
          <input type="text" value={trialName} onChange={(e) => onTrialNameChange(e.target.value)} />
        </label>
      </div>
      <div className="save-load-panel__row">
        <button type="button" onClick={handleSave}>
          解析状態をJSON保存
        </button>
        <label className="save-load-panel__file-label">
          JSON読込
          <input type="file" accept=".json,application/json" onChange={handleLoadChange} />
        </label>
      </div>
      {saveLoad.loadError && <p className="save-load-panel__error">{saveLoad.loadError}</p>}
      {loadWarnings.length > 0 && (
        <ul className="validation-issue-list">
          {loadWarnings.map((w) => (
            <li key={w} className="validation-issue validation-issue--warning">
              <span className="validation-issue__badge">警告</span>
              {w}
            </li>
          ))}
        </ul>
      )}
      <p className="save-load-panel__note">
        同じ動画とCSVを再選択したうえでJSONを読み込むと、イベント等を復元します。動画・CSV本体は保存されません。
      </p>
    </div>
  );
}
