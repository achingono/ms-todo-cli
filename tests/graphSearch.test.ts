import axios, { AxiosInstance } from 'axios';

import { searchTasks } from '../src/graph/client';

jest.mock('axios');
jest.mock('../src/auth/authManager', () => ({
  getAccessToken: jest.fn().mockResolvedValue('token'),
}));

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockGet = jest.fn();

const mockClient = {
  get: mockGet,
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
});
