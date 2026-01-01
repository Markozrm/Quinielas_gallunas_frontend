// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  // CONFIGURACIÓN DE PRODUCCIÓN (activa por defecto)
  production: true,
  apiUrl: 'http://cheapserverhub.com',
  PORT: '444',
  apiUrl_apuestas: 'http://cheapserverhub.com',
  apuesta_PORT: '3448',
  apiUrl_quiniela: 'http://cheapserverhub.com',
  quiniela_PORT: '3449',
  apiUrl_ruleta: 'http://cheapserverhub.com',
  ruleta_PORT: '3444',
  apiUrl_chat: 'http://cheapserverhub.com',
  chat_PORT: '3010',
  

  // CONFIGURACIÓN LOCAL (DESCOMENTA si quieres usar local en este mismo archivo)
  //production: false,
  //apiUrl: 'http://localhost',
  //PORT: '444',
  //apiUrl_apuestas: 'http://localhost',
  //apuesta_PORT: '3448',
  //apiUrl_quiniela: 'http://localhost',
  //quiniela_PORT: '3449',
  //apiUrl_ruleta: 'http://localhost',
  //ruleta_PORT: '3444',
  //apiUrl_chat: 'http://localhost',
  //chat_PORT: '3010'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
