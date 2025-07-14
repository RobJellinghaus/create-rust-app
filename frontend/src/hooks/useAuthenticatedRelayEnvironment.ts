import { useMemo } from 'react';
import { Environment, Network, RecordSource, Store, RequestParameters, Variables } from 'relay-runtime';
import { useAuth } from './useAuth';

export const useAuthenticatedRelayEnvironment = () => {
  const auth = useAuth();

  return useMemo(() => {
    // Create a network layer that includes authentication headers
    const network = Network.create(async (params: RequestParameters, variables: Variables) => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include authorization header if we have an access token
          ...(auth.accessToken && { Authorization: `Bearer ${auth.accessToken}` }),
        },
        body: JSON.stringify({
          query: params.text,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`Network error: ${response.status}`);
      }

      return response.json();
    });

    // Create the Relay environment with the authenticated network
    return new Environment({
      network,
      store: new Store(new RecordSource()),
    });
  }, [auth.accessToken]); // Recreate environment when access token changes
};