import type { CsvEncoding } from "../../domain/csv";

const UTF8_BOM = [0xef, 0xbb, 0xbf];

function hasUtf8Bom(bytes: Uint8Array): boolean {
  return UTF8_BOM.every((b, i) => bytes[i] === b);
}

/**
 * 要件定義書4.2：UTF-8、UTF-8 BOM付き、Shift_JISを候補として自動判定する。
 * BOMがあればUTF-8 BOM付きと確定し、なければUTF-8として厳密デコードを試み、
 * 失敗（不正なバイト列）した場合にShift_JISとして再デコードする。
 */
export function decodeCsvBuffer(buffer: ArrayBuffer): {
  text: string;
  encoding: CsvEncoding;
} {
  const bytes = new Uint8Array(buffer);

  if (hasUtf8Bom(bytes)) {
    const text = new TextDecoder("utf-8").decode(bytes.slice(UTF8_BOM.length));
    return { text, encoding: "utf-8-bom" };
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { text, encoding: "utf-8" };
  } catch {
    const text = new TextDecoder("shift_jis").decode(bytes);
    return { text, encoding: "shift_jis" };
  }
}
