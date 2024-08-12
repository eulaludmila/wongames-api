/**
 * game controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::game.game', ({strapi}) => ({
  async populate(ctx) {
    console.log("Starting to populate...")
    //controller chama o serviço
    await strapi.service("api::game.game").populate(ctx.query)
    ctx.send("Finished populating")
  }
}));
