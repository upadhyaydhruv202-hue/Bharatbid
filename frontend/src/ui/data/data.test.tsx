import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataTable } from './DataTable';
import { Pagination } from './Pagination';
import { Search } from './Search';

afterEach(() => {
  cleanup();
});

describe('data displays', () => {
  it('sorts rows locally and shows an empty state', () => {
    const { rerender } = render(
      <DataTable
        columns={[
          { id: 'name', header: 'Name', accessor: 'name', sortable: true },
          { id: 'status', header: 'Status', accessor: 'status' },
        ]}
        rows={[
          { name: 'Bravo', status: 'open' },
          { name: 'Alpha', status: 'closed' },
        ]}
        rowId={(row) => row.name}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Name/ }));
    const cells = screen.getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('Alpha');

    rerender(
      <DataTable
        columns={[{ id: 'name', header: 'Name', accessor: 'name' }]}
        rows={[] as Array<{ name: string }>}
        rowId={(row) => row.name}
        emptyTitle="No rows"
      />,
    );
    expect(screen.getByText('No rows')).toBeInTheDocument();
  });

  it('paginates and disables previous on the first page', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageSize={10} total={25} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('submits search', () => {
    const onSubmit = vi.fn();
    render(<Search value="alpha" onChange={() => undefined} onSubmitSearch={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSubmit).toHaveBeenCalledWith('alpha');
  });
});
