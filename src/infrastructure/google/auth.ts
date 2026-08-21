import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient, GoogleAuth, type AuthClient } from "google-auth-library";

import type { ServerEnv } from "@/lib/env";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export class GoogleAuthenticationError extends Error {
  constructor() {
    super("Google authentication failed.");
    this.name = "GoogleAuthenticationError";
  }
}

export function toGoogleAuthenticationError(_error: unknown): GoogleAuthenticationError {
  return new GoogleAuthenticationError();
}

function requireOidcConfiguration(env: ServerEnv) {
  const entries = {
    GCP_PROJECT_NUMBER: env.GCP_PROJECT_NUMBER,
    GCP_SERVICE_ACCOUNT_EMAIL: env.GCP_SERVICE_ACCOUNT_EMAIL,
    GCP_WORKLOAD_IDENTITY_POOL_ID: env.GCP_WORKLOAD_IDENTITY_POOL_ID,
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
  };

  const missing = Object.entries(entries)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing Vercel OIDC configuration: ${missing.join(", ")}`);
  }

  return {
    projectNumber: env.GCP_PROJECT_NUMBER as string,
    serviceAccountEmail: env.GCP_SERVICE_ACCOUNT_EMAIL as string,
    poolId: env.GCP_WORKLOAD_IDENTITY_POOL_ID as string,
    providerId: env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID as string,
  };
}

async function createVercelOidcClient(env: ServerEnv): Promise<AuthClient> {
  const config = requireOidcConfiguration(env);

  const client = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${config.projectNumber}/locations/global/workloadIdentityPools/${config.poolId}/providers/${config.providerId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${config.serviceAccountEmail}:generateAccessToken`,
    subject_token_supplier: {
      getSubjectToken: getVercelOidcToken,
    },
  });

  if (!client) {
    throw new Error("Failed to create Google external account client.");
  }

  client.scopes = [SHEETS_SCOPE];
  return client;
}

async function createApplicationDefaultClient(env: ServerEnv): Promise<AuthClient> {
  const auth = new GoogleAuth({
    scopes: [SHEETS_SCOPE],
    ...(env.GCP_PROJECT_ID ? { projectId: env.GCP_PROJECT_ID } : {}),
  });
  return auth.getClient();
}

export async function createGoogleAuthClient(env: ServerEnv): Promise<AuthClient> {
  if (env.VERCEL || env.VERCEL_OIDC_TOKEN) {
    return createVercelOidcClient(env);
  }

  return createApplicationDefaultClient(env);
}

export async function getGoogleAccessToken(env: ServerEnv): Promise<string> {
  try {
    const client = await createGoogleAuthClient(env);
    const result = await client.getAccessToken();
    const token = typeof result === "string" ? result : result?.token;

    if (!token) {
      throw new Error("Google authentication returned no access token.");
    }

    return token;
  } catch (error) {
    throw toGoogleAuthenticationError(error);
  }
}
