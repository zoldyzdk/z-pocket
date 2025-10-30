import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import LinkCard from '@/components/LinkCard'

test('LinkCard renders with title', () => {
    render(
        <LinkCard
            linkId="test-id"
            title="Test Link Title"
            description="Test description"
            source="https://example.com"
            tags={['test', 'example']}
        />
    )

    expect(screen.getByText('Test Link Title')).toBeDefined()
    expect(screen.getByText('Test description')).toBeDefined()
})

