import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { getAccessToken } from '../auth/authManager';
import { ErrorCodes, AppError } from '../errors';
import { TodoTask, TodoList, ChecklistItem, TodoListGroup } from '../schema/types';

const BASE_URL = 'https://graph.microsoft.com/v1.0';
// Small batch size balances latency while reducing Graph API throttling risk.
const TASK_FETCH_BATCH_SIZE = 3;

function normalizeGraphUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl, BASE_URL);
    return parsed.pathname;
  } catch {
    return rawUrl.split('?')[0];
  }
}

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
      if (status === 404) {
        // Determine the missing resource type by examining the URL path.
        const url = normalizeGraphUrl(err.config?.url || '');
        if (/\/listGroups\/[^/]+/.test(url)) {
          throw new AppError(ErrorCodes.LIST_GROUP_NOT_FOUND, 'List group not found');
        }
        if (/\/lists\/[^/]+(?:\/tasks)?$/.test(url)) {
          throw new AppError(ErrorCodes.LIST_NOT_FOUND, 'List not found');
        }
        throw new AppError(ErrorCodes.TASK_NOT_FOUND, 'Resource not found');
      }
      throw new AppError(ErrorCodes.GRAPH_ERROR, err.response?.data?.error?.message || err.message);
    }
  );
  return client;
}

type GraphTask = {
  id: string;
  title: string;
  status?: string;
  body?: { content?: string };
  dueDateTime?: { dateTime?: string };
  importance?: string;
  completedDateTime?: { dateTime?: string };
};

function mapTask(item: GraphTask, listName?: string, listId?: string): TodoTask {
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

type ODataPage<T> = { value?: T[]; '@odata.nextLink'?: string };
type PageItemMapper<TInput, TOutput> = (item: TInput) => TOutput;

async function fetchPaged<TInput, TOutput>(
  client: AxiosInstance,
  url: string,
  mapItem: PageItemMapper<TInput, TOutput>,
): Promise<TOutput[]> {
  const results: TOutput[] = [];
  let nextUrl: string | undefined = url;
  while (nextUrl) {
    const res: AxiosResponse<ODataPage<TInput>> = await client.get(nextUrl);
    for (const item of res.data.value || []) {
      results.push(mapItem(item));
    }
    nextUrl = res.data['@odata.nextLink'];
  }
  return results;
}

export async function getListGroups(): Promise<TodoListGroup[]> {
  const client = createClient();
  return fetchPaged<TodoListGroup, TodoListGroup>(client, '/me/todo/listGroups', (group) => group);
}

export async function getListGroupByName(name: string): Promise<TodoListGroup | null> {
  const groups = await getListGroups();
  return groups.find((g) => g.displayName.toLowerCase() === name.toLowerCase()) || null;
}

export async function createListGroup(displayName: string): Promise<TodoListGroup> {
  const client = createClient();
  const res = await client.post('/me/todo/listGroups', { displayName });
  return res.data;
}

export async function updateListGroup(listGroupId: string, updates: { displayName?: string }): Promise<TodoListGroup> {
  const client = createClient();
  const res = await client.patch(`/me/todo/listGroups/${listGroupId}`, updates);
  return res.data;
}

export async function deleteListGroup(listGroupId: string): Promise<void> {
  const client = createClient();
  await client.delete(`/me/todo/listGroups/${listGroupId}`);
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

export async function getTasks(listId: string, listName?: string): Promise<TodoTask[]> {
  const client = createClient();
  if (listName === undefined) {
    const lists = await getLists();
    const list = lists.find((l) => l.id === listId);
    listName = list?.displayName;
  }
  const res = await client.get(`/me/todo/lists/${listId}/tasks`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data.value || []).map((t: any) => mapTask(t, listName, listId));
}

/** Internal helper: fetch a single task without calling getLists(). */
async function fetchTaskRaw(
  client: AxiosInstance,
  listId: string,
  taskId: string,
  listName?: string,
): Promise<TodoTask> {
  const res = await client.get(`/me/todo/lists/${listId}/tasks/${taskId}`);
  return mapTask(res.data, listName, listId);
}

export async function getTask(listId: string, taskId: string, listName?: string): Promise<TodoTask> {
  const client = createClient();
  if (listName === undefined) {
    const lists = await getLists();
    const list = lists.find((l) => l.id === listId);
    listName = list?.displayName;
  }
  return fetchTaskRaw(client, listId, taskId, listName);
}

export async function createTask(listId: string, task: object, listName?: string): Promise<TodoTask> {
  const client = createClient();
  if (listName === undefined) {
    const lists = await getLists();
    const list = lists.find((l) => l.id === listId);
    listName = list?.displayName;
  }
  const res = await client.post(`/me/todo/lists/${listId}/tasks`, task);
  return mapTask(res.data, listName, listId);
}

export async function updateTask(listId: string, taskId: string, updates: object, listName?: string): Promise<TodoTask> {
  const client = createClient();
  if (listName === undefined) {
    const lists = await getLists();
    const list = lists.find((l) => l.id === listId);
    listName = list?.displayName;
  }
  const res = await client.patch(`/me/todo/lists/${listId}/tasks/${taskId}`, updates);
  return mapTask(res.data, listName, listId);
}

export async function deleteTask(listId: string, taskId: string): Promise<void> {
  const client = createClient();
  await client.delete(`/me/todo/lists/${listId}/tasks/${taskId}`);
}

/**
 * Find a task by its ID across all lists.
 * If listId is provided, only that list is checked (O(1) network calls).
 * Otherwise, getLists() is called ONCE and each list is probed with a single client.
 */
export async function findTaskById(taskId: string, listId?: string): Promise<{ task: TodoTask; listId: string } | null> {
  const client = createClient();
  if (listId) {
    try {
      const task = await fetchTaskRaw(client, listId, taskId);
      return { task, listId };
    } catch (err) {
      if (err instanceof AppError && err.code === ErrorCodes.TASK_NOT_FOUND) return null;
      throw err;
    }
  }
  const lists = await getLists();
  for (const list of lists) {
    try {
      const task = await fetchTaskRaw(client, list.id, taskId, list.displayName);
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

export async function getTasksAcrossLists(): Promise<TodoTask[]> {
  const client = createClient();
  const lists = await fetchPaged<TodoList, Pick<TodoList, 'id' | 'displayName'>>(client, '/me/todo/lists', (list) => ({
    id: list.id,
    displayName: list.displayName,
  }));
  if (lists.length === 0) return [];

  const tasks: TodoTask[] = [];
  for (let batchStartIndex = 0; batchStartIndex < lists.length; batchStartIndex += TASK_FETCH_BATCH_SIZE) {
    const batch = lists.slice(batchStartIndex, batchStartIndex + TASK_FETCH_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (list) => {
        return fetchPaged<GraphTask, TodoTask>(client, `/me/todo/lists/${list.id}/tasks`, (task) =>
          mapTask(task, list.displayName, list.id),
        );
      }),
    );
    tasks.push(...batchResults.flat());
  }

  return tasks;
}
