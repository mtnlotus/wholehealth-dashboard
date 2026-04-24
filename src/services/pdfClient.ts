import type { PhpData } from "coach-skills";

export async function generatePdf(
  phpData: PhpData,
  reportDate: string,
  azureBearerToken: string,
): Promise<Blob> {
  const url = import.meta.env.VITE_PDF_FUNCTION_URL;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${azureBearerToken}`,
    },
    body: JSON.stringify({ phpData, reportDate }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`PDF function ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.blob();
}
