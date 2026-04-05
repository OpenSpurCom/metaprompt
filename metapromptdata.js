// --- Initial data ---
let chats = [
  { id: 1,  role: "user",      content: "Tell me about Paris" },
  { id: 2,  role: "assistant", content: "Paris is the capital of France and one of Europe's most visited cities." },
  { id: 3,  role: "user",      content: "What's its population?" },
  { id: 4,  role: "assistant", content: "Paris proper has about 2.1 million residents; the metropolitan area has over 12 million." },
  { id: 5,  role: "user",      content: "What are the must-see sights?" },
  { id: 6,  role: "assistant", content: "The Eiffel Tower, the Louvre, Notre-Dame, and Montmartre are the classic starting points." },
  { id: 7,  role: "user",      content: "Which museums are best for art lovers?" },
  { id: 8,  role: "assistant", content: "The Louvre for classical art, Musée d'Orsay for Impressionism, and Centre Pompidou for modern art." },
  { id: 9,  role: "user",      content: "How do I get around the city?" },
  { id: 10, role: "assistant", content: "The Métro is the fastest option. Vélib' bikes and walking work well for shorter distances." },
  { id: 11, role: "user",      content: "What's the best time of year to visit?" },
  { id: 12, role: "assistant", content: "Spring (April–June) and early autumn (September–October) offer mild weather and smaller crowds." },
];

let threads = [
  { th_id: 122, name: 'Paris Overview',  context: [1, 2, 3, 4] },
  { th_id: 123, name: 'Sightseeing',     context: [1, 2, 5, 6] },
  { th_id: 124, name: 'Demographics',    context: [3, 4] },
  { th_id: 125, name: 'Museums',         context: [5, 6, 7, 8] },
  { th_id: 126, name: 'Getting Around',  context: [9, 10] },
  { th_id: 127, name: 'Trip Planning',   context: [9, 10, 11, 12] },
];

module.exports = { chats, threads };