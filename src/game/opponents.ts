export const opponents = [
  {
    id: 'coral',
    name: 'Coral',
    symbol: '◇',
    title: 'Find your feet',
    level: 'Welcoming',
    summary: 'Patient play, room to learn.',
    description: 'A patient introduction. Coral leaves openings while you find your way across.',
    tip: 'Look for a chance to deliver while Coral leaves a route open.',
  },
  {
    id: 'runner',
    name: 'The Runner',
    symbol: '»',
    title: 'Make every move count',
    level: 'Balanced',
    summary: 'Quick deliveries. Race or block?',
    description: 'Always looking for the quickest delivery. Decide when to race and when to block.',
    tip: 'Watch the next delivery. Sometimes blocking buys more time than racing.',
  },
  {
    id: 'guardian',
    name: 'The Guardian',
    symbol: '▥',
    title: 'Find the opening',
    level: 'Challenging',
    summary: 'Tight defence. Find another route.',
    description:
      'Guards your exits and limits your choices. Create a second route to break through.',
    tip: 'Keep two routes available. A single threat is easier to shut down.',
  },
] as const;
export type OpponentId = (typeof opponents)[number]['id'];
export const isOpponent = (id: unknown): id is OpponentId => opponents.some((o) => o.id === id);
export const opponentFor = (id: OpponentId = 'coral') => opponents.find((o) => o.id === id)!;
export const challengeDescription = (difficulty: 'gentle' | 'standard' | 'expert') =>
  difficulty === 'expert'
    ? 'Expert searches up to eight individual moves ahead with a larger search budget. Rivals keep their playing styles and follow the same movement rules. It uses no hidden information and does not enable One Retreat.'
    : difficulty === 'gentle'
      ? 'Gentle uses shorter lookahead and sometimes chooses a less efficient route. Every rival still takes immediate wins and avoids an immediate loss when possible.'
      : 'Standard uses each rival’s usual lookahead: Coral is forgiving, Runner favours delivery speed and Guardian searches further. No difficulty uses hidden information.';
