"use client";

import React, { useEffect, useState } from 'react';
import { useTodoStore } from '../../presentation/store/todoStore';
import { useAuthStore } from '../../presentation/store/authStore';
import { Todo, CreateTodoInput } from '../../domain/todo';
import { useRouter } from 'next/navigation';

interface TodoListClientProps {
  initialTodos: Todo[];
  // idToken?: string; // Store should get token from authStore or other means if needed for actions
}

const TodoListClient: React.FC<TodoListClientProps> = ({ initialTodos }) => {
  // Initialize store with server-fetched todos using the action
  const initializeTodosInStore = useTodoStore(state => state.initializeTodos);
  useEffect(() => {
    initializeTodosInStore(initialTodos);
  }, [initialTodos, initializeTodosInStore]);

  const { todos, isLoading, error, addTodo, updateTodo, deleteTodo, toggleTodo, clearError } = useTodoStore();
  const { user, signOut, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');

  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editText, setEditText] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    // This effect handles redirection if auth state changes on client AFTER initial load.
    // Initial auth check and redirect for SSR/middleware handled before this component loads.
    if (!isAuthenticated && typeof window !== 'undefined') { // check typeof window for client-side only execution
        router.push('/login');
    }
    // SSR provides initial todos, so client-side fetchTodos on mount is no longer needed *unless*
    // you specifically want to re-validate or refresh data immediately on client load.
    // else if (isAuthenticated) {
    //   fetchTodos(); // Or manage via store's own initialization logic if preferred
    // }
  }, [isAuthenticated, router]); // Removed fetchTodos from here, as initial data comes from props

  useEffect(() => {
    if (error) {
      console.error("TodoListClient Error:", error.message);
      // alert(`Error: ${error.message}`); // Consider a more user-friendly notification system
    }
  }, [error]); // Removed clearError, let user or other logic handle it

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) {
      alert("Title is required.");
      return;
    }
    const todoInput: CreateTodoInput = {
      title: newTodoTitle.trim(),
      description: newTodoDescription.trim() || undefined,
    };
    const newTodo = await addTodo(todoInput); // addTodo should handle token internally via authStore
    if (newTodo) {
      setNewTodoTitle('');
      setNewTodoDescription('');
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (window.confirm("Are you sure you want to delete this todo?")) {
      await deleteTodo(todoId); // deleteTodo should handle token internally
    }
  };

  const handleToggleTodo = async (todoId: string, currentCompletedStatus: boolean) => {
    await toggleTodo(todoId, currentCompletedStatus); // toggleTodo should handle token internally
  };

  const handleStartEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setEditText(todo.title);
    setEditDescription(todo.description || '');
  };

  const handleCancelEdit = () => {
    setEditingTodo(null);
    setEditText('');
    setEditDescription('');
  };

  const handleSaveEdit = async () => {
    if (!editingTodo || !editText.trim()) {
        alert("Title cannot be empty.");
        return;
    }
    await updateTodo(editingTodo.todoId, { title: editText.trim(), description: editDescription.trim() || undefined }); // updateTodo should handle token internally
    handleCancelEdit();
  };

  const handleSignOut = () => {
    signOut();
    router.push('/login');
  };

  // isLoading from store now primarily reflects client-side operations (add, update, delete)
  // Initial page load indicator should be handled by Suspense in the parent server component if data fetching is slow.
  if (isLoading && todos.length === 0 && initialTodos.length === 0) { // Adjusted loading condition
    return <div style={styles.container}><p>Loading...</p></div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>My Todos</h1>
        <div>
          {user && <span style={styles.userInfo}>Logged in as: {user.email || user.username}</span>}
          <button onClick={handleSignOut} style={styles.signOutButton}>Sign Out</button>
        </div>
      </header>

      {error && <p style={{ color: 'red' }}>Error: {error.message} <button onClick={clearError}>Clear Error</button></p>}

      <form onSubmit={handleAddTodo} style={styles.form}>
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="Todo title"
          style={styles.input}
          required
        />
        <input
          type="text"
          value={newTodoDescription}
          onChange={(e) => setNewTodoDescription(e.target.value)}
          placeholder="Todo description (optional)"
          style={styles.input}
        />
        <button type="submit" style={styles.button} disabled={isLoading}>
          {isLoading ? 'Adding...' : 'Add Todo'}
        </button>
      </form>

      <ul style={styles.todoList}>
        {(todos.length > 0 ? todos : initialTodos).map((todo) => ( // Use store todos if populated, else initialTodos
          <li key={todo.todoId} style={todo.completed ? {...styles.todoItem, ...styles.completedTodoItem} : styles.todoItem}>
            {editingTodo && editingTodo.todoId === todo.todoId ? (
              <div style={styles.editForm}>
                <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{...styles.input, flexGrow: 1}}
                />
                <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description"
                    style={{...styles.input, flexGrow: 1, marginTop: '5px'}}
                />
                <button onClick={handleSaveEdit} style={styles.smallButton}>Save</button>
                <button onClick={handleCancelEdit} style={{...styles.smallButton, ...styles.cancelButton}}>Cancel</button>
              </div>
            ) : (
              <>
                <div style={styles.todoContent} onClick={() => handleToggleTodo(todo.todoId, todo.completed)}>
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    readOnly // onChange is handled by div click
                    style={styles.checkbox}
                  />
                  <span style={styles.todoTitle}>{todo.title}</span>
                </div>
                {todo.description && <p style={styles.todoDescription}>{todo.description}</p>}
                <div style={styles.todoActions}>
                  <button onClick={() => handleStartEdit(todo)} style={styles.smallButton} disabled={isLoading}>Edit</button>
                  <button onClick={() => handleDeleteTodo(todo.todoId)} style={{...styles.smallButton, ...styles.deleteButton}} disabled={isLoading}>Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {(todos.length === 0 && initialTodos.length === 0) && !isLoading && <p>No todos yet. Add one above!</p>}
      <style>{`
        input[type="email"], input[type="password"], input[type="text"] {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
          margin-bottom: 10px;
        }
        button {
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          background-color: #007bff;
          color: white;
          cursor: pointer;
          font-size: 16px;
        }
        button:disabled {
          background-color: #aaa;
        }
        button:hover:not(:disabled) {
            opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

// Styles object (copied from original page.tsx, ensure it's defined or imported)
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '700px',
    margin: '20px auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '1px solid #eee',
  },
  userInfo: {
    marginRight: '15px',
    fontSize: '0.9em',
    color: '#555',
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    fontSize: '0.9em',
    padding: '8px 12px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '25px',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '10px',
    fontSize: '1em',
  },
  button: {
    padding: '12px 18px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1em',
  },
  todoList: {
    listStyle: 'none',
    padding: 0,
  },
  todoItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '15px',
    borderBottom: '1px solid #eee',
    backgroundColor: '#fff',
    borderRadius: '4px',
    marginBottom: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  completedTodoItem: {
    backgroundColor: '#e9ecef',
  },
  todoContent: {
    display: 'flex',
    alignItems: 'center',
    flexGrow: 1,
    cursor: 'pointer',
  },
  todoTitle: {
    marginLeft: '10px',
    fontSize: '1.1em',
  },
  todoDescription: {
    fontSize: '0.9em',
    color: '#555',
    marginTop: '5px',
    marginLeft: '30px',
    wordBreak: 'break-word',
  },
  checkbox: {
    marginRight: '10px',
    width: '20px',
    height: '20px',
  },
  todoActions: {
    display: 'flex',
    marginTop: '10px',
  },
  smallButton: {
    padding: '6px 10px',
    fontSize: '0.85em',
    marginRight: '8px',
    backgroundColor: '#6c757d',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  cancelButton: {
    backgroundColor: '#ffc107',
    color: '#212529'
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  }
};

export default TodoListClient;
