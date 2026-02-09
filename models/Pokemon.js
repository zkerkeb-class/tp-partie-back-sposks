import mongoose from "mongoose";

const NameSchema = new mongoose.Schema(
  {
    english: String,
    japanese: String,
    chinese: String,
    french: String,
  },
  { _id: false }
);

const BaseSchema = new mongoose.Schema(
  {
    HP: Number,
    Attack: Number,
    Defense: Number,
    SpecialAttack: Number,
    SpecialDefense: Number,
    Speed: Number,
  },
  { _id: false }
);

const PokemonSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  name: NameSchema,
  type: [String],
  base: BaseSchema,
  image: String,
});

export default mongoose.model("Pokemon", PokemonSchema);
