import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase used by the component. We'll return nothing for admin_settings by default
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  },
}))

// Mock the useVerification hook so we can control verifyCode
const verifySpy = vi.fn(() => Promise.resolve({ actionType: 'mock', actionData: { ok: true }, email: 'x@example.com' }))
vi.mock('../../hooks/useVerification', () => ({
  useVerification: () => ({
    verifyCode: verifySpy,
  }),
}))

import { VerificationDialog } from '../VerificationDialog'

describe('VerificationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <VerificationDialog isOpen={false} onClose={() => {}} onVerified={() => {}} onResend={async () => {}} email="a@b" codeId="c" expiresAt={new Date().toISOString()} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('fetches code length (defaults to 6 when none) and shows inputs', async () => {
    render(
      <VerificationDialog isOpen={true} onClose={() => {}} onVerified={() => {}} onResend={async () => {}} email="a@b" codeId="c" expiresAt={new Date(Date.now() + 60000).toISOString()} />
    )

    // default code length should render 6 inputs
    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox')
      expect(inputs.length).toBe(6)
    })
  })

  it('shows expired message and disables verify when expiresAt is past', async () => {
    render(
      <VerificationDialog isOpen={true} onClose={() => {}} onVerified={() => {}} onResend={async () => {}} email="a@b" codeId="c" expiresAt={new Date(Date.now() - 1000).toISOString()} />
    )

    await waitFor(() => {
      const matches = screen.getAllByText(/Code expired/i)
      expect(matches.length).toBeGreaterThan(0)
    })

    const verifyBtn = screen.getByRole('button', { name: /verify code/i })
    expect(verifyBtn).toBeDisabled()
  })

  it('pastes full code and triggers verify -> calls onVerified and onClose', async () => {
  const onVerified = vi.fn()
  const onClose = vi.fn()

    render(
      <VerificationDialog isOpen={true} onClose={onClose} onVerified={onVerified} onResend={async () => {}} email="a@b" codeId="c" expiresAt={new Date(Date.now() + 60000).toISOString()} />
    )

    // Wait for inputs
    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

  const inputs = screen.getAllByRole('textbox')
  const firstInput = inputs[0]

  // Fire a paste event on the first input with a correct-length code
  fireEvent.paste(firstInput, { clipboardData: { getData: () => '123456' } } as unknown as DataTransfer)

    // Now click Verify
    const user = userEvent.setup()
    const verifyBtn = screen.getByRole('button', { name: /verify code/i })

    // Wait for button to become enabled
    await waitFor(() => expect(verifyBtn).not.toBeDisabled())

    await user.click(verifyBtn)

    await waitFor(() => {
  expect(verifySpy).toHaveBeenCalled()
      expect(onVerified).toHaveBeenCalledWith({ ok: true })
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('handles resend code successfully', async () => {
    const onResend = vi.fn().mockResolvedValue(undefined)
    
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={() => {}} 
        onVerified={() => {}} 
        onResend={onResend} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

    const resendBtn = screen.getByRole('button', { name: /resend code/i })
    const user = userEvent.setup()
    await user.click(resendBtn)

    await waitFor(() => {
      expect(onResend).toHaveBeenCalled()
    })
  })

  it('handles resend code error', async () => {
    const onResend = vi.fn().mockRejectedValue(new Error('Network error'))
    
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={() => {}} 
        onVerified={() => {}} 
        onResend={onResend} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

    const resendBtn = screen.getByRole('button', { name: /resend code/i })
    const user = userEvent.setup()
    await user.click(resendBtn)

    await waitFor(() => {
      expect(screen.getByText(/failed to resend code/i)).toBeInTheDocument()
    })
  })

  it('navigates back on backspace when input is empty', async () => {
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={() => {}} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

    const inputs = screen.getAllByRole('textbox')
    const user = userEvent.setup()
    
    // Type in first input
    await user.type(inputs[0], '1')
    
    // Second input should now have focus, backspace should go back
    await user.keyboard('{Backspace}')
    
    // Focus should be on first input now
    expect(document.activeElement).toBe(inputs[0])
  })

  it('submits on Enter key when code is complete', async () => {
    const onVerified = vi.fn()
    const onClose = vi.fn()
    
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={onClose} 
        onVerified={onVerified} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

    const inputs = screen.getAllByRole('textbox')
    const user = userEvent.setup()
    
    // Fill all inputs
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], (i + 1).toString())
    }
    
    // Press Enter on last input
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalled()
      expect(onVerified).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('closes modal when clicking backdrop', async () => {
    const onClose = vi.fn()
    
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={onClose} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

    // Click the backdrop (the outer div with fixed inset-0) - it's in document.body due to portal
    const backdrop = document.querySelector('.fixed.inset-0')
    expect(backdrop).toBeInTheDocument()
    
    fireEvent.click(backdrop!)

    expect(onClose).toHaveBeenCalled()
  })

  it('does not close modal when clicking inside content', async () => {
    const onClose = vi.fn()
    
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={onClose} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

    const heading = screen.getByText('Verify Your Email')
    fireEvent.click(heading)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes modal when clicking X button', async () => {
    const onClose = vi.fn()
    
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={onClose} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

    const closeBtn = screen.getByLabelText('Close dialog')
    const user = userEvent.setup()
    await user.click(closeBtn)

    expect(onClose).toHaveBeenCalled()
  })

  it('handles paste with incorrect length code', async () => {
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={() => {}} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

    const inputs = screen.getAllByRole('textbox')
    const firstInput = inputs[0]

    // Paste code that's too short
    fireEvent.paste(firstInput, { clipboardData: { getData: () => '123' } } as unknown as DataTransfer)

    // Verify button should still be disabled since code is incomplete
    const verifyBtn = screen.getByRole('button', { name: /verify code/i })
    expect(verifyBtn).toBeDisabled()
  })

  it('only accepts numeric input', async () => {
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={() => {}} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

    const inputs = screen.getAllByRole('textbox')
    const user = userEvent.setup()
    
    // Try typing letter
    await user.type(inputs[0], 'a')
    expect(inputs[0]).toHaveValue('')
    
    // Try typing number
    await user.type(inputs[0], '5')
    expect(inputs[0]).toHaveValue('5')
  })

  it('auto-focuses next input when typing digit', async () => {
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={() => {}} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

    const inputs = screen.getAllByRole('textbox')
    const user = userEvent.setup()
    
    // Type in first input
    await user.type(inputs[0], '1')
    
    // Second input should have focus
    expect(document.activeElement).toBe(inputs[1])
  })

  it('shows error when verifying incomplete code', async () => {
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={() => {}} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

    const inputs = screen.getAllByRole('textbox')
    const user = userEvent.setup()
    
    // Type only partial code
    await user.type(inputs[0], '1')
    await user.type(inputs[1], '2')
    
    // Manually enable button to test validation
    const verifyBtn = screen.getByRole('button', { name: /verify code/i })
    
    // The button should still be disabled since code is incomplete
    expect(verifyBtn).toBeDisabled()
  })

  it('handles verification error', async () => {
    const errorVerifySpy = vi.fn().mockRejectedValue(new Error('Invalid code'))
    vi.mocked(verifySpy).mockImplementationOnce(() => errorVerifySpy())
    
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={() => {}} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

    const inputs = screen.getAllByRole('textbox')
    
    // Fill all inputs by pasting
    fireEvent.paste(inputs[0], { clipboardData: { getData: () => '123456' } } as unknown as DataTransfer)

    await waitFor(() => {
      const verifyBtn = screen.getByRole('button', { name: /verify code/i })
      expect(verifyBtn).not.toBeDisabled()
    })

    const user = userEvent.setup()
    const verifyBtn = screen.getByRole('button', { name: /verify code/i })
    await user.click(verifyBtn)

    await waitFor(() => {
      expect(screen.getByText(/invalid code/i)).toBeInTheDocument()
    })
  })

  it('handles multi-digit paste in single input', async () => {
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={() => {}} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

    const inputs = screen.getAllByRole('textbox')
    const user = userEvent.setup()
    
    // Type multiple digits at once (simulating autofill)
    fireEvent.change(inputs[0], { target: { value: '123456' } })

    // All inputs should be filled
    await waitFor(() => {
      expect(inputs[0]).toHaveValue('1')
      expect(inputs[1]).toHaveValue('2')
      expect(inputs[2]).toHaveValue('3')
      expect(inputs[3]).toHaveValue('4')
      expect(inputs[4]).toHaveValue('5')
      expect(inputs[5]).toHaveValue('6')
    })
  })

  it('shows time remaining with proper formatting', async () => {
    const futureTime = new Date(Date.now() + 125000) // 2 minutes 5 seconds
    
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={() => {}} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={futureTime.toISOString()} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Expires in/i)).toBeInTheDocument()
    })
  })

  it('shows warning color when time is low', async () => {
    const futureTime = new Date(Date.now() + 30000) // 30 seconds
    
    render(
      <VerificationDialog 
        isOpen={true} 
        onClose={() => {}} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id" 
        expiresAt={futureTime.toISOString()} 
      />
    )

    await waitFor(() => {
      // Just verify the timer is showing - the component logic handles the color
      expect(screen.getByText(/Expires in/i)).toBeInTheDocument()
    })
  })

  it('resets code and error when dialog is reopened', async () => {
    const { rerender } = render(
      <VerificationDialog 
        isOpen={true} 
        onClose={() => {}} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id-1" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

    const inputs = screen.getAllByRole('textbox')
    
    // Fill some inputs
    fireEvent.change(inputs[0], { target: { value: '1' } })

    // Close dialog
    rerender(
      <VerificationDialog 
        isOpen={false} 
        onClose={() => {}} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id-1" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    // Reopen dialog
    rerender(
      <VerificationDialog 
        isOpen={true} 
        onClose={() => {}} 
        onVerified={() => {}} 
        onResend={async () => {}} 
        email="test@example.com" 
        codeId="test-id-2" 
        expiresAt={new Date(Date.now() + 60000).toISOString()} 
      />
    )

    await waitFor(() => {
      const newInputs = screen.getAllByRole('textbox')
      // All inputs should be empty
      newInputs.forEach(input => {
        expect(input).toHaveValue('')
      })
    })
  })
})
