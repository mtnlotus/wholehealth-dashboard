import { type Configuration, PublicClientApplication } from "@azure/msal-browser";

const msalConfiguration: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
};

export const msalInstance = new PublicClientApplication(msalConfiguration);
