#!/usr/bin/env node
import { Command } from 'commander';
import { handleAuthLogin, handleAuthStatus, handleAuthLogout, handleAuthPrintAccount } from './auth';
import { handleListCreate, handleListList } from './commands/list';
import { handleTaskCreate, handleTaskUpdate, handleTaskComplete, handleTaskList, handleTaskGet } from './commands/task';
import { printError } from './output';
import { ErrorCodes } from './errors';

const program = new Command();

// Override Commander error output to always emit JSON
program.exitOverride();
program.configureOutput({
  writeErr: () => { /* suppress Commander's default stderr */ },
});

program
  .name('ms-todo-cli')
  .description('Microsoft To Do CLI')
  .version('0.1.0');

// Auth commands
const auth = program.command('auth').description('Authentication commands');
auth.command('login').description('Login to Microsoft account').action(handleAuthLogin);
auth.command('status').description('Check authentication status').action(handleAuthStatus);
auth.command('logout').description('Logout from Microsoft account').action(handleAuthLogout);
auth.command('print-account').description('Print current account info').action(handleAuthPrintAccount);

// List commands
const listCmd = program.command('list').description('Todo list management commands');
listCmd.command('create <name>').description('Create a new todo list').action(handleListCreate);
listCmd.command('list').description('List all todo lists').action(handleListList);

// Task commands
const taskCmd = program.command('task').description('Todo task commands');

taskCmd
  .command('create')
  .description('Create a new task')
  .option('--list <name>', 'List name')
  .option('--list-id <id>', 'List ID')
  .option('--title <title>', 'Task title')
  .option('--notes <notes>', 'Task notes')
  .option('--due <date>', 'Due date (ISO 8601)')
  .option('--priority <level>', 'Priority (low|normal|high)')
  .option('--stdin', 'Read JSON from stdin')
  .action((opts) => handleTaskCreate(opts));

taskCmd
  .command('update')
  .description('Update a task')
  .option('--task-id <id>', 'Task ID')
  .option('--title <title>', 'New title')
  .option('--notes <notes>', 'New notes')
  .option('--due <date>', 'Due date (ISO 8601)')
  .option('--priority <level>', 'Priority (low|normal|high)')
  .option('--completed <bool>', 'Mark complete (true/false)')
  .option('--stdin', 'Read JSON from stdin')
  .action((opts) => handleTaskUpdate(opts));

taskCmd
  .command('complete')
  .description('Mark a task as complete')
  .requiredOption('--task-id <id>', 'Task ID')
  .action((opts) => handleTaskComplete(opts.taskId));

taskCmd
  .command('list')
  .description('List tasks in a list')
  .option('--list <name>', 'List name')
  .option('--list-id <id>', 'List ID')
  .action((opts) => handleTaskList(opts.list, { listId: opts.listId }));

taskCmd
  .command('get')
  .description('Get a single task')
  .requiredOption('--task-id <id>', 'Task ID')
  .action((opts) => handleTaskGet(opts.taskId));

// Short-form aliases
program
  .command('create')
  .description('Create a new task (alias for task create)')
  .option('--list <name>', 'List name')
  .option('--list-id <id>', 'List ID')
  .option('--title <title>', 'Task title')
  .option('--notes <notes>', 'Task notes')
  .option('--due <date>', 'Due date (ISO 8601)')
  .option('--priority <level>', 'Priority (low|normal|high)')
  .option('--stdin', 'Read JSON from stdin')
  .action((opts) => handleTaskCreate(opts));

program
  .command('update')
  .description('Update a task (alias for task update)')
  .option('--task-id <id>', 'Task ID')
  .option('--title <title>', 'New title')
  .option('--notes <notes>', 'New notes')
  .option('--due <date>', 'Due date (ISO 8601)')
  .option('--priority <level>', 'Priority (low|normal|high)')
  .option('--completed <bool>', 'Mark complete (true/false)')
  .option('--stdin', 'Read JSON from stdin')
  .action((opts) => handleTaskUpdate(opts));

program
  .command('get')
  .description('Get a single task (alias for task get)')
  .requiredOption('--task-id <id>', 'Task ID')
  .action((opts) => handleTaskGet(opts.taskId));

try {
  program.parse(process.argv);
} catch (err: unknown) {
  if (err && typeof err === 'object' && 'code' in err) {
    const ce = err as { code: string; message: string };
    if (ce.code === 'commander.missingMandatoryOptionValue' || ce.code === 'commander.optionMissingArgument') {
      printError(ErrorCodes.VALIDATION_ERROR, ce.message);
    } else if (ce.code === 'commander.helpDisplayed' || ce.code === 'commander.version') {
      process.exit(0);
    } else {
      printError(ErrorCodes.VALIDATION_ERROR, ce.message);
    }
  } else {
    printError(ErrorCodes.VALIDATION_ERROR, String(err));
  }
}
