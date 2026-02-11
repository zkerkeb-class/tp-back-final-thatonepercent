
import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files with proper CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(express.static(join(__dirname, 'assets')));

// Charger les données des Pokémon
let pokemons = JSON.parse(readFileSync(join(__dirname, 'data/pokemons.json'), 'utf8'));

// Routes

// GET - Récupérer tous les Pokémon avec pagination (20 par 20)
app.get('/api/pokemons', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const totalPokemons = pokemons.length;
  const totalPages = Math.ceil(totalPokemons / limit);
  const paginatedPokemons = pokemons.slice(startIndex, endIndex);

  if (page > totalPages && totalPages > 0) {
    return res.status(400).json({ 
      message: `La page ${page} n'existe pas. Nombre total de pages: ${totalPages}` 
    });
  }

  res.json({
    data: paginatedPokemons,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalPokemons: totalPokemons,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  });
});

// GET - Rechercher un Pokémon par nom
app.get('/api/pokemons/search/:name', (req, res) => {
  const searchName = req.params.name.toLowerCase();
  
  const results = pokemons.filter(p => 
    p.name.english.toLowerCase().includes(searchName) ||
    p.name.french.toLowerCase().includes(searchName) ||
    p.name.japanese.toLowerCase().includes(searchName) ||
    p.name.chinese.toLowerCase().includes(searchName)
  );

  if (results.length === 0) {
    return res.status(404).json({ 
      message: `Aucun Pokémon trouvé avec le nom: ${req.params.name}`,
      results: []
    });
  }

  res.json({
    message: `${results.length} Pokémon(s) trouvé(s)`,
    results: results
  });
});

// GET - Récupérer un Pokémon par ID
app.get('/api/pokemons/:id', (req, res) => {
  const pokemon = pokemons.find(p => p.id === parseInt(req.params.id));
  if (!pokemon) {
    return res.status(404).json({ message: 'Pokémon non trouvé' });
  }
  res.json(pokemon);
});

// POST - Créer un nouveau Pokémon
app.post('/api/pokemons', (req, res) => {
  const newPokemon = req.body;
  
  // Valider les données
  if (!newPokemon.name || !newPokemon.type || !newPokemon.base) {
    return res.status(400).json({ message: 'Données invalides' });
  }

  // Générer un nouvel ID
  const newId = pokemons.length > 0 ? Math.max(...pokemons.map(p => p.id)) + 1 : 1;
  newPokemon.id = newId;

  pokemons.push(newPokemon);
  
  // Sauvegarder dans le fichier JSON
  writeFileSync(join(__dirname, 'data/pokemons.json'), JSON.stringify(pokemons, null, 2));
  
  res.status(201).json(newPokemon);
});

// PUT - Mettre à jour un Pokémon
app.put('/api/pokemons/:id', (req, res) => {
  const pokemon = pokemons.find(p => p.id === parseInt(req.params.id));
  
  if (!pokemon) {
    return res.status(404).json({ message: 'Pokémon non trouvé' });
  }

  // Mettre à jour les propriétés
  Object.assign(pokemon, req.body);
  
  // Sauvegarder dans le fichier JSON
  writeFileSync(join(__dirname, 'data/pokemons.json'), JSON.stringify(pokemons, null, 2));
  
  res.json(pokemon);
});

// DELETE - Supprimer un Pokémon
app.delete('/api/pokemons/:id', (req, res) => {
  const index = pokemons.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ message: 'Pokémon non trouvé' });
  }

  const deletedPokemon = pokemons.splice(index, 1)[0];
  
  // Sauvegarder dans le fichier JSON
  writeFileSync(join(__dirname, 'data/pokemons.json'), JSON.stringify(pokemons, null, 2));
  
  res.json({ message: 'Pokémon supprimé', pokemon: deletedPokemon });
});

// Route racine
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Pokémon - Serveur fonctionnel',
    endpoints: {
      pokemons: 'GET /api/pokemons?page=1',
      searchPokemon: 'GET /api/pokemons/search/name',
      pokemonById: 'GET /api/pokemons/:id',
      createPokemon: 'POST /api/pokemons',
      updatePokemon: 'PUT /api/pokemons/:id',
      deletePokemon: 'DELETE /api/pokemons/:id',
      staticAssets: 'GET /assets/pokemons/:id.png'
    }
  });
});

// Route de test pour images - debug
app.get('/debug/assets', (req, res) => {
  res.json({ 
    message: 'Debug info',
    staticPath: join(__dirname, 'assets'),
    imageExampleUrl: 'http://localhost:3000/assets/pokemons/1.png'
  });
});

console.log('Server is set up. Ready to start listening on a port.');

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
  console.log('API available at http://localhost:3000/api/pokemons');
});