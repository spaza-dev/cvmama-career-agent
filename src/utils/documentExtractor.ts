import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

// Set worker source for pdfjs-dist
if (typeof window !== "undefined") {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
}

export async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true
  });
  const pdf = await loadingTask.promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: unknown) => {
        if (item && typeof item === "object" && "str" in item) {
          return String((item as { str: string }).str || "");
        }
        return "";
      })
      .join(" ");
    fullText += pageText + "\n\n";
  }

  return fullText.trim();
}

export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (
    name.endsWith(".docx") ||
    type.includes("wordprocessing") ||
    type.includes("docx")
  ) {
    return await extractDocxText(file);
  }

  if (name.endsWith(".pdf") || type.includes("pdf")) {
    return await extractPdfText(file);
  }

  if (name.endsWith(".txt") || type.startsWith("text/")) {
    return await file.text();
  }

  // Fallback try text
  try {
    const txt = await file.text();
    if (txt && txt.length > 20) return txt;
  } catch {
    // ignore
  }

  throw new Error(
    "Unsupported file type. Please upload a PDF (.pdf), Word document (.docx), or Text file (.txt)."
  );
}
