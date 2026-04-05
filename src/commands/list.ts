import * as graph from '../graph/client';
import { printSuccess, printError } from '../output';
import { ErrorCodes } from '../errors';

export async function handleListCreate(name: string): Promise<void> {
  try {
    const list = await graph.createList(name);
    printSuccess({ list });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleListList(): Promise<void> {
  try {
    const lists = await graph.getLists();
    printSuccess({ lists });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}
