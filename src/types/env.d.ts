/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SMART_CLIENT_ID: string;
  readonly VITE_SMART_PRIVATE_KEY_JWK: string;
  readonly VITE_FHIR_ISS?: string;
  readonly VITE_SHC_CREATE_URL: string;
  readonly VITE_AZURE_CLIENT_ID: string;
  readonly VITE_AZURE_TENANT_ID: string;
  readonly VITE_AZURE_CLIENT_SECRET: string;
  readonly VITE_SHC_SCOPE: string;
  readonly VITE_PDF_FUNCTION_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
