import { ZodError } from 'zod'

export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
        return res.status(400).json({ error: message })
      }
      next(err)
    }
  }
}
