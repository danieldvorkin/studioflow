import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const httpLink = createHttpLink({
  uri: `${API_URL}/graphql`
})

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('pilates_token')
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : ''
    }
  }
})

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
})

export default client
