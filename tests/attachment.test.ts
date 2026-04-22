// Tests for attachment upload command handler

import { ErrorCodes } from '../src/errors';

jest.mock('../src/graph/client', () => ({
  findTaskById: jest.fn(),
  uploadAttachment: jest.fn(),
}));

jest.mock('../src/output', () => ({
  printSuccess: jest.fn(),
  printError: jest.fn(),
  _exit: jest.fn(),
}));

jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readFile: jest.fn(),
  },
}));

import * as graph from '../src/graph/client';
import * as output from '../src/output';
import { promises as fs } from 'fs';
import { handleAttachmentUpload } from '../src/commands/attachment';

const mockGraph = graph as jest.Mocked<typeof graph>;
const mockOutput = output as jest.Mocked<typeof output>;
const mockFs = fs as unknown as {
  stat: jest.Mock;
  readFile: jest.Mock;
};

const TASK_ID = 'task-123';
const LIST_ID = 'list-456';
const foundTask = { task: { id: TASK_ID, title: 'Sample' }, listId: LIST_ID };
const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('handleAttachmentUpload', () => {
  test('returns error when task-id is missing', async () => {
    await handleAttachmentUpload({ file: '/tmp/file.txt' });
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
  });

  test('returns error when file is missing', async () => {
    await handleAttachmentUpload({ taskId: TASK_ID });
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.VALIDATION_ERROR, 'file path is required');
  });

  test('returns "File not found" error when stat throws ENOENT', async () => {
    const enoentErr = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' });
    mockFs.stat.mockRejectedValue(enoentErr);
    await handleAttachmentUpload({ taskId: TASK_ID, file: '/tmp/missing.txt' });
    expect(mockOutput.printError).toHaveBeenCalledWith(
      ErrorCodes.VALIDATION_ERROR,
      expect.stringContaining('File not found'),
    );
  });

  test('returns "Cannot access file" error when stat throws non-ENOENT error', async () => {
    const permErr = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    mockFs.stat.mockRejectedValue(permErr);
    await handleAttachmentUpload({ taskId: TASK_ID, file: '/tmp/secret.txt' });
    expect(mockOutput.printError).toHaveBeenCalledWith(
      ErrorCodes.VALIDATION_ERROR,
      expect.stringContaining('Cannot access file'),
    );
  });

  test('returns error when path is not a file', async () => {
    mockFs.stat.mockResolvedValue({ isFile: () => false, size: 0 });
    await handleAttachmentUpload({ taskId: TASK_ID, file: '/tmp' });
    expect(mockOutput.printError).toHaveBeenCalledWith(
      ErrorCodes.VALIDATION_ERROR,
      'file path must point to a file',
    );
  });

  test('returns error when file exceeds 3 MB limit', async () => {
    const oversizeBytes = MAX_FILE_SIZE_BYTES + 1;
    mockFs.stat.mockResolvedValue({ isFile: () => true, size: oversizeBytes });
    await handleAttachmentUpload({ taskId: TASK_ID, file: '/tmp/big.bin' });
    expect(mockOutput.printError).toHaveBeenCalledWith(
      ErrorCodes.VALIDATION_ERROR,
      'attachment must be 3 MB or smaller',
    );
  });

  test('returns error when task is not found', async () => {
    mockFs.stat.mockResolvedValue({ isFile: () => true, size: 10 });
    mockFs.readFile.mockResolvedValue(Buffer.from('abc'));
    mockGraph.findTaskById.mockResolvedValue(null);
    await handleAttachmentUpload({ taskId: TASK_ID, file: '/tmp/file.txt' });
    expect(mockOutput.printError).toHaveBeenCalledWith(ErrorCodes.TASK_NOT_FOUND, expect.stringContaining(TASK_ID));
  });

  test('uploads attachment on success', async () => {
    const buffer = Buffer.from('hello');
    mockFs.stat.mockResolvedValue({ isFile: () => true, size: buffer.length });
    mockFs.readFile.mockResolvedValue(buffer);
    mockGraph.findTaskById.mockResolvedValue(foundTask);
    mockGraph.uploadAttachment.mockResolvedValue({ id: 'att-1', name: 'file.txt', size: buffer.length });

    await handleAttachmentUpload({ taskId: TASK_ID, file: '/tmp/file.txt' });

    expect(mockGraph.findTaskById).toHaveBeenCalledWith(TASK_ID, undefined);
    expect(mockGraph.uploadAttachment).toHaveBeenCalledWith(LIST_ID, TASK_ID, {
      name: 'file.txt',
      contentBytes: buffer.toString('base64'),
      contentType: 'application/octet-stream',
    });
    expect(mockOutput.printSuccess).toHaveBeenCalledWith({
      attachment: { id: 'att-1', name: 'file.txt', size: buffer.length },
    });
  });
});
