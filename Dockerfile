FROM node:20-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (incluyendo devDependencies para el build)
RUN npm ci --no-audit --no-fund

# Copiar el resto de la aplicación
COPY . .

# Construir la aplicación Angular para producción
RUN npm run build -- --configuration production

# Etapa de producción: servir archivos estáticos
FROM node:20-alpine

# Instalar serve globalmente para servir archivos estáticos
RUN npm install -g serve --no-audit --no-fund

# Establecer directorio de trabajo
WORKDIR /app

# Copiar los archivos construidos desde la etapa builder
COPY --from=builder /app/dist/front ./dist

# Crear usuario no-root para ejecutar la aplicación
RUN chown -R node:node /app

# Cambiar al usuario seguro 'node'
USER node

# Exponer puerto (por defecto 80, configurable via PORT)
EXPOSE 4200

# Comando para servir la aplicación
# Usa PORT si está definido, sino usa 80
# serve -s: sirve archivos estáticos con SPA routing (soporta Angular routing)
# -l: especifica el puerto a escuchar
CMD ["sh", "-c", "serve -s dist -l ${PORT:-80}"]
