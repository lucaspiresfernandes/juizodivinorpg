import { Router, json } from "express";
import con from "../utils/connection.js";
import axios from "axios";
import path from "path";

const router = Router();
const jsonParser = json();

router.get("/:attrStatusID", async (req, res) => {
  const playerID = req.query.playerID || req.session.playerID;
  const attrStatusID = parseInt(req.params.attrStatusID) || null;

  if (!playerID) return res.status(401).send();

  try {
    const link = (
      await con("player_avatar")
        .select("link")
        .where("attribute_status_id", attrStatusID)
        .andWhere("player_id", playerID)
        .first()
    )?.link;
    if (!link)
      return res.sendFile(
        path.join(import.meta.dirname, "../public/assets/avatar404.png")
      );
    const response = await axios.get(link, {
      responseType: "arraybuffer",
      timeout: 10000,
    });
    res.contentType(response.headers["content-type"]);
    res.end(response.data, "binary");
  } catch (err) {
    console.error(err);
    res.status(500).send();
  }
});

router.post("/", jsonParser, async (req, res) => {
  const playerID = req.session.playerID;
  const data = req.body.avatars;

  if (!playerID || !data) return res.status(401).send();

  try {
    const avatars = await con("player_avatar")
      .select("attribute_status_id")
      .where("player_id", playerID);

    await Promise.all(
      avatars.map((avatar) => {
        const id = avatar.attribute_status_id;
        const obj = data.find((av) => av.attribute_status_id == id);

        if (!obj) return;
        return con("player_avatar")
          .update({ link: obj.link || null })
          .where("attribute_status_id", id)
          .andWhere("player_id", playerID);
      })
    );

    res.send();
  } catch (err) {
    console.error(err);
    res.status(500).send();
  }
});

export default router;
