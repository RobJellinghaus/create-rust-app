import { Environment, Network, RecordSource, Store, RequestParameters, Variables } from 'relay-runtime';

// Create a network layer from the fetch function
const network = Network.create(async (params: RequestParameters, variables: Variables) => {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

// Create the Relay environment
const environment = new Environment({
  network,
  store: new Store(new RecordSource()),
});

export default environment;