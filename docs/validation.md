# 基準データ・受入誤差定義書（Phase 0）

**文書版:** 0.1
**作成日:** 2026年9月11日

本書は、[formulas.md](formulas.md)で転記した計算式をアプリに実装する際の自動テストの基準（フィクスチャ・許容誤差・検証ケース）を定義する。技術提案書17.2「基準データ検証」に対応する。

## 1. 基準データセット

| ファイル | 内容 |
|---|---|
| `test-data/subject01_raw.csv` | アプリへ入力する生CSV（計算済み列を含まない）。元ファイル「糸瀬　快適歩行　テストデータ.csv」と同一内容、305データ行、約20Hz |
| `test-data/subject01_body_measurements.json` | 身体計測値（大腿長52cm、下腿長49cm、骨盤幅31cm、左右共通） |
| `test-data/subject01_expected_segment_values.csv` | 既存Excel（糸瀬　快適歩行　計算済み　5.3.xlsx）のAB・AC・AD・AE・AM・AN・AP・AQ・AR列をそのまま転記した期待値。`row_index`は`subject01_raw.csv`の行番号（ヘッダ=1行目、データ1行目=2）と対応する。294データ行分（row_index 2〜295）を収録 |
| `test-data/subject01_raw_fixed_time.csv` | `subject01_raw.csv`のUnixTime列のみを修正したもの（Phase 1で発見：元列は305行すべて同一値"1.77779E+12"で時刻として機能しない）。先頭行のUnixTime実測値を起点に、Phase 0で確認した約20Hz（50ms間隔）で機械的に埋め直した。角度・セグメント値など他の列は一切変更していない。Phase 2以降、時間補間・イベント登録・歩幅計算の動作確認にはこちらを使用する |

いずれも数値データのみで、個人を特定できる情報（氏名・被験者ID等）は含まない。元のExcel・CSVファイル名には被験者の氏名が含まれていたため、`test-data/`配下ではファイル名を`subject01_*`に匿名化した。

**注記（Phase 1で発見）**：`subject01_raw.csv`のUnixTime列は、元のExcel保存時に有効数字6桁へ丸められたため、実運用のCSV検証機能によって「時刻列から有効なサンプリング間隔を算出できない」というブロッキングエラーとして正しく検出される。歩幅計算式自体（第2〜3章）は時刻列を使わないため無影響だが、時間軸を使う検証・デモには`subject01_raw_fixed_time.csv`を使うこと。

## 2. 検証観点と対応関数

`subject01_raw.csv`の各データ行について、[formulas.md](formulas.md)の関数を適用した結果が`subject01_expected_segment_values.csv`の対応行と一致することを確認する。

| 検証対象列 | 対応関数 |
|---|---|
| right_thigh_ap_AB, left_thigh_ap_AC | `segmentApOffset`（大腿） |
| right_shank_ap_AD, left_shank_ap_AE | `segmentApOffset`（下腿） |
| right_leg_distance_AM, left_leg_distance_AN | `legDistalPosition` |
| pelvis_correction_AP | `pelvisRotationCorrection`（基準フレーム＝CSV1行目のLowerBack.Single.Euler.x） |
| stride_no_pelvis_AQ | `rawStrideLength` |
| stride_with_pelvis_AR | `pelvisCorrectedStrideLength` |

## 3. 許容誤差

- **単体テスト（Excel基準値との照合）**：絶対誤差 \(1\times10^{-6}\) cm または相対誤差 \(1\times10^{-9}\) のいずれか緩い方を満たすこと。Excel・TypeScriptとも倍精度浮動小数点であり、`sin`・`radians`変換の実装差はこの範囲に収まる想定。乖離した場合は角度⇔ラジアン変換式や列参照の誤りを疑う。
- **画面表示**：小数第2位（cm、0.1mm相当）に丸めて表示する。丸めは表示直前のみで行い、内部計算・CSV出力は丸めない（要件定義書10.3、技術提案書10.3に準拠）。
- **CSV出力**：倍精度浮動小数点の文字列表現をそのまま出力する（丸めない）。
- 数値表示の最終桁数・許容誤差は要件定義書19章の未確定事項であり、上記は暫定値。Phase 0完了時点の暫定合意として扱い、Phase 1実装時に関係者へ確認する。

## 4. `subject01`データ内で確認できる検証ケース

既存Excelの実データから、以下のケースが実際に発生していることを確認済み（技術提案書17.2の推奨検証ケースに対応）。

| ケース | 該当行（row_index） | 備考 |
|---|---|---|
| 右足前方（歩幅が負） | 2〜11 | stride_no_pelvis_AQ < 0 |
| 左足前方（歩幅が正） | 12〜 | stride_no_pelvis_AQ > 0 |
| 骨盤回旋補正 ≒ 0 | 2〜4 | pelvis_correction_AP = 0（基準フレームに近い） |
| 骨盤回旋補正が負 | 5〜15 | pelvis_correction_AP < 0 |
| 骨盤回旋補正が正 | 17〜21 | pelvis_correction_AP > 0 |

## 5. `subject01`データだけではカバーできない検証ケース

以下は、既存Excelにイベント登録・補間機構が存在しないため、`subject01`の転記だけでは検証できない。イベント登録・時間補間機能をPhase 2で実装する際に、別途手作りの小規模フィクスチャを追加作成する。

- CSVデータ点と完全に一致する時刻へのイベント登録（補間なしで値が取得できること）
- CSV2点間の中間時刻への線形補間
- 欠損値（NaN・空欄）を挟むイベント時刻の扱い
- 同一フレームへのRt_ICとLt_Offの重複登録
- 不完全な歩行周期（イベント不足）の除外
- 左右位置差がちょうど0になるケース（`subject01`データには厳密な0が存在しないため、合成データで作成する）

これらのフィクスチャは`test-data/synthetic_*`として、Phase 2実装時にformulas.md第9章の未確定事項（骨盤回旋補正の基準フレーム等）の決定と合わせて追加する。

## 6. 自動テストへの組み込み（Phase 1以降）

Vitest導入後、以下の形でテスト化する。

1. `subject01_raw.csv`と`subject01_body_measurements.json`を読み込み、`domain`層の関数で全行を再計算する
2. `subject01_expected_segment_values.csv`と行単位・列単位で突合し、第3章の許容誤差で比較する
3. 差異があれば、該当行番号・列名・実測値・期待値・差分をテスト失敗メッセージに含める

このテストはCIパイプライン（技術提案書21章のGitHub Actions）で毎回実行し、計算式変更時の回帰を検出する。
