import { useMutation } from "@tanstack/react-query";
import type { PhpData } from "coach-notes";
import { useAppStore } from "../store/appStore";
import { generatePdf } from "../services/pdfClient";

export function useGeneratePDF() {
  const smartClient = useAppStore((s) => s.smartClient);

  return useMutation({
    mutationFn: async ({ phpData, reportDate }: { phpData: PhpData; reportDate: string }) => {
      // Uses the active EHR session token — consistent with SHC auth.
      // Requires the PDF Azure Function to accept SMART on FHIR tokens.
      const accessToken = smartClient?.getState("tokenResponse.access_token") as
        | string
        | undefined;
      if (!accessToken) {
        throw new Error("No active EHR session. Launch from an EHR to generate a PDF.");
      }
      return generatePdf(phpData, reportDate, accessToken);
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "personal-health-plan.pdf";
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
