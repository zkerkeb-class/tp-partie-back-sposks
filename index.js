import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import Pokemon from "./models/Pokemon.js";

const app = express();

/* ======================
   CONFIG & MIDDLEWARES
====================== */

app.use(cors());
app.use(express.json());
// __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// fichiers statiques (images)
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/types", express.static(path.join(__dirname, "assets/types")));
/* ======================
   MONGODB
====================== */
mongoose.set("bufferCommands", false);

mongoose
  .connect("mongodb://127.0.0.1:27017/pokedex", {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ Mongo error:", err);
    process.exit(1);
  });

/* ======================
   ROUTES
====================== */

// Health check
app.get("/", (req, res) => {
  res.send("API Pokémon OK");
});

/* ---------- GET paginé ---------- */
app.get("/api/pokemons", async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 20, 1);
  const q = (req.query.q || "").trim();

  const filter = q
    ? {
        $or: [
          { "name.french": { $regex: q, $options: "i" } },
          { "name.english": { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const total = await Pokemon.countDocuments(filter);
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const data = await Pokemon.find(filter)
    .sort({ id: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({
    data,
    pagination: { page, limit, total, totalPages },
  });
});


/* ---------- GET one ---------- */
// SEARCH (par nom) -> IMPORTANT: avant /:id
app.get("/api/pokemons/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json([]);

  // recherche sur les 3 champs de nom (french/english/japanese)
  const regex = new RegExp(q, "i");

  const results = await Pokemon.find({
    $or: [
      { "name.french": regex },
      { "name.english": regex },
      { "name.japanese": regex },
    ],
  })
    .sort({ id: 1 })
    .limit(50); // pour éviter d’envoyer la terre entière

  res.json(results);
});

app.get("/api/pokemons/:id", async (req, res) => {
  const id = Number(req.params.id);
  const pokemon = await Pokemon.findOne({ id });

  if (!pokemon) {
    return res.status(404).json({ error: "Pokémon non trouvé" });
  }

  res.json(pokemon);
});

/* ---------- DELETE ---------- */
app.delete("/api/pokemons/:id", async (req, res) => {
  const id = Number(req.params.id);
  const result = await Pokemon.deleteOne({ id });

  if (result.deletedCount === 0) {
    return res.status(404).json({ error: "Pokémon non trouvé" });
  }

  res.json({ success: true });
});

/* ---------- UPDATE (PATCH) ---------- */
app.patch("/api/pokemons/:id", async (req, res) => {
  const id = Number(req.params.id);

  // champs autorisés uniquement
  const allowedFields = ["name", "type", "base", "image"];
  const update = {};

  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      update[key] = req.body[key];
    }
  }

  const pokemon = await Pokemon.findOneAndUpdate(
    { id },
    update,
    { new: true }
  );

  if (!pokemon) {
    return res.status(404).json({ error: "Pokémon non trouvé" });
  }

  res.json(pokemon);
});

/* ---------- CREATE ---------- */
app.post("/api/pokemons", async (req, res) => {
  // id auto
  const last = await Pokemon.findOne().sort({ id: -1 });
  const nextId = last ? last.id + 1 : 1;

  const pokemon = new Pokemon({
    ...req.body,
    id: nextId,
  });

  await pokemon.save();
  res.status(201).json(pokemon);
});

/* ======================
   SERVER
====================== */

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
