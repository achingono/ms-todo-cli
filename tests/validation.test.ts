// Validation tests exercise the real production validators exported from src/commands/task.ts

import { validateTaskCreate, validateTaskUpdate } from '../src/commands/task';

describe('validateTaskCreate', () => {
  test('returns error if title is missing', () => {
    expect(validateTaskCreate({})).toBe('title is required');
  });

  test('returns null if title is provided', () => {
    expect(validateTaskCreate({ title: 'Buy milk' })).toBeNull();
  });

  test('returns error for invalid due date', () => {
    expect(validateTaskCreate({ title: 'Test', due: 'not-a-date' })).toBe('dueDateTime must be a valid ISO 8601 date');
  });

  test('returns null for valid ISO date', () => {
    expect(validateTaskCreate({ title: 'Test', due: '2024-01-01T00:00:00Z' })).toBeNull();
  });
});

describe('validateTaskUpdate', () => {
  test('returns error if taskId is missing', () => {
    expect(validateTaskUpdate({})).toBe('task-id is required');
  });

  test('returns null if taskId is provided', () => {
    expect(validateTaskUpdate({ taskId: 'abc123' })).toBeNull();
  });

  test('returns error for invalid due date', () => {
    expect(validateTaskUpdate({ taskId: 'abc123', due: 'invalid' })).toBe('dueDateTime must be a valid ISO 8601 date');
  });

  test('returns null for valid ISO date', () => {
    expect(validateTaskUpdate({ taskId: 'abc123', due: '2024-06-15' })).toBeNull();
  });
});
