/* eslint-disable camelcase */
import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const createMealsBodySchema = z.object({
      name: z.string().trim(),
      description: z.string().trim(),
      date_time: z.string(),
      is_in_diet: z.boolean(),
    })

    const { name, description, date_time, is_in_diet } =
      createMealsBodySchema.parse(request.body)

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 dias => 2 * 60 * 1000,
      })
    }

    await knex('meals').insert({
      id: randomUUID(),
      name,
      description,

      date_time,
      is_in_diet,
      session_id: sessionId,
    })
    return reply.status(201).send()
  })

  app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {
    const { sessionId } = request.cookies

    const meals = await knex('meals').where('session_id', sessionId).select()

    return { meals }
  })

  app.get('/fetch', { preHandler: [checkSessionIdExists] }, async (request) => {
    const nameSchema = z.object({
      name: z.string().trim().optional(),
    })
    const { sessionId } = request.cookies
    const { name } = nameSchema.parse(request.query)

    const fetchMealsToName = await knex('meals')
      .select()
      .whereLike('name', `%${name ?? ''}%`)
      .andWhere('session_id', sessionId)

    return { fetchMealsToName }
  })

  app.get(
    '/summary',
    { preHandler: [checkSessionIdExists] },
    async (request) => {
      const { sessionId } = request.cookies

      const totalMealsResult = await knex('meals')
        .where('session_id', sessionId)
        .count('id', { as: ' TotalMeals' })
        .first()

      const totalMealsTrueResult = await knex('meals')
        .where('session_id', sessionId)
        .andWhere('is_in_diet', true)
        .count('id', { as: ' TotalMealsTrue' })
        .first()

      const totalMealsFalseResult = await knex('meals')
        .where('session_id', sessionId)
        .andWhere('is_in_diet', false)
        .count('id', { as: ' TotalMealsFalse' })
        .first()

      const mealsInDiet = await knex('meals')
        .where('session_id', sessionId)
        .andWhere('is_in_diet', true)
        .select()

      return {
        ...totalMealsResult,
        ...totalMealsTrueResult,
        ...totalMealsFalseResult,
        mealsInDiet,
      }
    },
  )

  app.put(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const createMealsBodySchema = z.object({
        name: z.string().trim(),
        description: z.string().trim(),
        date_time: z.string(),
        is_in_diet: z.boolean(),
      })
      const getMealsParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { name, description, date_time, is_in_diet } =
        createMealsBodySchema.parse(request.body)

      const { id } = getMealsParamsSchema.parse(request.params)

      await knex('meals').where({ id }).update({
        name,
        description,
        date_time,
        is_in_diet,
      })

      return reply.status(200).send({ message: 'Meal updated succesfully' })
    },
  )

  app.delete(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const getMealsParamsSchema = z.object({
        id: z.string().uuid(),
      })
      const { id } = getMealsParamsSchema.parse(request.params)

      await knex('meals').delete().where({ id })

      return reply.status(200).send({ message: 'Meal delete succesfully' })
    },
  )
}
