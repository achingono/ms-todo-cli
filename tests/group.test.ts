// Tests for list group command handlers

import { ErrorCodes } from '../src/errors';

// Mock graph client and output before importing the module under test
jest.mock('../src/graph/client', () => ({
  getListGroups: jest.fn(),
  createListGroup: jest.fn(),
  updateListGroup: jest.fn(),
  deleteListGroup: jest.fn(),
  getListGroupByName: jest.fn(),
}));

jest.mock('../src/output', () => ({
  printSuccess: jest.fn(),
  printError: jest.fn(),
  _exit: jest.fn(),
}));

import * as graph from '../src/graph/client';
import * as output from '../src/output';
import { handleGroupCreate, handleGroupList, handleGroupUpdate, handleGroupDelete } from '../src/commands/group';

const mockGraph = graph as jest.Mocked<typeof graph>;
const mockOutput = output as jest.Mocked<typeof output>;

const GROUP_ID = 'group-123';
const sampleGroup = { id: GROUP_ID, displayName: 'Work' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('handleGroupCreate', () => {
  test('returns error when name is missing', async () => {
    await handleGroupCreate('');
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'name is required');
  });

  test('creates group on success', async () => {
    mockGraph.createListGroup.mockResolvedValue(sampleGroup);
    await handleGroupCreate('Work');
    expect(mockGraph.createListGroup).toHaveBeenCalledWith('Work');
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({ group: sampleGroup });
  });
});

describe('handleGroupList', () => {
  test('returns groups on success', async () => {
    mockGraph.getListGroups.mockResolvedValue([sampleGroup]);
    await handleGroupList();
    expect(mockGraph.getListGroups).toHaveBeenCalled();
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({ groups: [sampleGroup] });
  });
});

describe('handleGroupUpdate', () => {
  test('returns error when name is missing', async () => {
    await handleGroupUpdate({});
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'name is required');
  });

  test('returns error when no identifier provided', async () => {
    await handleGroupUpdate({ name: 'Renamed' });
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'group-id or group is required');
  });

  test('returns error when group name not found', async () => {
    mockGraph.getListGroupByName.mockResolvedValue(null);
    await handleGroupUpdate({ group: 'Missing', name: 'Renamed' });
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.LIST_GROUP_NOT_FOUND, expect.stringContaining('Missing'));
  });

  test('updates group by id', async () => {
    const updatedGroup = { ...sampleGroup, displayName: 'Personal' };
    mockGraph.updateListGroup.mockResolvedValue(updatedGroup);
    await handleGroupUpdate({ groupId: GROUP_ID, name: 'Personal' });
    expect(mockGraph.updateListGroup).toHaveBeenCalledWith(GROUP_ID, { displayName: 'Personal' });
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({ group: updatedGroup });
  });

  test('updates group resolved by name', async () => {
    const updatedGroup = { ...sampleGroup, displayName: 'Personal' };
    mockGraph.getListGroupByName.mockResolvedValue(sampleGroup);
    mockGraph.updateListGroup.mockResolvedValue(updatedGroup);
    await handleGroupUpdate({ group: 'Work', name: 'Personal' });
    expect(mockGraph.updateListGroup).toHaveBeenCalledWith(GROUP_ID, { displayName: 'Personal' });
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({ group: updatedGroup });
  });
});

describe('handleGroupDelete', () => {
  test('returns error when no identifier provided', async () => {
    await handleGroupDelete({});
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'group-id or group is required');
  });

  test('returns error when group name not found', async () => {
    mockGraph.getListGroupByName.mockResolvedValue(null);
    await handleGroupDelete({ group: 'Missing' });
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.LIST_GROUP_NOT_FOUND, expect.stringContaining('Missing'));
  });

  test('deletes group by id', async () => {
    mockGraph.deleteListGroup.mockResolvedValue(undefined);
    await handleGroupDelete({ groupId: GROUP_ID });
    expect(mockGraph.deleteListGroup).toHaveBeenCalledWith(GROUP_ID);
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({ deleted: true, groupId: GROUP_ID });
  });

  test('deletes group resolved by name', async () => {
    mockGraph.getListGroupByName.mockResolvedValue(sampleGroup);
    mockGraph.deleteListGroup.mockResolvedValue(undefined);
    await handleGroupDelete({ group: 'Work' });
    expect(mockGraph.deleteListGroup).toHaveBeenCalledWith(GROUP_ID);
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({ deleted: true, groupId: GROUP_ID });
  });
});
