import * as msal from '@azure/msal-node';
import { DeviceCodeResponse } from '@azure/msal-common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ErrorCodes, AppError } from '../errors';

let keytar: typeof import('keytar') | null = null;
try {
  keytar = require('keytar');
} catch {
  keytar = null;
}

const CLIENT_ID = process.env.MS_TODO_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const SCOPES = ['Tasks.ReadWrite', 'User.Read', 'offline_access'];
const KEYTAR_SERVICE = 'ms-todo-cli';
const KEYTAR_ACCOUNT = 'refresh-token';
const CONFIG_DIR = path.join(os.homedir(), '.ms-todo-cli');
const TOKEN_FILE = path.join(CONFIG_DIR, 'tokens.json');
const MSAL_CACHE_FILE = path.join(CONFIG_DIR, 'msal-cache.json');

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
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
      fs.writeFileSync(this.filePath, cacheContext.tokenCache.serialize());
    }
  }
}

function createPca(): msal.PublicClientApplication {
  const cachePlugin = new FileTokenCache(MSAL_CACHE_FILE);
  const config: msal.Configuration = {
    auth: {
      clientId: CLIENT_ID,
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
  if (keytar) {
    await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, result.account?.homeAccountId || '');
  } else {
    ensureConfigDir();
    fs.writeFileSync(TOKEN_FILE, JSON.stringify({ homeAccountId: result.account?.homeAccountId }));
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
  if (keytar) {
    await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
  }
  if (fs.existsSync(MSAL_CACHE_FILE)) {
    fs.unlinkSync(MSAL_CACHE_FILE);
  }
  if (fs.existsSync(TOKEN_FILE)) {
    fs.unlinkSync(TOKEN_FILE);
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
