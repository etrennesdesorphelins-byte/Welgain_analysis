/** 技術提案書13.3：波形グラフのSVGをPNG画像として保存する。 */
export async function exportSvgAsPng(
  svgElement: SVGSVGElement,
  fileName: string,
  scale = 2,
): Promise<void> {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("SVGの画像化に失敗しました。"));
    });
    image.src = svgUrl;
    await loaded;

    const viewBox = svgElement.viewBox.baseVal;
    const width = viewBox && viewBox.width > 0 ? viewBox.width : svgElement.clientWidth || 720;
    const height = viewBox && viewBox.height > 0 ? viewBox.height : svgElement.clientHeight || 280;

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fcfcfb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!pngBlob) return;

    const pngUrl = URL.createObjectURL(pngBlob);
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(pngUrl);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
