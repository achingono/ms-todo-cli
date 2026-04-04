import * as graph from '../graph/client';
import { printSuccess, printError } from '../output';
import { ErrorCodes } from '../errors';

async function resolveListId(taskId: string): Promise<string | null> {
  const found = await graph.findTaskById(taskId);
  return found ? found.listId : null;
}

export async function handleStepList(taskId: string): Promise<void> {
  try {
    if (!taskId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
      return;
    }
    const listId = await resolveListId(taskId);
    if (!listId) {
      printError(ErrorCodes.TASK_NOT_FOUND, `Task not found: ${taskId}`);
      return;
    }
    const steps = await graph.getChecklistItems(listId, taskId);
    printSuccess({ steps });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleStepCreate(taskId: string, title: string): Promise<void> {
  try {
    if (!taskId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
      return;
    }
    if (!title) {
      printError(ErrorCodes.VALIDATION_ERROR, 'title is required');
      return;
    }
    const listId = await resolveListId(taskId);
    if (!listId) {
      printError(ErrorCodes.TASK_NOT_FOUND, `Task not found: ${taskId}`);
      return;
    }
    const step = await graph.createChecklistItem(listId, taskId, title);
    printSuccess({ step });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleStepUpdate(
  taskId: string,
  stepId: string,
  options: { title?: string },
): Promise<void> {
  try {
    if (!taskId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
      return;
    }
    if (!stepId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'step-id is required');
      return;
    }
    if (!options.title) {
      printError(ErrorCodes.VALIDATION_ERROR, 'title is required for update');
      return;
    }
    const listId = await resolveListId(taskId);
    if (!listId) {
      printError(ErrorCodes.TASK_NOT_FOUND, `Task not found: ${taskId}`);
      return;
    }
    const step = await graph.updateChecklistItem(listId, taskId, stepId, { displayName: options.title });
    printSuccess({ step });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleStepComplete(taskId: string, stepId: string): Promise<void> {
  try {
    if (!taskId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
      return;
    }
    if (!stepId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'step-id is required');
      return;
    }
    const listId = await resolveListId(taskId);
    if (!listId) {
      printError(ErrorCodes.TASK_NOT_FOUND, `Task not found: ${taskId}`);
      return;
    }
    const step = await graph.updateChecklistItem(listId, taskId, stepId, { isChecked: true });
    printSuccess({ step });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleStepDelete(taskId: string, stepId: string): Promise<void> {
  try {
    if (!taskId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
      return;
    }
    if (!stepId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'step-id is required');
      return;
    }
    const listId = await resolveListId(taskId);
    if (!listId) {
      printError(ErrorCodes.TASK_NOT_FOUND, `Task not found: ${taskId}`);
      return;
    }
    await graph.deleteChecklistItem(listId, taskId, stepId);
    printSuccess({ deleted: true, stepId });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}
