import React, { useState, useEffect } from 'react';
import { graphql, usePreloadedQuery, useMutation, useQueryLoader } from 'react-relay';
import type { TodoGraphQLRelayQuery } from '../__generated__/TodoGraphQLRelayQuery.graphql.ts';

// Define the query using Relay's graphql template literal
const todosQuery = graphql`
  query TodoGraphQLRelayQuery($page: Int, $pageSize: Int) {
    todos(page: $page, pageSize: $pageSize) {
      items {
        id
        text
        createdAt
        updatedAt
      }
      totalItems
      page
      pageSize
      numPages
    }
  }
`;

// Define the create todo mutation
const createTodoMutation = graphql`
  mutation TodoGraphQLRelayCreateMutation($text: String!) {
    createTodo(text: $text) {
      id
      text
      createdAt
      updatedAt
    }
  }
`;

// Define the delete todo mutation
const deleteTodoMutation = graphql`
  mutation TodoGraphQLRelayDeleteMutation($id: ID!) {
    deleteTodo(id: $id)
  }
`;

interface Todo {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

// Internal component that uses preloaded query
const TodoGraphQLRelayContent = ({ 
  queryRef, 
  loadQuery 
}: { 
  queryRef: any; 
  loadQuery: (variables: { page: number; pageSize: number }, options?: { fetchPolicy?: string }) => void;
}) => {
  const [text, setText] = useState<string>('');

  const data = usePreloadedQuery<TodoGraphQLRelayQuery>(todosQuery, queryRef);

  const [createTodo, isCreatePending] = useMutation(createTodoMutation);
  const [deleteTodo, isDeletePending] = useMutation(deleteTodoMutation);

  const todos = data.todos?.items || [];
  const totalItems = data.todos?.totalItems || 0;

  const handleCreateTodo = () => {
    if (text.trim()) {
      createTodo({
        variables: { text },
        onCompleted: () => {
          setText('');
          // Force network fetch to bypass cache
          loadQuery(
            { page: 0, pageSize: 5 },
            { fetchPolicy: 'network-only' }
          );
        },
        onError: (error) => {
          console.error('Error creating todo:', error);
        }
      });
    }
  };

  const handleDeleteTodo = (todoId: string) => {
    deleteTodo({
      variables: { id: todoId },
      onCompleted: (response) => {
        if (response.deleteTodo) {
          // Force network fetch to bypass cache and show updated list
          loadQuery(
            { page: 0, pageSize: 5 },
            { fetchPolicy: 'network-only' }
          );
        }
      },
      onError: (error) => {
        console.error('Error deleting todo:', error);
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexFlow: 'column', textAlign: 'left' }}>
      <h1>Todos (Relay)</h1>
      
      {totalItems === 0 && "No todos, create one!"}
      
      {todos.map((todo: Todo) => (
        <div key={todo.id} className="Form">
          <div style={{ flex: 1 }}>
            #{todo.id} {todo.text}
          </div>
          <div>
            <a href="#" className="App-link">
              edit
            </a>
            &nbsp;
            <a 
              href="#" 
              className="App-link"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTodo(todo.id);
              }}
              style={{ 
                opacity: isDeletePending ? 0.5 : 1,
                pointerEvents: isDeletePending ? 'none' : 'auto'
              }}
            >
              {isDeletePending ? 'deleting...' : 'delete'}
            </a>
          </div>
        </div>
      ))}
      
      <div className="Form">
        <div style={{ display: 'flex' }}>
          <input
            style={{ flex: 1 }}
            placeholder="New todo..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateTodo()}
            disabled={isCreatePending}
          />
          <button
            onClick={handleCreateTodo}
            disabled={isCreatePending || !text.trim()}
            style={{ height: '40px' }}
          >
            {isCreatePending ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
      
      <div className="Form">
        <div style={{ display: 'flex' }}>
          <button disabled={true}>{`<< (Coming Soon)`}</button>
          <span style={{ flex: 1, textAlign: 'center' }}>
            Page {(data.todos?.page || 0) + 1} of {data.todos?.numPages || 1}
          </span>
          <button disabled={true}>{`>> (Coming Soon)`}</button>
        </div>
      </div>
    </div>
  );
};

// Outer component that manages query loading
export const TodoGraphQLRelay = () => {
  const [queryRef, loadQuery] = useQueryLoader<TodoGraphQLRelayQuery>(todosQuery);
  
  // Load the query initially
  useEffect(() => {
    loadQuery({ page: 0, pageSize: 5 });
  }, [loadQuery]);

  // Show loading state until query is loaded
  if (!queryRef) {
    return <div>Loading Relay todos...</div>;
  }

  return (
    <TodoGraphQLRelayContent 
      queryRef={queryRef} 
      loadQuery={loadQuery}
    />
  );
};