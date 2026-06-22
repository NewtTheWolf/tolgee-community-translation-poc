import { Elysia } from 'elysia'

export default new Elysia().post('/auth/logout', ({ cookie }) => {
  cookie.session!.remove()
  return { ok: true }
})
