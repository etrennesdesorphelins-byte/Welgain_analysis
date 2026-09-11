import { CSV_COLUMN_DEFINITIONS, type ColumnMapping } from "../../domain/csv";

/**
 * 技術提案書7.2：完全一致 → 前後空白除去一致 → 大文字小文字を無視した一致、
 * の順で既知別名リストと照合する。いずれにも一致しない場合はnull（手動割当を要求）。
 */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping = {} as ColumnMapping;

  for (const def of CSV_COLUMN_DEFINITIONS) {
    mapping[def.key] =
      findExactMatch(headers, def.knownAliases) ??
      findTrimmedMatch(headers, def.knownAliases) ??
      findCaseInsensitiveMatch(headers, def.knownAliases);
  }

  return mapping;
}

function findExactMatch(headers: string[], aliases: string[]): string | null {
  for (const alias of aliases) {
    const hit = headers.find((h) => h === alias);
    if (hit) return hit;
  }
  return null;
}

function findTrimmedMatch(headers: string[], aliases: string[]): string | null {
  for (const alias of aliases) {
    const target = alias.trim();
    const hit = headers.find((h) => h.trim() === target);
    if (hit) return hit;
  }
  return null;
}

function findCaseInsensitiveMatch(headers: string[], aliases: string[]): string | null {
  for (const alias of aliases) {
    const target = alias.trim().toLowerCase();
    const hit = headers.find((h) => h.trim().toLowerCase() === target);
    if (hit) return hit;
  }
  return null;
}
