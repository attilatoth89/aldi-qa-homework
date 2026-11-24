export interface User {
  id: string;
  email: string;
  name: string;
}

/** Response of POST /api/auth/login, stored in localStorage while the user is signed in. */
export interface Session {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: User;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}
