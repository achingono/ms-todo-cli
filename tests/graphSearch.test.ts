import axios, { AxiosInstance } from 'axios';

import { createListGroup, getListGroups, getLists, searchTasks, updateListGroup } from '../src/graph/client';

jest.mock('axios');
jest.mock('../src/auth/authManager', () => ({
  getAccessToken: jest.fn().mockResolvedValue('token'),
}));

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();

const mockClient = {
  get: mockGet,
  post: mockPost,
  patch: mockPatch,
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
} as unknown as AxiosInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockAxios.create.mockReturnValue(mockClient);
});

describe('searchTasks', () => {
  test('normalizes search terms before building filter params', async () => {
    mockGet.mockResolvedValueOnce({ data: { value: [{ id: 'list-1', displayName: 'Inbox' }] } });
    mockGet.mockResolvedValueOnce({ data: { value: [] } });

    await searchTasks('  FoO!!!   bar  ');

    const [, requestConfig] = mockGet.mock.calls[1];
    const params = requestConfig?.params as Record<string, string>;

    expect(params['@term']).toBe("'foo bar'");
    expect(params.$filter).toContain('@term');
  });

  test('handles search terms that normalize to an empty string', async () => {
    await expect(searchTasks('  !!!   ???  ')).resolves.toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  test('handles whitespace-only search terms', async () => {
    await expect(searchTasks('     ')).resolves.toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  test('preserves and normalizes unicode search terms consistently', async () => {
    mockGet.mockResolvedValueOnce({ data: { value: [{ id: 'list-1', displayName: 'Inbox' }] } });
    mockGet.mockResolvedValueOnce({ data: { value: [] } });

    await searchTasks('  Café   résumé  ');

    const [, requestConfig] = mockGet.mock.calls[1];
    const params = requestConfig?.params as Record<string, string>;

    expect(params['@term']).toBe("'café résumé'");
    expect(params.$filter).toContain('@term');
  });
});

describe('getLists', () => {
  test('uses provided client when available', async () => {
    const providedClient = {
      get: jest.fn().mockResolvedValue({ data: { value: [{ id: 'list-42', displayName: 'Provided' }] } }),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    } as unknown as AxiosInstance;

    const lists = await getLists(providedClient);

    expect(lists).toEqual([{ id: 'list-42', displayName: 'Provided' }]);
    expect(providedClient.get).toHaveBeenCalledWith('/me/todo/lists');
    expect(mockAxios.create).not.toHaveBeenCalled();
  });

  test('creates a new client when none is provided', async () => {
    mockGet.mockResolvedValueOnce({ data: { value: [{ id: 'list-1', displayName: 'Inbox' }] } });

    const lists = await getLists();

    expect(mockAxios.create).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/me/todo/lists');
    expect(lists).toEqual([{ id: 'list-1', displayName: 'Inbox' }]);
  });
});

describe('list groups', () => {
  test('maps beta task groups name to displayName', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        value: [
          { id: 'group-1', name: 'Work', isDefaultGroup: false, groupKey: 'k1', changeKey: 'c1' },
        ],
      },
    });

    await expect(getListGroups()).resolves.toEqual([{ id: 'group-1', displayName: 'Work' }]);
    expect(mockGet).toHaveBeenCalledWith('/me/outlook/taskGroups');
  });

  test('returns an empty list when beta task groups response has no value array', async () => {
    mockGet.mockResolvedValueOnce({ data: {} });

    await expect(getListGroups()).resolves.toEqual([]);
  });

  test('creates a beta task group from the returned name field', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'group-2', name: 'Personal', isDefaultGroup: false, groupKey: 'k2', changeKey: 'c2' },
    });

    await expect(createListGroup('Personal')).resolves.toEqual({ id: 'group-2', displayName: 'Personal' });
    expect(mockAxios.create).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/me/outlook/taskGroups', { name: 'Personal' });
  });

  test('handles update responses that do not include a body', async () => {
    mockPatch.mockResolvedValueOnce({
      data: { id: 'group-3', name: 'Renamed', isDefaultGroup: false, groupKey: 'k3', changeKey: 'c3' },
    });

    await expect(updateListGroup('group-3', { displayName: 'Renamed' })).resolves.toEqual({
      id: 'group-3',
      displayName: 'Renamed',
    });
    expect(mockPatch).toHaveBeenCalledWith('/me/outlook/taskGroups/group-3', { name: 'Renamed' });
  });
});
