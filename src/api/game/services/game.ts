/**
 * game service
 */
import axios from 'axios'
import { JSDOM } from 'jsdom'
import { factories } from '@strapi/strapi';
import slugify from 'slugify';

const GAME_SERVICE = "api::game.game"; //
const PUBLISHER_SERVICE = "api::publisher.publisher";
const DEVELOPER_SERVICE = "api::developer.developer";
const CATEGORIES_SERVICE = "api::category.category";
const PLATFORM_SERVICE = "api::platform.platform";

async function getGameInfo(slug) {
  const gogSlug = slug.replaceAll('-', '_').toLowerCase();

  const body = await axios.get(`https://www.gog.com/game/${gogSlug}`)
  const dom = new JSDOM(body.data)
  const raw_description = dom.window.document.querySelector('.description')
  const description = raw_description.innerHTML
  const short_description = raw_description.textContent.slice(0, 160)
  const ratingElement = dom.window.document.querySelector(
    ".age-restrictions__icon use"
  )

  return {
    description,
    short_description,
    rating: ratingElement 
    ? ratingElement.getAttribute("xlink:href")
      .replace(/_/g, "")
      .replace("#", "") 
    : 'BR0'
  }
}

//Função para validar se o dado já existe no strapi
async function getByName(name, entityService) {
  //buscando na entidade se existe o filtro "name"
  const item = await strapi.service(entityService).find({
    filters: {name},
  })

  //se não existir o item cadastrado retorna os resultados
  return item.results.length > 0 ? item.results[0] : null
}

async function create(name, entityService) {
  const item = await getByName(name, entityService)
  if(!item){
    //TO-DO usar o serviço do strapi, passando o serviço e usando o método create para cadastrar
    await strapi.service(entityService).create({
      data: {
        name: name,
        slug: slugify(name, { strict: true, lower: true })//retirar caracteres especiais e coloca em minusculo
      }
    })
  }
}

//Função para realizar a criação dos dados
async function createManyToManyData(products){
  const developerSet = new Set();
  const publishersSet = new Set();
  const categoriesSet = new Set();
  const plataformsSet = new Set();

  products.forEach((product) => {
    const { developers, publishers, genres, operatingSystems } = product;

    genres?.forEach(({ name }) => {
      categoriesSet.add(name)
    })

    operatingSystems?.forEach((item) => {
      if(item){
        plataformsSet.add(item)
      }
    })

    developers?.forEach((item) => {
      if(item){
        developerSet.add(item)
      }
    })

    publishers?.forEach((item) => {
      if(item){
        publishersSet.add(item)
      }
    })

    const createCall = (set, entityName) => Array.from(set).map(async (name) => await create(name, entityName))

    return Promise.all([
      ...createCall(developerSet, DEVELOPER_SERVICE),
      ...createCall(categoriesSet, CATEGORIES_SERVICE),
      ...createCall(publishersSet, PUBLISHER_SERVICE),
      ...createCall(plataformsSet, PLATFORM_SERVICE),
    ])
  })
}

export default factories.createCoreService('api::game.game', () => ({
  async populate(params) {
    //buscando o catalogo de jogos no site Gog
    const gogApiUrl=`
https://catalog.gog.com/v1/catalog?limit=48&order=desc%3Atrending`

    const { data: { products } } = await axios.get(gogApiUrl);

    //criar todos os dados necessário para o cadastro dos jogos
    await createManyToManyData(products)
  }
}));
