import { useMutation } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import type { PhpData } from "coach-notes";
import { generatePdf } from "../services/pdfClient";

export function useGeneratePDF() {
  const { instance } = useMsal();
  return useMutation({
    mutationFn: async ({ phpData, reportDate }: { phpData: PhpData; reportDate: string }) => {
      const { accessToken } = await instance.acquireTokenSilent({
        scopes: [import.meta.env.VITE_SHC_SCOPE],
      });
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
