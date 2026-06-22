import { TolgeeClient } from '@ct/tolgee-client'
import { env } from './env'

export const tolgee = new TolgeeClient({
  apiUrl: env.TOLGEE_API_URL,
  projectId: env.TOLGEE_PROJECT_ID,
  apiKey: env.TOLGEE_API_KEY,
})
