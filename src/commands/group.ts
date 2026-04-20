import * as graph from '../graph/client';
import { printSuccess, printError } from '../output';
import { ErrorCodes } from '../errors';

interface GroupResolutionOptions {
  groupId?: string;
  group?: string;
}

interface GroupUpdateOptions extends GroupResolutionOptions {
  name?: string;
}

export async function handleGroupCreate(name: string): Promise<void> {
  try {
    if (!name) {
      printError(ErrorCodes.VALIDATION_ERROR, 'name is required');
      return;
    }
    const group = await graph.createListGroup(name);
    printSuccess({ group });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleGroupList(): Promise<void> {
  try {
    const groups = await graph.getListGroups();
    printSuccess({ groups });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleGroupUpdate(options: GroupUpdateOptions): Promise<void> {
  try {
    if (!options.name) {
      printError(ErrorCodes.VALIDATION_ERROR, 'name is required');
      return;
    }
    let groupId = options.groupId;
    if (!groupId && options.group) {
      const existing = await graph.getListGroupByName(options.group);
      if (!existing) {
        printError(ErrorCodes.LIST_GROUP_NOT_FOUND, `List group not found: ${options.group}`);
        return;
      }
      groupId = existing.id;
    }
    if (!groupId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'group-id or group is required');
      return;
    }
    const group = await graph.updateListGroup(groupId, { displayName: options.name });
    printSuccess({ group });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleGroupDelete(options: GroupResolutionOptions): Promise<void> {
  try {
    let groupId = options.groupId;
    if (!groupId && options.group) {
      const existing = await graph.getListGroupByName(options.group);
      if (!existing) {
        printError(ErrorCodes.LIST_GROUP_NOT_FOUND, `List group not found: ${options.group}`);
        return;
      }
      groupId = existing.id;
    }
    if (!groupId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'group-id or group is required');
      return;
    }
    await graph.deleteListGroup(groupId);
    printSuccess({ deleted: true, groupId });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}
