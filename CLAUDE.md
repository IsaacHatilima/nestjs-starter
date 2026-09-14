See [AGENTS.md](AGENTS.md). All agent guidance for this project lives there, so there is one file to maintain.

`domain-driver init` (also run by the package's postinstall) re-creates its marked section in this file. If that
happens, delete the section again; `AGENTS.md` keeps the canonical copy, fenced with `prettier-ignore` so the tool still
recognises its own bytes there.

<!-- domain-driver:start -->

## Scaffolding with domain-driver

This project uses [domain-driver](https://github.com/IsaacHatilima/domain-driver) to scaffold feature folders. Scaffold
first, then fill in the generated files. Do not hand-write a layer the tool can generate.

- New feature: `npx domain-driver make:feature <feature>/<Entity> -a`
- One layer in an existing feature: `npx domain-driver make:<layer> <feature>/<Entity>` where layer is types, schema,
  repository, service, controller, component, container, or hook
- Any operation that is not List, Show, Create, Update, or Delete:
  `npx domain-driver make:action <feature>/<Entity> <actionName>`. Add `--with-input` when it takes a request body and
  `--returns one|void` when it does not return a list.

Rules the generated code follows, and that new code must keep:

- One file per action per layer. `findActiveUsers` gets `FindActiveUsers.service.ts`, `FindActiveUsers.repository.ts`,
  and `FindActiveUsers.controller.ts`. It never goes inside `ShowUser.service.ts` or `ListUser.service.ts`.
- Hooks are one file per action too: `<Action><Entity>.hook.ts` exporting `use<Action><Entity>` (for example
  `useListUser`, `useCreateUser`). There is no combined `use<Entity>.ts`.
- The chain is controller or hook, then service, then repository. Business logic lives in services. Data access lives in
  repositories. Controllers validate input and call one service.
- Feature folders are kebab-case (`coffee-type`). Entity, action, and class names are PascalCase (`CoffeeType`,
  `FindActiveUsers`).
- Generated repositories throw until you wire them to your data source. Generated controllers on Node need a line in
  `<feature>.routes.ts`, and on Nest need registering in `<feature>.module.ts`; the tool prints the exact line.

Full guidance: `.claude/skills/domain-driver/SKILL.md`. Re-run `npx domain-driver init` after upgrading domain-driver to
refresh this section.
<!-- domain-driver:end -->
