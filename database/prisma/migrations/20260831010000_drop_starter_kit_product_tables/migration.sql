-- Slice 12: drop unused Starter Kit product tables.
-- Historical create migrations remain intact.

DROP TABLE IF EXISTS "copilot_messages" CASCADE;
DROP TABLE IF EXISTS "copilot_conversations" CASCADE;
DROP TABLE IF EXISTS "rag_chunks" CASCADE;
DROP TABLE IF EXISTS "rag_documents" CASCADE;
DROP TABLE IF EXISTS "anomaly_findings" CASCADE;
DROP TABLE IF EXISTS "automation_action_runs" CASCADE;
DROP TABLE IF EXISTS "automation_executions" CASCADE;
DROP TABLE IF EXISTS "automation_rules" CASCADE;

DROP TYPE IF EXISTS "CopilotMessageRole";
DROP TYPE IF EXISTS "AutomationRuleSource";
DROP TYPE IF EXISTS "AutomationExecutionStatus";
DROP TYPE IF EXISTS "AnomalySeverity";
DROP TYPE IF EXISTS "AnomalyExplanationStatus";

DELETE FROM "role_permissions"
WHERE "permission_id" IN (
  SELECT "id" FROM "permissions"
  WHERE "key" IN (
    'odoo.read',
    'odoo.write',
    'copilot.use',
    'intents.use',
    'rag.use',
    'anomaly.use',
    'automations.read',
    'automations.write',
    'automations.execute'
  )
);

DELETE FROM "permissions"
WHERE "key" IN (
  'odoo.read',
  'odoo.write',
  'copilot.use',
  'intents.use',
  'rag.use',
  'anomaly.use',
  'automations.read',
  'automations.write',
  'automations.execute'
);
