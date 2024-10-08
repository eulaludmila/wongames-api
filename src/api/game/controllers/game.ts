/**
 * game controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::game.game', ({strapi}) => ({
  async populate(ctx) {
    //query url
    const options = {
      limit: 48,
      order: 'desc:trending',
      ...ctx.query
    }
    //controller chama o serviço
    await strapi.service("api::game.game").populate(options)
    ctx.send("Finished populating")
  }
}));
