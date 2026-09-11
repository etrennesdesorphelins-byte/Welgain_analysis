import { APP_VERSION } from "../../domain/persistence";

/**
 * 要件定義書1章の目的・2章の対応環境をそのまま示す免責事項と、簡単な使い方。
 * 技術提案書20章 Phase 5「利用説明、免責、バージョン表示」に対応する。
 */
export function AppInfoPanel() {
  return (
    <details className="app-info-panel">
      <summary>利用上の注意・使い方（バージョン {APP_VERSION}）</summary>
      <div className="app-info-panel__body">
        <p className="app-info-panel__disclaimer">
          本アプリは、臨床判断を自動化するものではなく、検者が動画から判断したイベントに基づいて定量値を算出する研究支援ツールです。算出結果の臨床的解釈は利用者の責任で行ってください。
        </p>
        <h4>対応ブラウザ</h4>
        <p>
          正式対応：Google Chrome最新版、Microsoft Edge最新版／動作確認対象：Firefox最新版／動作保証対象外：Safari、Internet
          Explorer、スマートフォン・タブレット。
        </p>
        <h4>使い方</h4>
        <ol>
          <li>動画（MP4・推奨H.264）とCSVを選択する。</li>
          <li>CSVの列割当を確認し（自動認識されない場合は手動で選択）、大腿長・下腿長・骨盤幅を入力する。</li>
          <li>動画を再生・コマ送りしながら、Rt_IC・Lt_IC・Rt_Off・Lt_Offを該当フレームで登録する。</li>
          <li>歩幅・歩行相時間・ケイデンス・関節角度波形の結果を確認する。必要に応じてステップ動作・歩行速度も登録する。</li>
          <li>結果をCSV／ZIPで出力する。解析を中断する場合は、解析状態をJSONで保存しておくと同じ動画・CSVで再開できる。</li>
        </ol>
        <p className="app-info-panel__privacy">
          動画・CSVはブラウザ内でのみ処理され、外部（サーバー等）へ送信されません。
        </p>
      </div>
    </details>
  );
}
