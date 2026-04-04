import axios, { AxiosInstance } from 'axios';
import { getAccessToken } from '../auth/authManager';
import { ErrorCodes, AppError } from '../errors';
import { TodoTask, TodoList, ChecklistItem } from '../schema/types';

const BASE_URL = 'https://graph.microsoft.com/v1.0';

function createClient(): AxiosInstance {
  const client = axios.create({ baseURL: BASE_URL });
  client.interceptors.request.use(async (config) => {
    const token = await getAccessToken();
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
    config.headers['Content-Type'] = 'application/json';
    return config;
  });
  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const status = err.response?.status;
      if (status === 429) throw new AppError(ErrorCodes.RATE_LIMITED, 'Rate limited by Microsoft Graph API');
      if (status === 401 || status === 403) throw new AppError(ErrorCodes.AUTH_EXPIRED, 'Authentication expired or invalid');
      if (status === 404) throw new AppError(ErrorCodes.TASK_NOT_FOUND, 'Resource not found');
      throw new AppError(ErrorCodes.GRAPH_ERROR, err.response?.data?.error?.message || err.message);
    }
  );
  return client;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTask(item: any, listName?: string, listId?: string): TodoTask {
  return {
    id: item.id,
    title: item.title,
    list: listName,
    listId: listId,
    status: item.status,
    notes: item.body?.content,
    dueDateTime: item.dueDateTime?.dateTime,
    priority: item.importance,
    completedDateTime: item.completedDateTime?.dateTime,
  };
}

export async function getLists(): Promise<TodoList[]> {
  const client = createClient();
  const res = await client.get('/me/todo/lists');
  return res.data.value;
}

export async function getListByName(name: string): Promise<TodoList | null> {
  const lists = await getLists();
  return lists.find((l) => l.displayName.toLowerCase() === name.toLowerCase()) || null;
}

export async function createList(displayName: string): Promise<TodoList> {
  const client = createClient();
  const res = await client.post('/me/todo/lists', { displayName });
  return res.data;
}

export async function getTasks(listId: string): Promise<TodoTask[]> {
  const client = createClient();
  const lists = await getLists();
  const list = lists.find((l) => l.id === listId);
  const listName = list?.displayName;
  const res = await client.get(`/me/todo/lists/${listId}/tasks`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data.value || []).map((t: any) => mapTask(t, listName, listId));
}

export async function getTask(listId: string, taskId: string): Promise<TodoTask> {
  const client = createClient();
  const lists = await getLists();
  const list = lists.find((l) => l.id === listId);
  const listName = list?.displayName;
  const res = await client.get(`/me/todo/lists/${listId}/tasks/${taskId}`);
  return mapTask(res.data, listName, listId);
}

export async function createTask(listId: string, task: object): Promise<TodoTask> {
  const client = createClient();
  const lists = await getLists();
  const list = lists.find((l) => l.id === listId);
  const listName = list?.displayName;
  const res = await client.post(`/me/todo/lists/${listId}/tasks`, task);
  return mapTask(res.data, listName, listId);
}

export async function updateTask(listId: string, taskId: string, updates: object): Promise<TodoTask> {
  const client = createClient();
  const lists = await getLists();
  const list = lists.find((l) => l.id === listId);
  const listName = list?.displayName;
  const res = await client.patch(`/me/todo/lists/${listId}/tasks/${taskId}`, updates);
  return mapTask(res.data, listName, listId);
}

export async function deleteTask(listId: string, taskId: string): Promise<void> {
  const client = createClient();
  await client.delete(`/me/todo/lists/${listId}/tasks/${taskId}`);
}

export async function findTaskById(taskId: string): Promise<{ task: TodoTask; listId: string } | null> {
  const lists = await getLists();
  for (const list of lists) {
    try {
      const task = await getTask(list.id, taskId);
      return { task, listId: list.id };
    } catch (err) {
      if (err instanceof AppError && err.code === ErrorCodes.TASK_NOT_FOUND) continue;
      throw err;
    }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapChecklistItem(item: any): ChecklistItem {
  return {
    id: item.id,
    displayName: item.displayName,
    isChecked: item.isChecked ?? false,
    checkedDateTime: item.checkedDateTime,
  };
}

export async function getChecklistItems(listId: string, taskId: string): Promise<ChecklistItem[]> {
  const client = createClient();
  const res = await client.get(`/me/todo/lists/${listId}/tasks/${taskId}/checklistItems`);
  return (res.data.value || []).map(mapChecklistItem);
}

export async function createChecklistItem(listId: string, taskId: string, displayName: string): Promise<ChecklistItem> {
  const client = createClient();
  const res = await client.post(`/me/todo/lists/${listId}/tasks/${taskId}/checklistItems`, { displayName });
  return mapChecklistItem(res.data);
}

export async function updateChecklistItem(
  listId: string,
  taskId: string,
  checklistItemId: string,
  updates: { displayName?: string; isChecked?: boolean },
): Promise<ChecklistItem> {
  const client = createClient();
  const res = await client.patch(
    `/me/todo/lists/${listId}/tasks/${taskId}/checklistItems/${checklistItemId}`,
    updates,
  );
  return mapChecklistItem(res.data);
}

export async function deleteChecklistItem(listId: string, taskId: string, checklistItemId: string): Promise<void> {
  const client = createClient();
  await client.delete(`/me/todo/lists/${listId}/tasks/${taskId}/checklistItems/${checklistItemId}`);
}
