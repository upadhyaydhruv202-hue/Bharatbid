import { useEffect, useState, type FormEvent } from 'react';

import { Button, Checkbox, Input, Modal, Select } from '../../ui';
import { controlBase, labelClass } from '../../ui/styles';
import { REQUIREMENT_TYPE_OPTIONS } from './StatusBadge';
import type { RequirementType, TenderRequirement } from '../../services/bharatbid';

export interface RequirementFormValue {
  name: string;
  description: string;
  requirementType: RequirementType;
  mandatory: boolean;
  active: boolean;
  sortOrder: string;
}

const EMPTY: RequirementFormValue = {
  name: '',
  description: '',
  requirementType: 'statutory',
  mandatory: true,
  active: true,
  sortOrder: '',
};

export function RequirementEditor({
  open,
  title,
  initial,
  lockCore = false,
  loading = false,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial?: TenderRequirement | null;
  lockCore?: boolean;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (value: RequirementFormValue) => void;
}) {
  const [form, setForm] = useState<RequirementFormValue>(EMPTY);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (initial) {
      setForm({
        name: initial.name,
        description: initial.description ?? '',
        requirementType: initial.requirementType,
        mandatory: initial.mandatory,
        active: initial.active,
        sortOrder: String(initial.sortOrder),
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, initial]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Classify what must be evidenced later. This does not evaluate bidders."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="requirement-editor-form" loading={loading}>
            Save requirement
          </Button>
        </>
      }
    >
      <form id="requirement-editor-form" className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        {error ? (
          <p className="md:col-span-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Input
          className="md:col-span-2"
          label="Requirement name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          required
        />
        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="requirement-description">
            Description
          </label>
          <textarea
            id="requirement-description"
            className={`${controlBase} mt-1 min-h-[5rem]`}
            maxLength={4000}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </div>
        <Select
          label="Type"
          value={form.requirementType}
          options={REQUIREMENT_TYPE_OPTIONS}
          disabled={lockCore}
          onChange={(event) =>
            setForm((current) => ({ ...current, requirementType: event.target.value as RequirementType }))
          }
        />
        <Input
          label="Sort order"
          type="number"
          min={0}
          value={form.sortOrder}
          hint="Leave blank to append"
          onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
        />
        <Checkbox
          label="Mandatory"
          checked={form.mandatory}
          disabled={lockCore}
          onChange={(event) => setForm((current) => ({ ...current, mandatory: event.target.checked }))}
        />
        <Checkbox
          label="Active"
          checked={form.active}
          onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
        />
        {lockCore ? (
          <p className="md:col-span-2 text-xs text-foreground-muted">
            Type and mandatory flag are locked because bids have already been submitted.
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
