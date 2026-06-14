const fs = require('fs');
const path = require('path');

// Cargar variables de entorno (Vercel las inyecta automáticamente)
const apiUrl = process.env.API_URL || 'https://api.fitnessgymqro.com/api';
const socketUrl = process.env.SOCKET_URL || 'https://api.fitnessgymqro.com';
const pusherKey = process.env.PUSHER_KEY || '8055409c9d31e6514818';
const pusherCluster = process.env.PUSHER_CLUSTER || 'us2';

const envConfigFile = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
  socketUrl: '${socketUrl}',
  pusher: {
    key: '${pusherKey}',
    cluster: '${pusherCluster}'
  }
};
`;

const targetPath = path.join(__dirname, './src/environments/environment.prod.ts');

console.log(`Generando archivo de entorno en: ${targetPath}`);

fs.writeFile(targetPath, envConfigFile, function (err) {
  if (err) {
    console.error('Error al generar environment.prod.ts:', err);
    process.exit(1);
  }
  console.log('environment.prod.ts generado con éxito con API_URL:', apiUrl);
});
