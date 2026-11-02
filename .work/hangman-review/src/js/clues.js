// Written clues work offline and never need to fetch or display the answer.
export const wordClues = {
    javascript: 'A programming language commonly used to make web pages interactive.',
    interface: 'A shared boundary or set of controls that lets people or programs interact with a system.',
    developer: 'A person who creates and maintains software applications.',
    element: 'An individual part of a web page, such as a heading, image, or button.',
    function: 'A reusable block of code that performs a task and helps organize a program.',
    variable: 'A named place to store a value that a program can use or change.',
    algorithm: 'A step-by-step set of instructions for solving a problem.',

    elephant: 'A very large mammal with a long trunk and wide ears.',
    giraffe: 'A spotted African mammal known for its exceptionally long neck.',
    penguin: 'A flightless seabird that uses its flippers to swim.',
    crocodile: 'A large reptile with a long snout, powerful jaws, and an armored body.',
    hippopotamus: 'A large, heavy African mammal that spends much of its day in rivers and lakes.',
    chimpanzee: 'An intelligent African great ape known for using tools.',
    rhinoceros: 'A large, thick-skinned mammal with one or two horns on its nose.',

    switzerland: 'A European country known for the Alps, watches, and chocolate.',
    australia: 'A country and continent known for kangaroos and the Great Barrier Reef.',
    brazil: 'The largest country in South America, home to much of the Amazon rainforest.',
    canada: 'A large North American country whose flag features a maple leaf.',
    denmark: 'A Scandinavian country whose capital is Copenhagen.',
    egypt: 'A North African country famous for ancient pyramids and the Nile River.',
    argentina: 'A South American country known for tango, with Buenos Aires as its capital.',

    spaghetti: 'Long, thin strands of pasta often served with tomato sauce.',
    broccoli: 'A green vegetable with a thick stalk and a flowering head shaped like a small tree.',
    strawberry: 'A sweet red fruit with tiny seeds on its outer surface.',
    pineapple: 'A tropical fruit with spiky skin and a crown of stiff green leaves.',
    chocolate: 'A sweet treat made from cacao beans, often sold in bars.',
    avocado: 'A fruit with creamy green flesh and a large pit, often mashed into guacamole.',
    pancake: 'A flat, round breakfast food cooked from batter and often served with syrup.',

    astronomy: 'The scientific study of stars, planets, and other objects in space.',
    chemistry: 'The branch of science that studies substances and how they react with one another.',
    genetics: 'The study of genes and how traits pass from parents to offspring.',
    molecule: 'A group of atoms bonded together, such as those in water.',
    photosynthesis: 'The process plants use to turn sunlight, water, and carbon dioxide into sugars.',
    gravity: 'The force that pulls objects toward one another and keeps us on the ground.',
    galaxy: 'A vast collection of stars, gas, and dust held together in space.',

    basketball: 'A team sport where players shoot a ball through an elevated hoop.',
    volleyball: 'A team sport where players hit a ball over a net without letting it touch the floor.',
    gymnastics: 'A sport featuring routines of balance, strength, flips, and controlled movements.',
    badminton: 'A racket sport played by hitting a shuttlecock over a net.',
    archery: 'The sport of shooting arrows at a target using a bow.',
    fencing: 'A combat sport where opponents score touches using thin swords.',
    cricket: 'A bat-and-ball sport played with wickets, overs, and runs.',

    synergy: 'The extra benefit created when people or things work together effectively.',
    paradigm: 'A model or pattern that shapes how people understand or approach something.',
    juxtaposition: 'Placing two different things side by side to highlight a contrast.',
    quixotic: 'Extremely idealistic, with ambitions that are unlikely to be practical.',
    ephemeral: 'Lasting for only a very short time.',
    mnemonic: 'A memory aid, such as a rhyme or phrase, that helps you recall information.',
    ubiquitous: 'Present or found almost everywhere.',
    zeitgeist: 'The spirit or mood of a particular period in history.',
    ambiguous: 'Open to more than one interpretation or unclear in meaning.',
    boulevard: 'A broad city street, often lined with trees.',
    chrysanthemum: 'A flowering plant often grown for its many-petaled autumn blooms.',
    conscientious: 'Careful and thorough, with a strong desire to do a task properly.',
    dichotomy: 'A division into two sharply contrasting groups or ideas.',
};

export function getWordClue(word) {
    return wordClues[word] || 'Think of a word that belongs to the category above.';
}
