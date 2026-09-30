# Trainee journal UI — token deposit

This change reads existing role tokens. Values stay in `src/styles/global.css` (`:root`, `.dark`, `@theme inline`). This change does not edit them.

## Roles

- `background`
- `foreground`
- `card`
- `card-foreground`
- `muted`
- `muted-foreground`
- `primary`
- `primary-foreground`
- `accent`
- `accent-foreground`
- `destructive`
- `border`
- `input`
- `ring`

## Why these extras

- `accent` and `accent-foreground` — Sign out uses Button `outline`.
- `muted` — list rows sit on the card.
