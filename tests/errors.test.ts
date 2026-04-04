import { ErrorCodes, AppError } from '../src/errors';

describe('ErrorCodes', () => {
  test('AUTH_REQUIRED is defined', () => {
    expect(ErrorCodes.AUTH_REQUIRED).toBe('AUTH_REQUIRED');
  });
  test('AUTH_EXPIRED is defined', () => {
    expect(ErrorCodes.AUTH_EXPIRED).toBe('AUTH_EXPIRED');
  });
  test('LIST_NOT_FOUND is defined', () => {
    expect(ErrorCodes.LIST_NOT_FOUND).toBe('LIST_NOT_FOUND');
  });
  test('TASK_NOT_FOUND is defined', () => {
    expect(ErrorCodes.TASK_NOT_FOUND).toBe('TASK_NOT_FOUND');
  });
  test('VALIDATION_ERROR is defined', () => {
    expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
  });
  test('GRAPH_ERROR is defined', () => {
    expect(ErrorCodes.GRAPH_ERROR).toBe('GRAPH_ERROR');
  });
  test('RATE_LIMITED is defined', () => {
    expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
  });
});

describe('AppError', () => {
  test('creates error with code and message', () => {
    const err = new AppError(ErrorCodes.AUTH_REQUIRED, 'test error');
    expect(err.code).toBe('AUTH_REQUIRED');
    expect(err.message).toBe('test error');
    expect(err.name).toBe('AppError');
  });
});
