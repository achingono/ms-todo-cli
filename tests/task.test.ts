import { ErrorCodes } from '../src/errors';

jest.mock('../src/graph/client', () => ({
  getListByName: jest.fn(),
  getTasks: jest.fn(),
  getTasksAcrossLists: jest.fn(),
}));

jest.mock('../src/output', () => ({
  printSuccess: jest.fn(),
  printError: jest.fn(),
  _exit: jest.fn(),
}));

import * as graph from '../src/graph/client';
import * as output from '../src/output';
import { handleTaskList } from '../src/commands/task';

const mockGraph = graph as jest.Mocked<typeof graph>;
const mockOutput = output as jest.Mocked<typeof output>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('handleTaskList', () => {
  test('errors when no list info is provided', async () => {
    await handleTaskList('', {});
    expect(mockOutput.printError).toHaveBeenCalledWith(
      ErrorCodes.VALIDATION_ERROR,
      'list name or list-id is required',
    );
  });

  test('errors when combining all-lists with specific list filters', async () => {
    await handleTaskList('Work', { allLists: true });
    expect(mockOutput.printError).toHaveBeenCalledWith(
      ErrorCodes.VALIDATION_ERROR,
      'Cannot combine --all-lists with --list or --list-id',
    );
  });

  test('lists tasks across all lists', async () => {
    const tasks = [
      { id: '1', title: 'Task One', list: 'Work' },
      { id: '2', title: 'Task Two', list: 'Home' },
    ];
    mockGraph.getTasksAcrossLists.mockResolvedValue(tasks);

    await handleTaskList(undefined, { allLists: true });

    expect(mockGraph.getTasksAcrossLists).toHaveBeenCalled();
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({ tasks });
  });

  test('lists tasks for a specific list name', async () => {
    const list = { id: 'list-1', displayName: 'Work' };
    const tasks = [{ id: '1', title: 'Task One', list: 'Work' }];
    mockGraph.getListByName.mockResolvedValue(list);
    mockGraph.getTasks.mockResolvedValue(tasks);

    await handleTaskList('Work', {});

    expect(mockGraph.getListByName).toHaveBeenCalledWith('Work');
    expect(mockGraph.getTasks).toHaveBeenCalledWith('list-1', 'Work');
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({ tasks });
  });
});
