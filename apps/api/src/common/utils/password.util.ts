import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

const SCRYPT_PARAMS = {
  cost: 16384,
  blockSize: 8,
  parallelization: 1,
  keyLength: 64,
  maxMemory: 32 * 1024 * 1024,
};

function scryptAsync(
  password: string,
  salt: string,
  keyLength: number,
  options: {
    N: number;
    r: number;
    p: number;
    maxmem: number;
  },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64");
  const derivedKey = await scryptAsync(password, salt, SCRYPT_PARAMS.keyLength, {
    N: SCRYPT_PARAMS.cost,
    r: SCRYPT_PARAMS.blockSize,
    p: SCRYPT_PARAMS.parallelization,
    maxmem: SCRYPT_PARAMS.maxMemory,
  });

  return [
    "scrypt",
    SCRYPT_PARAMS.cost,
    SCRYPT_PARAMS.blockSize,
    SCRYPT_PARAMS.parallelization,
    salt,
    derivedKey.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, cost, blockSize, parallelization, salt, key] =
    passwordHash.split("$");

  if (
    algorithm !== "scrypt" ||
    !cost ||
    !blockSize ||
    !parallelization ||
    !salt ||
    !key
  ) {
    return false;
  }

  const derivedKey = await scryptAsync(password, salt, Buffer.from(key, "base64").length, {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelization),
    maxmem: SCRYPT_PARAMS.maxMemory,
  });

  return timingSafeEqual(derivedKey, Buffer.from(key, "base64"));
}
