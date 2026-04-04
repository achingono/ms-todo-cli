import { login, getAccount, logout, isAuthenticated } from './authManager';
import { printSuccess, printError } from '../output';
import { ErrorCodes } from '../errors';

export async function handleAuthLogin(): Promise<void> {
  try {
    await login();
    const account = await getAccount();
    printSuccess({ message: 'Logged in successfully', account });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleAuthStatus(): Promise<void> {
  try {
    const authenticated = await isAuthenticated();
    if (authenticated) {
      const account = await getAccount();
      printSuccess({ authenticated: true, account });
    } else {
      printSuccess({ authenticated: false });
    }
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleAuthLogout(): Promise<void> {
  try {
    await logout();
    printSuccess({ message: 'Logged out successfully' });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleAuthPrintAccount(): Promise<void> {
  try {
    const account = await getAccount();
    if (!account) {
      printError(ErrorCodes.AUTH_REQUIRED, 'Not authenticated. Run: ms-todo-cli auth login');
      return;
    }
    printSuccess({ account });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}
