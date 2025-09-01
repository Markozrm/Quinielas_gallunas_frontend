// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
 production: false,
 apiUrl: 'http://localhost', // Cambia a localhost para pruebas locales
 apiUrl_apuestas: 'http://localhost', // Cambia a localhost para pruebas locales
 PORT : '3000', // Puerto local de tu backend principal
 apuesta_PORT: '3448', // Puerto local para apuestas
 quiniela_PORT: '3449', // Puerto local para quinielas
 apiUrl_quiniela: 'http://localhost', // Cambia a localhost para pruebas locales
 apiUrl_ruleta: 'http://localhost', // Cambia a localhost para pruebas locales
 // apiUrl: 'https://cheapserverhub.com', // No usado en local
 // apiUrl_apuestas: 'https://cheapserverhub.com', // No usado en local
 // apiUrl_quiniela: 'https://cheapserverhub.com', // No usado en local
 // apiUrl_ruleta: 'https://cheapserverhub.com', // No usado en local
 // PORT : '8443', // No usado en local
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
