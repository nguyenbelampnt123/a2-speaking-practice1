import crypto from "crypto";
import { Redis } from "@upstash/redis";

const K = {
  studentHash: "a2:student_hash",
  adminHash: "a2:admin_hash",
  studentVersion: "a2:student_version",
  adminVersion: "a2:admin_version"
};

function redis() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL;

  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Redis configuration missing. Expected UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL/KV_REST_API_TOKEN."
    );
  }

  return new Redis({ url, token });
}

function authSecret() {
  const s = process.env.AUTH_SECRET;

  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET is missing or too short.");
  }

  return s;
}

export function hashPassword(
  password,
  salt = crypto.randomBytes(16).toString("hex")
) {
  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const [salt, expectedHex] = String(stored).split(":");

    const actual = crypto.scryptSync(
      password,
      salt,
      64
    );

    const expected = Buffer.from(
      expectedHex,
      "hex"
    );

    return (
      expected.length === actual.length &&
      crypto.timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}

export async function ensureInit() {
  const r = redis();

  const [sh, ah, sv, av] = await r.mget(
    K.studentHash,
    K.adminHash,
    K.studentVersion,
    K.adminVersion
  );

  if (!sh) {
    const p =
      process.env.INITIAL_STUDENT_PASSWORD;

    if (!p) {
      throw new Error(
        "INITIAL_STUDENT_PASSWORD is missing."
      );
    }

    await r.set(
      K.studentHash,
      hashPassword(p),
      { nx: true }
    );
  }

  if (!ah) {
    const p =
      process.env.INITIAL_ADMIN_PASSWORD;

    if (!p) {
      throw new Error(
        "INITIAL_ADMIN_PASSWORD is missing."
      );
    }

    await r.set(
      K.adminHash,
      hashPassword(p),
      { nx: true }
    );
  }

  if (!sv) {
    await r.set(
      K.studentVersion,
      1,
      { nx: true }
    );
  }

  if (!av) {
    await r.set(
      K.adminVersion,
      1,
      { nx: true }
    );
  }
}

function signPayload(payload) {
  const body = Buffer
    .from(JSON.stringify(payload))
    .toString("base64url");

  const sig = crypto
    .createHmac(
      "sha256",
      authSecret()
    )
    .update(body)
    .digest("base64url");

  return `${body}.${sig}`;
}

function readPayload(token) {
  try {
    const [body, sig] =
      String(token || "").split(".");

    if (!body || !sig) {
      return null;
    }

    const expected = crypto
      .createHmac(
        "sha256",
        authSecret()
      )
      .update(body)
      .digest();

    const got = Buffer.from(
      sig,
      "base64url"
    );

    if (
      got.length !== expected.length ||
      !crypto.timingSafeEqual(
        got,
        expected
      )
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer
        .from(body, "base64url")
        .toString("utf8")
    );

    if (
      !payload.exp ||
      Date.now() > payload.exp
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createStudentToken() {
  await ensureInit();

  const v = Number(
    (await redis().get(
      K.studentVersion
    )) || 1
  );

  return signPayload({
    role: "student",
    v,
    exp:
      Date.now() +
      8 * 60 * 60 * 1000
  });
}

export async function createAdminToken() {
  await ensureInit();

  const v = Number(
    (await redis().get(
      K.adminVersion
    )) || 1
  );

  return signPayload({
    role: "admin",
    v,
    exp:
      Date.now() +
      2 * 60 * 60 * 1000
  });
}

export async function studentTokenValid(
  token
) {
  if (!token) {
    return false;
  }

  const p = readPayload(token);

  if (
    !p ||
    p.role !== "student"
  ) {
    return false;
  }

  await ensureInit();

  const current = Number(
    (await redis().get(
      K.studentVersion
    )) || 1
  );

  return p.v === current;
}

export async function adminTokenValid(
  token
) {
  if (!token) {
    return false;
  }

  const p = readPayload(token);

  if (
    !p ||
    p.role !== "admin"
  ) {
    return false;
  }

  await ensureInit();

  const current = Number(
    (await redis().get(
      K.adminVersion
    )) || 1
  );

  return p.v === current;
}

export async function checkStudentPassword(
  password
) {
  await ensureInit();

  const stored = await redis().get(
    K.studentHash
  );

  return verifyPassword(
    password,
    stored
  );
}

export async function checkAdminPassword(
  password
) {
  await ensureInit();

  const stored = await redis().get(
    K.adminHash
  );

  return verifyPassword(
    password,
    stored
  );
}

export async function changeStudentPassword(
  password
) {
  await ensureInit();

  const r = redis();

  await r.set(
    K.studentHash,
    hashPassword(password)
  );

  await r.incr(
    K.studentVersion
  );
}

export async function logoutAllStudents() {
  await ensureInit();

  await redis().incr(
    K.studentVersion
  );
}

export async function changeAdminPassword(
  password
) {
  await ensureInit();

  const r = redis();

  await r.set(
    K.adminHash,
    hashPassword(password)
  );

  await r.incr(
    K.adminVersion
  );
}
