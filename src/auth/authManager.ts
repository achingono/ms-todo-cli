import * as msal from '@azure/msal-node';
import { DeviceCodeResponse } from '@azure/msal-common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ErrorCodes, AppError } from '../errors';

const SCOPES = ['Tasks.ReadWrite', 'User.Read', 'offline_access'];
const CONFIG_DIR = path.join(os.homedir(), '.ms-todo-cli');
const MSAL_CACHE_FILE = path.join(CONFIG_DIR, 'msal-cache.json');

function getClientId(): string {
  const clientId = process.env.MS_TODO_CLIENT_ID;
  if (!clientId) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      'MS_TODO_CLIENT_ID environment variable is not set. Register an Azure app and set this variable to its client ID.',
    );
  }
  return clientId;
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

class FileTokenCache implements msal.ISerializableTokenCache {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  deserialize(): string {
    try {
      if (fs.existsSync(this.filePath)) {
        return fs.readFileSync(this.filePath, 'utf-8');
      }
    } catch {
      // ignore
    }
    return '';
  }

  serialize(): string {
    return '';
  }

  async beforeCacheAccess(cacheContext: msal.TokenCacheContext): Promise<void> {
    const cached = this.deserialize();
    if (cached) {
      cacheContext.tokenCache.deserialize(cached);
    }
  }

  async afterCacheAccess(cacheContext: msal.TokenCacheContext): Promise<void> {
    if (cacheContext.cacheHasChanged) {
      ensureConfigDir();
      fs.writeFileSync(this.filePath, cacheContext.tokenCache.serialize(), { mode: 0o600 });
    }
  }
}

function createPca(): msal.PublicClientApplication {
  const cachePlugin = new FileTokenCache(MSAL_CACHE_FILE);
  const config: msal.Configuration = {
    auth: {
      clientId: getClientId(),
      authority: 'https://login.microsoftonline.com/common',
    },
    cache: {
      cachePlugin,
    },
  };
  return new msal.PublicClientApplication(config);
}

export async function login(): Promise<void> {
  const pca = createPca();
  const deviceCodeRequest: msal.DeviceCodeRequest = {
    scopes: SCOPES,
    deviceCodeCallback: (response: DeviceCodeResponse) => {
      process.stderr.write(response.message + '\n');
    },
  };
  const result = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
  if (!result) {
    throw new AppError(ErrorCodes.AUTH_REQUIRED, 'Login failed: no token returned');
  }
}

export async function getAccessToken(): Promise<string> {
  const pca = createPca();
  const accounts = await pca.getTokenCache().getAllAccounts();
  if (accounts.length === 0) {
    throw new AppError(ErrorCodes.AUTH_REQUIRED, 'Not authenticated. Run: ms-todo-cli auth login');
  }
  const silentRequest: msal.SilentFlowRequest = {
    account: accounts[0],
    scopes: SCOPES,
  };
  try {
    const result = await pca.acquireTokenSilent(silentRequest);
    if (!result || !result.accessToken) {
      throw new AppError(ErrorCodes.AUTH_EXPIRED, 'Token refresh failed');
    }
    return result.accessToken;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ErrorCodes.AUTH_EXPIRED, 'Token expired. Run: ms-todo-cli auth login');
  }
}

export async function logout(): Promise<void> {
  if (fs.existsSync(MSAL_CACHE_FILE)) {
    fs.unlinkSync(MSAL_CACHE_FILE);
  }
}

export async function getAccount(): Promise<{ username: string; name: string; tenantId: string } | null> {
  const pca = createPca();
  const accounts = await pca.getTokenCache().getAllAccounts();
  if (accounts.length === 0) return null;
  const account = accounts[0];
  return {
    username: account.username || '',
    name: account.name || '',
    tenantId: account.tenantId || '',
  };
}

export async function isAuthenticated(): Promise<boolean> {
  const pca = createPca();
  const accounts = await pca.getTokenCache().getAllAccounts();
  return accounts.length > 0;
}
