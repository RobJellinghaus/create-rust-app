import React, { useState } from 'react';
import { graphql, useFragment, useLazyLoadQuery, useMutation } from 'react-relay';
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

interface Todo {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export const TodoGraphQLRelay = () => {
  const [text, setText] = useState<string>('');
  
  const data = useLazyLoadQuery<TodoGraphQLRelayQuery>(todosQuery, {
    page: 0,
    pageSize: 5,
  });

  const [createTodo, isCreatePending] = useMutation(createTodoMutation);

  const todos = data.todos?.items || [];
  const totalItems = data.todos?.totalItems || 0;

  const handleCreateTodo = () => {
    if (text.trim()) {
      createTodo({
        variables: { text },
        onCompleted: () => {
          setText('');
          // Relay will automatically update the cache and re-render
          window.location.reload(); // Simple refresh for now
        },
        onError: (error) => {
          console.error('Error creating todo:', error);
        }
      });
    }
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
            <a href="#" className="App-link">
              delete
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