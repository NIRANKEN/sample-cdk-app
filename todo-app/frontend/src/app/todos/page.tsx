import { cookies } from 'next/headers';
import { redirect } from 'next/navigation'; // For server-side redirects
import { Todo } from '../../domain/todo'; // Adjusted path
import { TodoApplicationService } from '../../application/todoService'; // Adjusted path
import { ApiTodoRepository } from '../../infrastructure/api/apiTodoRepository'; // Adjusted path
import TodoListClient from '../../components/todos/TodoListClient'; // Adjusted path
import React from 'react';

// Helper function to instantiate services (or use a DI container approach)
function getTodoService() {
  const todoRepository = new ApiTodoRepository();
  return new TodoApplicationService(todoRepository);
}

// This is a React Server Component
export default async function TodoPageSSR() {
  const cookieStore = await cookies();
  // Attempt to get idToken from cookies. Adjust cookie name as necessary.
  const idToken = cookieStore.get('id_token')?.value || cookieStore.get('access_token')?.value;

  if (!idToken) {
    // If no token, redirect to login. Middleware should ideally handle this,
    // but as a fallback or for direct access scenarios.
    // The redirect URL should be absolute or correctly resolved by Next.js.
    // Using a relative path might be problematic in server components.
    // Consider redirect('/login?next_url=/todos');
    console.log("TodoPageSSR: No idToken found, redirecting to /login");
    redirect('/login'); // Ensure this path is correctly handled
  }

  const todoService = getTodoService();
  let initialTodos: Todo[] = [];
  let error: string | null = null;

  try {
    console.log("TodoPageSSR: Fetching todos with token:", idToken ? "Token Present" : "Token Absent");
    initialTodos = await todoService.getMyTodos(idToken);
    console.log("TodoPageSSR: Todos fetched successfully:", initialTodos.length);
  } catch (err: any) {
    console.error('TodoPageSSR: Failed to fetch todos on server:', err);
    error = err.message || 'Failed to load todos.';
    // Optionally, if todos are critical and fetch fails, redirect or show a global error.
    // For now, we'll pass the error to the client to display.
  }

  // If there was an error fetching todos, we can pass it to the client component
  if (error) {
    return (
      <div>
        <h1>Error loading todos</h1>
        <p>{error}</p>
        <p>Please try refreshing the page or contact support.</p>
      </div>
    );
  }

  return (
    <React.Suspense fallback={<div>Loading todos on server...</div>}>
      <TodoListClient initialTodos={initialTodos} />
    </React.Suspense>
  );
}
