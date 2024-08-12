//Ele bate na rota e depois no controller
export default {
  routes: [
    // a rota precisa ser liberada no strapi em users permissions plugin
    {
      method: "POST",
      path: "/games/populate",
      handler: "game.populate" // método a ser chamado do controller
    }
  ]
}