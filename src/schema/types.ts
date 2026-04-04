export interface ChecklistItem {
  id: string;
  displayName: string;
  isChecked: boolean;
  checkedDateTime?: string;
}

export interface TodoTask {
  id: string;
  title?: string;
  list?: string;
  listId?: string;
  status?: string;
  notes?: string;
  dueDateTime?: string;
  priority?: string;
  completedDateTime?: string;
  steps?: ChecklistItem[];
}

export interface TodoList {
  id: string;
  displayName: string;
}

export interface AuthAccount {
  username: string;
  name: string;
  tenantId: string;
}
