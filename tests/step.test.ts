// Tests for step (checklist item) command handlers

import { ErrorCodes } from '../src/errors';

// Mock graph client and output before importing the module under test
jest.mock('../src/graph/client', () => ({
  findTaskById: jest.fn(),
  getChecklistItems: jest.fn(),
  createChecklistItem: jest.fn(),
  updateChecklistItem: jest.fn(),
  deleteChecklistItem: jest.fn(),
}));

jest.mock('../src/output', () => ({
  printSuccess: jest.fn(),
  printError: jest.fn(),
  _exit: jest.fn(),
}));

import * as graph from '../src/graph/client';
import * as output from '../src/output';
import {
  handleStepList,
  handleStepCreate,
  handleStepUpdate,
  handleStepComplete,
  handleStepDelete,
} from '../src/commands/step';

const mockGraph = graph as jest.Mocked<typeof graph>;
const mockOutput = output as jest.Mocked<typeof output>;

const TASK_ID = 'task-abc';
const LIST_ID = 'list-xyz';
const STEP_ID = 'step-123';

const sampleStep = { id: STEP_ID, displayName: 'Write tests', isChecked: false };
const foundTask = { task: { id: TASK_ID, title: 'My Task', listId: LIST_ID }, listId: LIST_ID };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('handleStepList', () => {
  test('returns error when task-id is missing', async () => {
    await handleStepList('');
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
  });

  test('returns error when task not found', async () => {
    mockGraph.findTaskById.mockResolvedValue(null);
    await handleStepList(TASK_ID);
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.TASK_NOT_FOUND, expect.stringContaining(TASK_ID));
  });

  test('returns steps on success', async () => {
    mockGraph.findTaskById.mockResolvedValue(foundTask);
    mockGraph.getChecklistItems.mockResolvedValue([sampleStep]);
    await handleStepList(TASK_ID);
    expect(mockGraph.getChecklistItems).toHaveBeenCalledWith(LIST_ID, TASK_ID);
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({ steps: [sampleStep] });
  });
});

describe('handleStepCreate', () => {
  test('returns error when task-id is missing', async () => {
    await handleStepCreate('', 'Do something');
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
  });

  test('returns error when title is missing', async () => {
    await handleStepCreate(TASK_ID, '');
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'title is required');
  });

  test('returns error when task not found', async () => {
    mockGraph.findTaskById.mockResolvedValue(null);
    await handleStepCreate(TASK_ID, 'Write tests');
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.TASK_NOT_FOUND, expect.stringContaining(TASK_ID));
  });

  test('creates step on success', async () => {
    mockGraph.findTaskById.mockResolvedValue(foundTask);
    mockGraph.createChecklistItem.mockResolvedValue(sampleStep);
    await handleStepCreate(TASK_ID, 'Write tests');
    expect(mockGraph.createChecklistItem).toHaveBeenCalledWith(LIST_ID, TASK_ID, 'Write tests');
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({ step: sampleStep });
  });
});

describe('handleStepUpdate', () => {
  test('returns error when task-id is missing', async () => {
    await handleStepUpdate('', STEP_ID, { title: 'New title' });
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
  });

  test('returns error when step-id is missing', async () => {
    await handleStepUpdate(TASK_ID, '', { title: 'New title' });
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'step-id is required');
  });

  test('returns error when title is missing', async () => {
    await handleStepUpdate(TASK_ID, STEP_ID, {});
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'title is required for update');
  });

  test('updates step on success', async () => {
    const updatedStep = { ...sampleStep, displayName: 'Updated title' };
    mockGraph.findTaskById.mockResolvedValue(foundTask);
    mockGraph.updateChecklistItem.mockResolvedValue(updatedStep);
    await handleStepUpdate(TASK_ID, STEP_ID, { title: 'Updated title' });
    expect(mockGraph.updateChecklistItem).toHaveBeenCalledWith(LIST_ID, TASK_ID, STEP_ID, { displayName: 'Updated title' });
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({ step: updatedStep });
  });
});

describe('handleStepComplete', () => {
  test('returns error when task-id is missing', async () => {
    await handleStepComplete('', STEP_ID);
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
  });

  test('returns error when step-id is missing', async () => {
    await handleStepComplete(TASK_ID, '');
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'step-id is required');
  });

  test('marks step complete on success', async () => {
    const completedStep = { ...sampleStep, isChecked: true };
    mockGraph.findTaskById.mockResolvedValue(foundTask);
    mockGraph.updateChecklistItem.mockResolvedValue(completedStep);
    await handleStepComplete(TASK_ID, STEP_ID);
    expect(mockGraph.updateChecklistItem).toHaveBeenCalledWith(LIST_ID, TASK_ID, STEP_ID, { isChecked: true });
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({ step: completedStep });
  });
});

describe('handleStepDelete', () => {
  test('returns error when task-id is missing', async () => {
    await handleStepDelete('', STEP_ID);
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
  });

  test('returns error when step-id is missing', async () => {
    await handleStepDelete(TASK_ID, '');
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'step-id is required');
  });

  test('deletes step on success', async () => {
    mockGraph.findTaskById.mockResolvedValue(foundTask);
    mockGraph.deleteChecklistItem.mockResolvedValue(undefined);
    await handleStepDelete(TASK_ID, STEP_ID);
    expect(mockGraph.deleteChecklistItem).toHaveBeenCalledWith(LIST_ID, TASK_ID, STEP_ID);
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({ deleted: true, stepId: STEP_ID });
  });
});
