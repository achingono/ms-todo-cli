// Tests for task search command handler

import { ErrorCodes } from '../src/errors';
import { TodoTask } from '../src/schema/types';

jest.mock('../src/graph/client', () => ({
  searchTasks: jest.fn(),
}));

jest.mock('../src/output', () => ({
  printSuccess: jest.fn(),
  printError: jest.fn(),
  _exit: jest.fn(),
}));

import * as graph from '../src/graph/client';
import * as output from '../src/output';
import { handleTaskSearch } from '../src/commands/task';

const mockGraph = graph as jest.Mocked<typeof graph>;
const mockOutput = output as jest.Mocked<typeof output>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('handleTaskSearch', () => {
  test('errors when keyword is missing', async () => {
    await handleTaskSearch('');
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'keyword is required');
  });

  test('errors when keyword normalizes to empty', async () => {
    await handleTaskSearch('!!!');
    expect(mockGraph.searchTasks).not.toHaveBeenCalled();
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'keyword is required');
  });

  test('errors when no tasks match', async () => {
    mockGraph.searchTasks.mockResolvedValue([]);
    await handleTaskSearch('milk');
    expect(mockGraph.searchTasks).toHaveBeenCalledWith('milk');
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.TASK_NOT_FOUND, 'No tasks matched "milk"');
  });

  test('prints tasks when matches found', async () => {
    const tasks: TodoTask[] = [{ id: '1', title: 'Buy milk', list: 'Shopping' }];
    mockGraph.searchTasks.mockResolvedValue(tasks);
    await handleTaskSearch('milk');
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({ tasks });
  });
});
