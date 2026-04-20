#!/usr/bin/env node
import { Command } from 'commander';
import { handleAuthLogin, handleAuthStatus, handleAuthLogout, handleAuthPrintAccount } from './auth';
import { handleListCreate, handleListList } from './commands/list';
import { handleTaskCreate, handleTaskUpdate, handleTaskComplete, handleTaskList, handleTaskGet, handleTaskSearch } from './commands/task';
import { handleStepList, handleStepCreate, handleStepUpdate, handleStepComplete, handleStepDelete } from './commands/step';
import { printError } from './output';
import { ErrorCodes } from './errors';

const program = new Command();

// Override Commander output to always emit JSON — suppress both stdout and stderr
program.exitOverride();
program.configureOutput({
  writeOut: () => { /* suppress Commander's default stdout (help/version text) */ },
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
  .option('--list-id <id>', 'List ID (skips list scan when provided)')
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
  .option('--list-id <id>', 'List ID (skips list scan when provided)')
  .action((opts) => handleTaskComplete(opts.taskId, opts.listId));

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
  .option('--list-id <id>', 'List ID (skips list scan when provided)')
  .action((opts) => handleTaskGet(opts.taskId, opts.listId));

taskCmd
  .command('search')
  .description('Search tasks across all lists by keyword')
  .argument('<keyword>', 'Keyword to match in title or notes')
  .action((keyword) => handleTaskSearch(keyword));

// Step commands (task checklist items)
const stepCmd = program.command('step').description('Task step (checklist item) commands');

stepCmd
  .command('list')
  .description('List steps for a task')
  .requiredOption('--task-id <id>', 'Task ID')
  .action((opts) => handleStepList(opts.taskId));

stepCmd
  .command('create')
  .description('Create a step for a task')
  .requiredOption('--task-id <id>', 'Task ID')
  .requiredOption('--title <title>', 'Step title')
  .action((opts) => handleStepCreate(opts.taskId, opts.title));

stepCmd
  .command('update')
  .description('Update a step')
  .requiredOption('--task-id <id>', 'Task ID')
  .requiredOption('--step-id <id>', 'Step ID')
  .option('--title <title>', 'New step title')
  .action((opts) => handleStepUpdate(opts.taskId, opts.stepId, { title: opts.title }));

stepCmd
  .command('complete')
  .description('Mark a step as complete')
  .requiredOption('--task-id <id>', 'Task ID')
  .requiredOption('--step-id <id>', 'Step ID')
  .action((opts) => handleStepComplete(opts.taskId, opts.stepId));

stepCmd
  .command('delete')
  .description('Delete a step')
  .requiredOption('--task-id <id>', 'Task ID')
  .requiredOption('--step-id <id>', 'Step ID')
  .action((opts) => handleStepDelete(opts.taskId, opts.stepId));

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
  .option('--list-id <id>', 'List ID (skips list scan when provided)')
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
  .option('--list-id <id>', 'List ID (skips list scan when provided)')
  .action((opts) => handleTaskGet(opts.taskId, opts.listId));

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
