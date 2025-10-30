import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Set up environment variables for testing
process.env.TURSO_CONNECTION_URL = process.env.TURSO_CONNECTION_URL || 'http://localhost:8080'
process.env.TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'test-token'
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'test-secret'
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000'

// Mock Next.js modules
vi.mock('next/image', () => ({
    default: (props: any) => {
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        return <img {...props} />
    },
}))

vi.mock('next/link', () => ({
    default: ({ children, href, ...props }: any) => {
        return (
            <a href={href} {...props}>
                {children}
            </a>
        )
    },
}))

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
}))

// Mock server actions
vi.mock('@/actions/addLink', () => ({
    addLink: vi.fn(),
}))

vi.mock('@/actions/updateLink', () => ({
    updateLink: vi.fn(),
}))

vi.mock('@/actions/fetchMetadata', () => ({
    fetchMetadata: vi.fn(),
}))

vi.mock('@/actions/getCategories', () => ({
    getCategories: vi.fn(),
}))

