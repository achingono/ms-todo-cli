import { promises as fs, Stats } from 'fs';
import path from 'path';
import * as graph from '../graph/client';
import { printError, printSuccess } from '../output';
import { ErrorCodes } from '../errors';

export const MAX_ATTACHMENT_SIZE_BYTES = 3 * 1024 * 1024; // Microsoft Graph simple attachment limit (3 MiB / 3,145,728 bytes)

interface AttachmentOptions {
  taskId?: string;
  listId?: string;
  file?: string;
  name?: string;
}

function handleError(err: unknown): void {
  const e = err as { code?: string; message?: string };
  printError(e.code || ErrorCodes.GRAPH_ERROR, e.message || 'Unknown error');
}

export async function handleAttachmentUpload(options: AttachmentOptions): Promise<void> {
  try {
    if (!options.taskId) {
      printError(ErrorCodes.VALIDATION_ERROR, 'task-id is required');
      return;
    }
    if (!options.file) {
      printError(ErrorCodes.VALIDATION_ERROR, 'file path is required');
      return;
    }

    const filePath = path.resolve(options.file);
    let stats: Stats;
    try {
      stats = await fs.stat(filePath);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'ENOENT') {
        printError(ErrorCodes.VALIDATION_ERROR, `File not found: ${filePath}`);
      } else {
        printError(ErrorCodes.VALIDATION_ERROR, `Cannot access file: ${(err as Error).message}`);
      }
      return;
    }
    if (!stats.isFile()) {
      printError(ErrorCodes.VALIDATION_ERROR, 'file path must point to a file');
      return;
    }
    if (stats.size > MAX_ATTACHMENT_SIZE_BYTES) {
      printError(ErrorCodes.VALIDATION_ERROR, 'attachment must be 3 MiB or smaller');
      return;
    }

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(filePath);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'ENOENT') {
        printError(ErrorCodes.VALIDATION_ERROR, `File not found: ${filePath}`);
      } else {
        printError(ErrorCodes.VALIDATION_ERROR, `Cannot read file: ${(err as Error).message}`);
      }
      return;
    }
    const attachmentName = options.name || path.basename(filePath) || 'attachment';
    const contentBytes = buffer.toString('base64');

    const found = await graph.findTaskById(options.taskId, options.listId);
    if (!found) {
      printError(ErrorCodes.TASK_NOT_FOUND, `Task not found: ${options.taskId}`);
      return;
    }

    const attachment = await graph.uploadAttachment(found.listId, options.taskId, {
      name: attachmentName,
      contentBytes,
      contentType: 'application/octet-stream',
    });
    printSuccess({ attachment });
  } catch (err: unknown) {
    handleError(err);
  }
}
