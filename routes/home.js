import { compare } from "../utils/encrypter.js";
import { Router, json } from "express";
import con from "../utils/connection.js";

const router = Router();
const jsonParser = json();

router.get("/", (req, res) => {
  if (req.session.playerID) return res.redirect("/sheet/1");
  res.render("home");
});

router.post("/", jsonParser, async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) return res.status(400).end();

    const result = await con("player")
      .select("player_id", "shadow_player_id", "password", "admin")
      .where("username", username)
      .first();

    if (!result) return res.status(403).send("Usuário ou senha incorretos.");

    const exists = await compare(password, result.password);

    if (!exists) return res.status(403).send("Usuário ou senha incorretos.");

    const admin = result.admin;
    req.session.playerID = result.player_id;
    req.session.shadowPlayerID = result.shadow_player_id;
    req.session.isAdmin = admin;

    res.send({ admin });
  } catch (err) {
    console.error(err);
    res.status(500).send("500: Fatal Error");
  }
});

export default router;
