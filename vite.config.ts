import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const env = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> }
}).process?.env ?? {}
const repositoryName = env.GITHUB_REPOSITORY?.split('/')[1]
const base = env.VITE_BASE_PATH ?? (
  repositoryName && !repositoryName.endsWith('.github.io') ? `/${repositoryName}/` : '/'
)

export default defineConfig({ base, plugins: [react()] })
