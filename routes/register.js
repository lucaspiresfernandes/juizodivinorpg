import { encrypt } from "../utils/encrypter.js";
import con from "../utils/connection.js";
import { Router, json } from "express";
import config from "../utils/config.js";

const router = Router();
const jsonParser = json();

router.get("/", (req, res) => {
  if (req.session.playerID) return res.redirect("/sheet/1");
  res.render("register");
});

router.get("/admin", (req, res) => {
  if (req.session.playerID) return res.redirect("/sheet/1");
  res.render("register", { admin: true });
});

router.post("/", jsonParser, registerPost);

router.post("/admin", jsonParser, registerPost);

router.post("/shadow", jsonParser, async (req, res) => {
  const playerID = req.session.playerID;
  const isAdmin = req.session.isAdmin;

  if (!playerID || !isAdmin) return res.status(401).send();

  const playerIDToShadow = req.body.data.playerID;

  if (!playerIDToShadow) return res.status(400).send("Player ID not provided.");

  const player = await con("player")
    .select()
    .where("player_id", playerIDToShadow)
    .first();
  if (!player) return res.status(404).send("Player not found.");

  const shadowPlayerID = (
    await con("player").insert({
      username: `alternativo:_${player.username}`,
      password: player.password,
      admin: false,
      shadow_player_id: null,
      is_shadow: true,
    })
  )[0];
  await con("player").where("player_id", playerIDToShadow).update({
    shadow_player_id: shadowPlayerID,
  });
  await registerPlayerData(shadowPlayerID);
});

async function registerPost(req, res) {
  try {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) return res.status(400).end();

    const usernameExists = await con("player")
      .select("username")
      .where("username", username)
      .first();

    if (usernameExists) return res.status(401).send("Username already exists.");

    let admin = false;

    const bodyAdminKey = req.body.adminKey;
    if (bodyAdminKey) {
      if (process.env.ADMIN_KEY == bodyAdminKey) admin = true;
      else return res.status(401).send("Admin key is incorrect.");
    }

    const hash = await encrypt(password);

    const playerID = (
      await con("player").insert({
        username: username,
        password: hash,
        admin: admin,
        is_shadow: false,
      })
    )[0];

    if (admin) await registerAdminData(playerID);
    else await registerPlayerData(playerID);

    req.session.playerID = playerID;
    req.session.isAdmin = admin;

    res.send();
  } catch (err) {
    console.error(err);
    res.status(500).send("500: Fatal Error");
  }
}

async function registerPlayerData(playerID) {
  const results = await Promise.all([
    con("characteristic").select("characteristic_id"),
    con("attribute").select("attribute_id"),
    con("attribute_status").select("attribute_status_id"),
    con("skill").select("skill_id", "mandatory").where("mandatory", true),
    con("spec").select("spec_id"),
    con("info").select("info_id"),
    con("extra_info").select("extra_info_id"),
  ]);

  await Promise.all([
    con("player_avatar").insert([
      { player_id: playerID, attribute_status_id: null },
      { player_id: playerID, attribute_status_id: 6 },
    ]),

    con("player_characteristic").insert(
      results[0].map((char) => ({
        player_id: playerID,
        characteristic_id: char.characteristic_id,
        value: 0,
      }))
    ),

    con("player_attribute").insert(
      results[1].map((attr) => ({
        player_id: playerID,
        attribute_id: attr.attribute_id,
        value: 0,
        max_value: 0,
        extra_value: 0,
      }))
    ),

    con("player_attribute_status").insert(
      results[2].map((attrStatus) => ({
        player_id: playerID,
        attribute_status_id: attrStatus.attribute_status_id,
        value: false,
      }))
    ),

    con("player_skill").insert(
      results[3].map((skill) => ({
        player_id: playerID,
        skill_id: skill.skill_id,
        value: 0,
        extra_value: 0,
      }))
    ),

    con("player_spec").insert(
      results[4].map((spec) => ({
        player_id: playerID,
        spec_id: spec.spec_id,
        value: 0,
      }))
    ),

    con("player_info").insert(
      results[5].map((info) => ({
        player_id: playerID,
        info_id: info.info_id,
        value: "",
      }))
    ),

    con("player_extra_info").insert(
      results[6].map((extraInfo) => ({
        player_id: playerID,
        extra_info_id: extraInfo.extra_info_id,
        value: "",
      }))
    ),

    con("player_note").insert([
      {
        player_id: playerID,
        value: "",
      },
    ]),
  ]);
}

function registerAdminData(playerID) {
  return con("player_note").insert({ player_id: playerID, value: "" });
}

export default router;
