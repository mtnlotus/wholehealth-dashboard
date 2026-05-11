export async function acquireTokenClientCredentials(): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: import.meta.env.VITE_AZURE_CLIENT_ID,
    client_secret: import.meta.env.VITE_AZURE_CLIENT_SECRET,
    scope: import.meta.env.VITE_SHC_SCOPE,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Azure token request failed ${res.status}: ${JSON.stringify(err)}`);
  }

  const { access_token } = (await res.json()) as { access_token: string };
  return access_token;
}
