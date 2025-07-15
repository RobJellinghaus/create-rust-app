import { createContext, useContext } from 'react';
import { Environment } from 'relay-runtime';

// Create a context for the Relay environment
export const RelayEnvironmentContext = createContext<Environment | null>(null);

// Hook to access the Relay environment from anywhere in the app
export const useRelayEnvironment = () => {
  const environment = useContext(RelayEnvironmentContext);
  if (!environment) {
    throw new Error('useRelayEnvironment must be used within a RelayEnvironmentProvider');
  }
  return environment;
};

// Function to invalidate Relay cache for todo-related queries
export const invalidateRelayTodoCache = (environment: Environment) => {
  // Clear the entire store - this will cause all queries to refetch
  environment.getStore().getSource().clear();
  
  // Alternative: More targeted invalidation (if we knew specific record IDs)
  // environment.getStore().invalidateStore();
};

// Function to refetch a specific query (if we have the query reference)
export const refetchRelayQuery = (environment: Environment, queryName: string) => {
  // This would require keeping track of active queries
  // For now, we'll use the simpler cache clearing approach
  invalidateRelayTodoCache(environment);
};