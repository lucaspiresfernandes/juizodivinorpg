import bcrypt from "bcrypt";
import config from "../utils/config.js";

export function encrypt(password) {
  return new Promise((res, rej) => {
    bcrypt.hash(password, config.encryption.saltRounds, (err, hash) => {
      if (err) return rej(err);
      return res(hash);
    });
  });
}

export function compare(plainPass, hashword) {
  return new Promise((res, rej) => {
    bcrypt.compare(plainPass, hashword, (err, isPasswordMatch) => {
      if (err) return rej(err);
      return res(isPasswordMatch);
    });
  });
}
