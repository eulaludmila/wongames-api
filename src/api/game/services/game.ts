/**
 * game service
 */
import axios from 'axios'
import { JSDOM } from 'jsdom'
import { factories } from '@strapi/strapi';
import slugify from 'slugify';
import { get } from 'http';
import developer from '../../developer/controllers/developer';

const GAME_SERVICE = "api::game.game"; //
const PUBLISHER_SERVICE = "api::publisher.publisher";
const DEVELOPER_SERVICE = "api::developer.developer";
const CATEGORIES_SERVICE = "api::category.category";
const PLATFORM_SERVICE = "api::platform.platform";

//Busca as informações no site 'gogo' e retorna as informações necessárias para o cadastro
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

//Precisa liberar o upload em settings no admin
async function setImage({image, game, field = "cover"}) {
  const { data } = await axios.get(image, { responseType: "arraybuffer" }); //requisição na url e salve em buffer a imagem
  const buffer = Buffer.from(data, "base64");//salva o data na base64

  const FormData = require("form-data");//para salvar a imagem

  const formData:any = new FormData();//crio um novo form-data

  //passo rodas as informações da imagem
  formData.append("refId", game.id);
  formData.append("ref", `${GAME_SERVICE}`);
  formData.append("field", field);
  formData.append("files", buffer, { filename: `${game.slug}.jpg`});

  console.info(`Uploading ${field} image: ${game.slug}.jpg`);

  //realizo a requisição para salvar a imagem
  await axios({
    method: "POST",
    url: `http://localhost:1338/api/upload/`,
    data: formData,
    headers: {
      "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
    },
  })
}

async function createGames(products) {
  await Promise.all(
    products.map(async (product) => {
      const item = await getByName(product.title, GAME_SERVICE)

      if(!item) {
        console.info(`Creating: ${product.title}...`);

        const game = await strapi.service(`${GAME_SERVICE}`).create({
          data: {
            name: product.title,
            slug: product.slug,
            price: product.price.finalMoney.amount,
            release_date: new Date(product.releaseDate),
            categories: await Promise.all(
              product.genres.map(({name}) => getByName(name, CATEGORIES_SERVICE))
            ),
            platforms: await Promise.all(
                product.operatingSystems.map((name) => 
                getByName(name, PLATFORM_SERVICE)
              )
            ),
            developers: await Promise.all(
              product.developers.map((name) => 
                getByName(name, DEVELOPER_SERVICE)
              )
            ),
            publisher: await Promise.all(
              product.publishers.map((name) => 
                getByName(name, PUBLISHER_SERVICE)
              )
            ),
            ...(await getGameInfo(product.slug)),//todo o retorno da função será colocada nesse objeto
            publishedAt: new Date()
          }
        })

        //upload image cover
        await setImage({ image: product.coverHorizontal, game})
        //upload image gallery
        await Promise.all(
          product.screenshots.slice(0, 5).map((url) => 
            setImage({
              image: `${url.replace(
                "{formatter}",
                "product_card_v2_mobile_slider_639"
              )}`,
              game,
              field: "gallery"
            })
          )
        )

        return game
      }
    })
  )
}

export default factories.createCoreService('api::game.game', () => ({
  async populate(params) {
    //buscando o catalogo de jogos no site Gog
    const gogApiUrl=`
https://catalog.gog.com/v1/catalog?limit=48&order=desc%3Atrending`
    console.log("gogApiUrl: ", gogApiUrl)
    const { data: { products } } = await axios.get(gogApiUrl);
    console.log("data: ", products)

    //criar todos os dados necessário para o cadastro dos jogos
    // await createManyToManyData(products)

    await createGames([products[0], products[1]])
  }
}));
