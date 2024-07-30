import Icon from './extensions/icon.png'
import Logo from './extensions/logo.svg'

//customizar o admin
export default {
  config: {
    auth: {
      logo: Logo,
    },
    // Replace the favicon
    head: {
      favicon: Icon,
    },
    // Add a new locale, other than 'en'
    locales: [],
    translations: {
      en: {
        'Auth.form.welcome.title': 'Welcome to Won games',
        'Auth.form.welcome.subtitle': 'Log in to your account',
        'app.components.LeftMenu.navbrand.title': 'Won Games Dashboard'
      }
    },
    // Replace the Strapi logo in the main navigation
    menu: {
      logo: Icon,
    },
    theme: {
      light: {
        colors: {
          primary100: "#030415",
          primary600: "#f231a5",
          primary700: "#f231a5",
          neutral0: "#0d102f",
          neutral100: "#030415",
          neutral600: "#e7e7e7",
          neutral800: "#ffffff",
        }
      },
      dark: {
        colors: {
          primary100: "#030415",
          primary600: "#f231a5",
          primary700: "#f231a5",
          neutral0: "#0d102f",
          neutral100: "#030415",
        }
      }
    },
    tutorials: false,
    notifications: {
      releases: false
    }
  },
  bootstrap() {},
};
