export const opponents = [
  {
    id: 'coral',
    name: 'Coral',
    symbol: '◇',
    title: 'Find your feet',
    level: 'Welcoming',
    description: 'A patient introduction. Coral leaves openings while you find your way across.',
    tip: 'Look for a chance to deliver while Coral leaves a route open.',
  },
  {
    id: 'runner',
    name: 'The Runner',
    symbol: '»',
    title: 'Make every move count',
    level: 'Balanced',
    description: 'Always looking for the quickest delivery. Decide when to race and when to block.',
    tip: 'Watch the next delivery. Sometimes blocking buys more time than racing.',
  },
  {
    id: 'guardian',
    name: 'The Guardian',
    symbol: '▥',
    title: 'Find the opening',
    level: 'Challenging',
    description:
      'Guards your exits and limits your choices. Create a second route to break through.',
    tip: 'Keep two routes available. A single threat is easier to shut down.',
  },
] as const;
export type OpponentId = (typeof opponents)[number]['id'];
export const isOpponent = (id: unknown): id is OpponentId => opponents.some((o) => o.id === id);
export const opponentFor = (id: OpponentId = 'coral') => opponents.find((o) => o.id === id)!;
