import * as graph from '../graph/client';
import { printSuccess, printError } from '../output';
import { ErrorCodes, AppError } from '../errors';

async function requireListId(taskId: string): Promise<string> {
  const found = await graph.findTaskById(taskId);
  if (!found) {
    throw new AppError(ErrorCodes.TASK_NOT_FOUND, `Task not found: ${taskId}`);
  }
  return found.listId;
}

function handleError(err: unknown): void {
  const e = err as { code?: string; message?: string };
  printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
}

export async function handleStepList(taskId: string): Promise<void> {
  try {
    if (!taskId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
      return;
    }
    const listId = await requireListId(taskId);
    const steps = await graph.getChecklistItems(listId, taskId);
    printSuccess({ steps });
  } catch (err: unknown) {
    handleError(err);
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
    const listId = await requireListId(taskId);
    const step = await graph.createChecklistItem(listId, taskId, title);
    printSuccess({ step });
  } catch (err: unknown) {
    handleError(err);
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
    const listId = await requireListId(taskId);
    const step = await graph.updateChecklistItem(listId, taskId, stepId, { displayName: options.title });
    printSuccess({ step });
  } catch (err: unknown) {
    handleError(err);
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
    const listId = await requireListId(taskId);
    const step = await graph.updateChecklistItem(listId, taskId, stepId, { isChecked: true });
    printSuccess({ step });
  } catch (err: unknown) {
    handleError(err);
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
    const listId = await requireListId(taskId);
    await graph.deleteChecklistItem(listId, taskId, stepId);
    printSuccess({ deleted: true, stepId });
  } catch (err: unknown) {
    handleError(err);
  }
}

