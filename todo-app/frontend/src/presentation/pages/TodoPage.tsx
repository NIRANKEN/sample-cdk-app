import React, { useEffect, useState } from 'react';
import { useTodoStore } from '../store/todoStore';
import { useAuthStore } from '../store/authStore';
import { Todo, CreateTodoInput } from '../../domain/todo'; // UpdateTodoInputも必要に応じて
import { useNavigate } from 'react-router-dom';

const TodoPage: React.FC = () => {
  const { todos, isLoading, error, fetchTodos, addTodo, updateTodo, deleteTodo, toggleTodo, clearError } = useTodoStore();
  const { user, signOut, isAuthenticated } = useAuthStore(); // user情報やsignOut関数も取得
  const navigate = useNavigate(); // react-router-dom v6

  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');

  // 編集中のTodoの状態 (インライン編集用)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editText, setEditText] = useState('');
  const [editDescription, setEditDescription] = useState('');


  useEffect(() => {
    if (!isAuthenticated) {
        navigate('/login'); // 未認証ならログインページへ
    } else {
        fetchTodos(); // 認証済みならTODOを取得
    }
  }, [isAuthenticated, fetchTodos, navigate]);

  useEffect(() => {
    if (error) {
      // TODO: エラー表示を改善 (例: トースト通知)
      console.error("TodoPage Error:", error.message);
      // alert(`Error: ${error.message}`);
      // clearError(); // すぐにクリアするか、ユーザー操作でクリアするか
    }
  }, [error, clearError]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) {
      alert("Title is required.");
      return;
    }
    const todoInput: CreateTodoInput = {
      title: newTodoTitle.trim(),
      description: newTodoDescription.trim() || undefined, // 空文字ならundefined
      // completedはデフォルトでfalseになる想定 (バックエンドまたはドメインモデルで)
    };
    const newTodo = await addTodo(todoInput);
    if (newTodo) {
      setNewTodoTitle('');
      setNewTodoDescription('');
    } else {
      // エラー処理はuseEffectで捕捉されるか、ここで明示的に行う
      // alert("Failed to add todo. See console for details.");
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (window.confirm("Are you sure you want to delete this todo?")) {
      await deleteTodo(todoId);
    }
  };

  const handleToggleTodo = async (todoId: string, currentCompletedStatus: boolean) => {
    await toggleTodo(todoId, currentCompletedStatus);
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
    await updateTodo(editingTodo.todoId, { title: editText.trim(), description: editDescription.trim() || undefined });
    handleCancelEdit(); // 編集モードを終了
  };


  const handleSignOut = () => {
    signOut();
    navigate('/login'); // ログアウト後ログインページへ
  };

  if (isLoading && todos.length === 0) { // 初回ロード時のみ全体ローディング
    return <div style={styles.container}><p>Loading todos...</p></div>;
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

      {error && <p style={{ color: 'red' }}>Error: {error.message} <button onClick={clearError}>Clear</button></p>}

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
        {todos.map((todo) => (
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
                    onChange={() => handleToggleTodo(todo.todoId, todo.completed)}
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
      {todos.length === 0 && !isLoading && <p>No todos yet. Add one above!</p>}
       {/* スタイル定義を追加 */}
      <style>{`
        // LoginPageから持ってきたスタイルと共通化できるものは App.css や index.css に移す
        input[type="email"], input[type="password"], input[type="text"] {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
          margin-bottom: 10px; /* フォーム内の間隔 */
        }
        button { /* 基本的なボタンスタイル */
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
    marginBottom: '10px', // フォーム内の各入力フィールド間のマージン
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
    flexDirection: 'column', // タイトルと説明、アクションを縦に並べる
    // alignItems: 'center', // 縦方向の中央揃えは解除
    padding: '15px',
    borderBottom: '1px solid #eee',
    backgroundColor: '#fff',
    borderRadius: '4px',
    marginBottom: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  completedTodoItem: {
    // textDecoration: 'line-through', // チェックボックスで表現するので不要かも
    backgroundColor: '#e9ecef',
  },
  todoContent: {
    display: 'flex',
    alignItems: 'center',
    flexGrow: 1,
    cursor: 'pointer', // クリックでトグルできるように
  },
  todoTitle: {
    marginLeft: '10px',
    fontSize: '1.1em',
  },
  todoDescription: {
    fontSize: '0.9em',
    color: '#555',
    marginTop: '5px',
    marginLeft: '30px', // チェックボックスの分インデント
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
    // justifyContent: 'flex-end', // 右寄せにする場合
  },
  smallButton: {
    padding: '6px 10px',
    fontSize: '0.85em',
    marginRight: '8px',
    backgroundColor: '#6c757d', // より目立たない色
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
    flexDirection: 'column', // 編集フォーム内も縦に
    width: '100%',
    // alignItems: 'center',
    // gap: '10px',
  }
};

export default TodoPage;
