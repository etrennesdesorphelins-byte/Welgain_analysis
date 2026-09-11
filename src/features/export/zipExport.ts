import JSZip from "jszip";

export interface ZipFileEntry {
  name: string;
  /** CSVテキスト等。BOMは自動付与する。 */
  content: string;
}

/** 要件定義書15.2：複数のCSV出力をZIPにまとめて出力する。 */
export async function downloadCsvZip(zipFileName: string, files: ZipFileEntry[]): Promise<void> {
  const zip = new JSZip();
  const BOM = "﻿";
  for (const file of files) {
    zip.file(file.name, BOM + file.content);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = zipFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
