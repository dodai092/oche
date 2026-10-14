export function resolvePlayers(
  names: string[],
  profiles: { id: string; name: string }[],
  id: () => string = () => crypto.randomUUID(),
) {
  const players = names.map((name) => ({
    id:
      profiles.find((p) => p.name.toLowerCase() === name.trim().toLowerCase())
        ?.id ?? id(),
    name: name.trim(),
  }));
  if (new Set(players.map((p) => p.id)).size !== players.length)
    throw Error(
      "Choose a different player for each position. A saved profile can only play once.",
    );
  return players;
}
