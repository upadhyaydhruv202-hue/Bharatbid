import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { Input } from './Input';
import { Select } from './Select';
import { Badge } from './Badge';
import { Alert } from './Alert';

afterEach(() => {
  cleanup();
});

describe('form primitives', () => {
  it('renders button variants, loading, and click handlers', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('associates input labels and surfaces validation errors', () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('renders select options and checkbox state', () => {
    render(
      <>
        <Select label="Status" options={[{ value: 'open', label: 'Open' }]} defaultValue="open" />
        <Checkbox label="Subscribe" defaultChecked />
      </>,
    );
    expect(screen.getByLabelText('Status')).toHaveValue('open');
    expect(screen.getByLabelText('Subscribe')).toBeChecked();
  });

  it('renders badges and alerts', () => {
    render(
      <>
        <Badge tone="success">Ready</Badge>
        <Alert variant="error" title="Failed">
          Try again
        </Alert>
      </>,
    );
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
  });
});
