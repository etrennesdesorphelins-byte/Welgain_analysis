export type AnalysisMode = "gait" | "step";

interface ModeSelectPageProps {
  onSelect: (mode: AnalysisMode) => void;
}

/** 起動時に歩行解析／ステップ動作解析のどちらを行うかを選択させる。 */
export function ModeSelectPage({ onSelect }: ModeSelectPageProps) {
  return (
    <div className="mode-select-page">
      <h2 className="mode-select-page__title">どちらの解析を行いますか？</h2>
      <div className="mode-select-page__options">
        <button type="button" className="mode-select-page__option" onClick={() => onSelect("gait")}>
          <span className="mode-select-page__option-title">歩行解析</span>
          <span className="mode-select-page__option-desc">
            歩行イベント（IC・Off）を登録し、歩幅・歩行相時間・ケイデンスを算出します。
          </span>
        </button>
        <button type="button" className="mode-select-page__option" onClick={() => onSelect("step")}>
          <span className="mode-select-page__option-title">ステップ動作解析</span>
          <span className="mode-select-page__option-desc">
            ステップ動作（片脚での踏み出し）を登録し、ステップごとの歩幅を算出します。
          </span>
        </button>
      </div>
    </div>
  );
}
