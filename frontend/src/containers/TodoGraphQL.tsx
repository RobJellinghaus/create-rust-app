import React, { useState } from 'react'
import { gql, useQuery, useMutation } from '@apollo/client'

const GET_TODOS = gql`
  query GetTodos($page: Int, $pageSize: Int) {
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
`

const CREATE_TODO = gql`
  mutation CreateTodo($text: String!) {
    createTodo(text: $text) {
      id
      text
      createdAt
      updatedAt
    }
  }
`

const UPDATE_TODO = gql`
  mutation UpdateTodo($id: ID!, $text: String) {
    updateTodo(id: $id, text: $text) {
      id
      text
      createdAt
      updatedAt
    }
  }
`

const DELETE_TODO = gql`
  mutation DeleteTodo($id: ID!) {
    deleteTodo(id: $id)
  }
`

interface Todo {
  id: string
  text: string
  createdAt: string
  updatedAt: string
}

interface TodosData {
  todos: {
    items: Todo[]
    totalItems: number
    page: number
    pageSize: number
    numPages: number
  }
}

export const TodosGraphQL = () => {
  const [text, setText] = useState<string>('')
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [page, setPage] = useState<number>(0)
  const pageSize = 5

  const { loading, error, data, refetch } = useQuery<TodosData>(GET_TODOS, {
    variables: { page, pageSize },
  })

  const [createTodo, { loading: createLoading }] = useMutation(CREATE_TODO, {
    onCompleted: () => {
      setText('')
      refetch()
    },
  })

  const [updateTodo, { loading: updateLoading }] = useMutation(UPDATE_TODO, {
    onCompleted: () => {
      setText('')
      setSelectedTodo(null)
      refetch()
    },
  })

  const [deleteTodo, { loading: deleteLoading }] = useMutation(DELETE_TODO, {
    onCompleted: () => {
      refetch()
    },
  })

  const handleCreateTodo = async () => {
    if (text.trim()) {
      await createTodo({ variables: { text } })
    }
  }

  const handleUpdateTodo = async () => {
    if (selectedTodo && text.trim()) {
      await updateTodo({ variables: { id: selectedTodo.id, text } })
    }
  }

  const handleDeleteTodo = async (todo: Todo) => {
    await deleteTodo({ variables: { id: todo.id } })
  }

  const handleEditTodo = (todo: Todo) => {
    setSelectedTodo(todo)
    setText(todo.text)
  }

  const handleCancelEdit = () => {
    setSelectedTodo(null)
    setText('')
  }

  const processing = loading || createLoading || updateLoading || deleteLoading

  if (error) {
    return <div>Error: {error.message}</div>
  }

  const todos = data?.todos?.items || []
  const totalItems = data?.todos?.totalItems || 0
  const numPages = data?.todos?.numPages || 1

  return (
    <div style={{ display: 'flex', flexFlow: 'column', textAlign: 'left' }}>
      <h1>Todos (GraphQL)</h1>
      {totalItems === 0 && !loading && "No todos, create one!"}
      {todos.map((todo) =>
        todo.id === selectedTodo?.id ? (
          <div key="form" className="Form">
            <div style={{ display: 'flex' }}>
              <input
                style={{ flex: 1 }}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button
                disabled={processing}
                style={{ height: '40px' }}
                onClick={handleUpdateTodo}
              >
                Save
              </button>
              <button
                disabled={processing}
                style={{ height: '40px' }}
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div key={todo.id} className="Form">
            <div style={{ flex: 1 }}>
              #{todo.id} {todo.text}
            </div>
            <div>
              <a href="#" className="App-link" onClick={() => handleEditTodo(todo)}>
                edit
              </a>
              &nbsp;
              <a href="#" className="App-link" onClick={() => handleDeleteTodo(todo)}>
                delete
              </a>
            </div>
          </div>
        )
      )}
      {selectedTodo === null && (
        <div className="Form">
          <div style={{ display: 'flex' }}>
            <input
              style={{ flex: 1 }}
              placeholder="New todo..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateTodo()
                }
              }}
            />
            <button
              disabled={processing}
              style={{ height: '40px' }}
              onClick={handleCreateTodo}
            >
              Add
            </button>
          </div>
        </div>
      )}
      <div className="Form">
        <div style={{ display: 'flex' }}>
          <button disabled={processing || page === 0} onClick={() => setPage(page - 1)}>{`<<`}</button>
          <span style={{ flex: 1, textAlign: 'center' }}>
            Page {page + 1} of {numPages}
          </span>
          <button
            disabled={processing || page === numPages - 1}
            onClick={() => setPage(page + 1)}
          >{`>>`}</button>
        </div>
      </div>
    </div>
  )
}