import { requireOwner } from '@/lib/auth/owner';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/ui/panel';
import { ImportWorkbench } from '@/components/admin/import-workbench';

export default async function ImportPage() {
  await requireOwner();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Import a plan"
        description="Paste or upload a structured plan JSON (version 1). It is validated with readable errors, previewed as a dry-run (counts and create-vs-replace), then applied on your confirmation."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Import' }]}
      />

      <Panel className="mb-5 p-4">
        <p className="text-sm text-sd-ink-dull">
          The schema is documented in <span className="sd-numeral text-sd-ink">docs/import-schema.md</span>, with a
          working example at <span className="sd-numeral text-sd-ink">data/samples/sample-plan.json</span>. Importing a
          plan whose slug already exists replaces it entirely (delete then re-import).
        </p>
      </Panel>

      <ImportWorkbench />
    </div>
  );
}
