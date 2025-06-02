# Etapa de construcción
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa de producción
FROM node:18-alpine

# Crear un usuario no root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copiar archivos necesarios desde la etapa de construcción
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Cambiar la propiedad de los archivos al usuario no root
RUN chown -R appuser:appgroup /app

# Cambiar al usuario no root
USER appuser

EXPOSE 3000
CMD ["npm", "run", "start:prod"] 