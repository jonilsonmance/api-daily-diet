import fastify from 'fastify'
import { env } from './env'
import { mealsRoutes } from './routes/meals.routes'
import cookie from '@fastify/cookie'

const app = fastify()

app.register(cookie)
app.register(mealsRoutes, {
  prefix: 'meals',
})

app
  .listen({
    port: env.PORT,
  })
  .then(() => {
    console.log('Http server Running!')
  })
