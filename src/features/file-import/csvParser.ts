import Papa from "papaparse";
import type { ParsedCsv } from "../../domain/csv";
import { decodeCsvBuffer } from "./csvEncoding";

export async function parseCsvFile(file: File): Promise<ParsedCsv> {
  const buffer = await file.arrayBuffer();
  const { text, encoding } = decodeCsvBuffer(buffer);

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = result.meta.fields ?? [];

  return {
    fileName: file.name,
    fileSizeBytes: file.size,
    encoding,
    headers,
    rows: result.data,
  };
}
