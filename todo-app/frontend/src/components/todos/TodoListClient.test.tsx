import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; // For extended matchers
import TodoListClient from './TodoListClient';
import { useTodoStore } from '../../presentation/store/todoStore';
import { useAuthStore } from '../../presentation/store/authStore';
import { useRouter } from 'next/navigation'; // Import useRouter

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Zustand stores
jest.mock('../../presentation/store/todoStore');
jest.mock('../../presentation/store/authStore');

const mockUseTodoStore = useTodoStore as jest.MockedFunction<typeof useTodoStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;


describe('TodoListClient', () => {
  const mockPush = jest.fn();
  const mockSignOut = jest.fn();
  const mockClearErrorTodos = jest.fn();
  const mockInitializeTodos = jest.fn();
  const mockAddTodo = jest.fn();
  const mockDeleteTodo = jest.fn();
  const mockToggleTodo = jest.fn();
  const mockUpdateTodo = jest.fn();


  const initialTodos = [
    { todoId: '1', userId: 'user1', title: 'Test Todo 1', description: 'Desc 1', completed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { todoId: '2', userId: 'user1', title: 'Test Todo 2', description: 'Desc 2', completed: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  beforeEach(() => {
    // Reset mocks before each test
    mockPush.mockClear();
    mockSignOut.mockClear();
    mockClearErrorTodos.mockClear();
    mockInitializeTodos.mockClear();
    mockAddTodo.mockResolvedValue({ ...initialTodos[0], todoId: 'newId' }); // Example return for addTodo
    mockDeleteTodo.mockResolvedValue(undefined);
    mockToggleTodo.mockResolvedValue({ ...initialTodos[0], completed: !initialTodos[0].completed });
    mockUpdateTodo.mockResolvedValue({ ...initialTodos[0], title: 'Updated Title' });


    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
      pathname: '/todos',
      query: {},
      asPath: '/todos',
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      }
    } as any); // Cast to any to satisfy complex type if only push is used

    mockUseAuthStore.mockReturnValue({
      user: { username: 'testuser', email: 'test@example.com' },
      idToken: 'fake-id-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      signOut: mockSignOut,
      checkAuthState: jest.fn().mockResolvedValue(undefined),
      signIn: jest.fn().mockResolvedValue(undefined),
      signUp: jest.fn().mockResolvedValue({ userConfirmed: false }),
      confirmSignUp: jest.fn().mockResolvedValue('SUCCESS'),
      forgotPassword: jest.fn().mockResolvedValue(undefined),
      confirmPassword: jest.fn().mockResolvedValue('SUCCESS'),
      clearError: jest.fn(),
    });

    mockUseTodoStore.mockReturnValue({
      todos: initialTodos, // Start with initialTodos for some tests
      isLoading: false,
      error: null,
      initializeTodos: mockInitializeTodos,
      fetchTodos: jest.fn().mockResolvedValue(undefined),
      addTodo: mockAddTodo,
      updateTodo: mockUpdateTodo,
      deleteTodo: mockDeleteTodo,
      toggleTodo: mockToggleTodo,
      clearError: mockClearErrorTodos,
    });
  });

  test('renders initial todos', () => {
    render(<TodoListClient initialTodos={initialTodos} />);
    expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument();
    // Check if initializeTodos was called
    expect(mockInitializeTodos).toHaveBeenCalledWith(initialTodos);
  });

  test('calls addTodo when add button is clicked', async () => {
    render(<TodoListClient initialTodos={[]} />); // Start with no todos for this test

    fireEvent.change(screen.getByPlaceholderText('Todo title'), { target: { value: 'New Todo' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Todo/i }));

    await waitFor(() => {
      expect(mockAddTodo).toHaveBeenCalledWith({ title: 'New Todo', description: undefined });
    });
  });

  test('calls deleteTodo when delete button is clicked', async () => {
    // Mock window.confirm to always return true for this test
    window.confirm = jest.fn(() => true);

    render(<TodoListClient initialTodos={initialTodos} />);
    // Assuming the first delete button corresponds to the first todo
    // This might need more specific selectors if there are many similar buttons
    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteTodo).toHaveBeenCalledWith(initialTodos[0].todoId);
    });
  });

  test('calls toggleTodo when a todo item content is clicked', async () => {
    render(<TodoListClient initialTodos={initialTodos} />);
    // Click on the text of the first todo to toggle it
    fireEvent.click(screen.getByText(initialTodos[0].title));

    await waitFor(() => {
      expect(mockToggleTodo).toHaveBeenCalledWith(initialTodos[0].todoId, initialTodos[0].completed);
    });
  });

  test('signs out when sign out button is clicked', () => {
    render(<TodoListClient initialTodos={initialTodos} />);
    fireEvent.click(screen.getByRole('button', { name: /Sign Out/i }));
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  test('redirects to /login if not authenticated (client-side check)', () => {
    // Override the auth store mock for this specific test
    mockUseAuthStore.mockReturnValueOnce({
        ...useAuthStore.getState(), // get default state
        isAuthenticated: false, // not authenticated
        user: null,
        idToken: null,
        isLoading: false, // ensure not loading
    });
    render(<TodoListClient initialTodos={[]} />);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  // TODO: Add tests for edit functionality
  // TODO: Add tests for error display when todoStore.error is set
});

// Note: This is a basic skeleton. More comprehensive tests would cover:
// - Edge cases (e.g., empty todo list, API errors from store actions)
// - Form validation for adding todos
// - Full edit todo workflow (start edit, change input, save, cancel)
// - Loading states from the store
// - Accessibility

// To run this test:
// 1. Ensure Jest and React Testing Library are set up for your Next.js project.
//    See Next.js documentation: https://nextjs.org/docs/app/building-your-application/testing/jest
// 2. Make sure this file is in a `__tests__` directory or ends with `.test.tsx` / `.spec.tsx`.
// 3. Run your test command (e.g., `pnpm test`).
