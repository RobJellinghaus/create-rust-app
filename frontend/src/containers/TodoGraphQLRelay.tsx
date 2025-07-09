import React from 'react';
import { graphql, useFragment, useLazyLoadQuery } from 'react-relay';
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

interface Todo {
  id: number;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export const TodoGraphQLRelay = () => {
  const data = useLazyLoadQuery<TodoGraphQLRelayQuery>(todosQuery, {
    page: 0,
    pageSize: 5,
  });

  const todos = data.todos?.items || [];
  const totalItems = data.todos?.totalItems || 0;

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
            disabled={true}
          />
          <button
            disabled={true}
            style={{ height: '40px' }}
          >
            Add (Coming Soon)
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