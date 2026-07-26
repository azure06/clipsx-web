<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Documentation maintenance

Every feature or behavior change must update the relevant documentation in the
same change set. Keep `docs/backend/` accurate for the implemented state,
including architecture diagrams, data-model descriptions, API/webhook behavior,
environment configuration, operational commands, and test/recovery procedures.
Clearly distinguish implemented behavior from planned/future work. Before
committing, search the documentation for superseded routes, jobs, configuration,
or flows and remove or correct stale references.
