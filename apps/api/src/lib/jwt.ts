import { SignJWT, jwtVerify } from 'jose'
import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { env } from './env'

const PayloadSchema = Type.Object({
  sub: Type.String({ minLength: 1 }),
  login: Type.String({ minLength: 1 }),
})
export type SessionPayload = { sub: string; login: string }

const ISSUER = 'community-translations'
const AUDIENCE = 'community-translations-api'
const secret = () => new TextEncoder().encode(env.JWT_SECRET)

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret())
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE })
    if (!Value.Check(PayloadSchema, payload)) return null
    return payload as SessionPayload
  } catch {
    return null
  }
}
