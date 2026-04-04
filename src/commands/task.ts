import * as readline from 'readline';
import * as graph from '../graph/client';
import { printSuccess, printError } from '../output';
import { ErrorCodes, AppError } from '../errors';

interface TaskCreateOptions {
  list?: string;
  listId?: string;
  title?: string;
  notes?: string;
  due?: string;
  priority?: string;
  stdin?: boolean;
}

interface TaskUpdateOptions {
  taskId?: string;
  listId?: string;
  title?: string;
  notes?: string;
  due?: string;
  priority?: string;
  completed?: string | boolean;
  stdin?: boolean;
}

async function readStdin(): Promise<object> {
  return new Promise((resolve, reject) => {
    let data = '';
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('line', (line) => { data += line; });
    rl.on('close', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON from stdin'));
      }
    });
    rl.on('error', reject);
  });
}

function priorityToImportance(priority?: string): string | undefined {
  switch (priority?.toLowerCase()) {
    case 'low': return 'low';
    case 'high': return 'high';
    case 'normal': return 'normal';
    default: return undefined;
  }
}

export function validateTaskCreate(opts: { title?: string; due?: string }): string | null {
  if (!opts.title) return 'title is required';
  if (opts.due && isNaN(new Date(opts.due).getTime())) return 'dueDateTime must be a valid ISO 8601 date';
  return null;
}

export function validateTaskUpdate(opts: { taskId?: string; due?: string }): string | null {
  if (!opts.taskId) return 'task-id is required';
  if (opts.due && isNaN(new Date(opts.due).getTime())) return 'dueDateTime must be a valid ISO 8601 date';
  return null;
}

export async function handleTaskCreate(options: TaskCreateOptions): Promise<void> {
  try {
    let merged: TaskCreateOptions = { ...options };
    if (options.stdin) {
      const stdinData = await readStdin() as TaskCreateOptions;
      merged = { ...stdinData, ...options };
    }

    if (!merged.title) {
      printError(ErrorCodes.VALIDATION_ERROR, 'title is required');
      return;
    }

    let listId = merged.listId;
    const listName = merged.list;

    if (!listId && listName) {
      const list = await graph.getListByName(listName);
      if (!list) {
        printError(ErrorCodes.LIST_NOT_FOUND, `List not found: ${listName}`);
        return;
      }
      listId = list.id;
    }

    if (!listId) {
      const list = await graph.getListByName('Tasks');
      if (list) {
        listId = list.id;
      } else {
        const lists = await graph.getLists();
        if (lists.length === 0) {
          printError(ErrorCodes.LIST_NOT_FOUND, 'No lists found. Create a list first.');
          return;
        }
        listId = lists[0].id;
      }
    }

    if (merged.due) {
      const d = new Date(merged.due);
      if (isNaN(d.getTime())) {
        printError(ErrorCodes.VALIDATION_ERROR, 'dueDateTime must be a valid ISO 8601 date');
        return;
      }
    }

    const taskBody: Record<string, unknown> = {
      title: merged.title,
    };
    if (merged.notes) {
      taskBody['body'] = { content: merged.notes, contentType: 'text' };
    }
    if (merged.due) {
      taskBody['dueDateTime'] = { dateTime: merged.due, timeZone: 'UTC' };
    }
    const importance = priorityToImportance(merged.priority);
    if (importance) {
      taskBody['importance'] = importance;
    }

    const task = await graph.createTask(listId, taskBody);
    printSuccess({ task });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleTaskUpdate(options: TaskUpdateOptions): Promise<void> {
  try {
    let merged: TaskUpdateOptions = { ...options };
    if (options.stdin) {
      const stdinData = await readStdin() as TaskUpdateOptions;
      merged = { ...stdinData, ...options };
    }

    if (!merged.taskId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
      return;
    }

    const found = await graph.findTaskById(merged.taskId, merged.listId);
    if (!found) {
      printError(ErrorCodes.TASK_NOT_FOUND, `Task not found: ${merged.taskId}`);
      return;
    }

    const updates: Record<string, unknown> = {};
    if (merged.title) updates['title'] = merged.title;
    if (merged.notes) updates['body'] = { content: merged.notes, contentType: 'text' };
    if (merged.due) {
      const d = new Date(merged.due);
      if (isNaN(d.getTime())) {
        printError(ErrorCodes.VALIDATION_ERROR, 'dueDateTime must be a valid ISO 8601 date');
        return;
      }
      updates['dueDateTime'] = { dateTime: merged.due, timeZone: 'UTC' };
    }
    const importance = priorityToImportance(merged.priority);
    if (importance) updates['importance'] = importance;
    const completedValue = merged.completed;
    if (completedValue === 'true' || completedValue === true) {
      updates['status'] = 'completed';
    } else if (completedValue === 'false' || completedValue === false) {
      updates['status'] = 'notStarted';
    }

    const task = await graph.updateTask(found.listId, merged.taskId, updates);
    printSuccess({ task });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleTaskComplete(taskId: string, listId?: string): Promise<void> {
  try {
    if (!taskId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
      return;
    }
    const found = await graph.findTaskById(taskId, listId);
    if (!found) {
      printError(ErrorCodes.TASK_NOT_FOUND, `Task not found: ${taskId}`);
      return;
    }
    const task = await graph.updateTask(found.listId, taskId, { status: 'completed' });
    printSuccess({ task });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleTaskList(listName: string, options: { listId?: string }): Promise<void> {
  try {
    let listId = options.listId;
    if (!listId && listName) {
      const list = await graph.getListByName(listName);
      if (!list) {
        printError(ErrorCodes.LIST_NOT_FOUND, `List not found: ${listName}`);
        return;
      }
      listId = list.id;
    }
    if (!listId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'list name or list-id is required');
      return;
    }
    const tasks = await graph.getTasks(listId);
    printSuccess({ tasks });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}

export async function handleTaskGet(taskId: string, listId?: string): Promise<void> {
  try {
    if (!taskId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
      return;
    }
    const found = await graph.findTaskById(taskId, listId);
    if (!found) {
      printError(ErrorCodes.TASK_NOT_FOUND, `Task not found: ${taskId}`);
      return;
    }
    printSuccess({ task: found.task });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
  }
}
