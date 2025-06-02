# API de Trading

API REST desarrollada en NestJS para gestionar operaciones de trading, incluyendo manejo de órdenes, instrumentos y portafolios.

## Características Principales

- Gestión de órdenes de compra/venta (MARKET y LIMIT)
- Búsqueda de instrumentos financieros con coincidencia parcial
- Seguimiento de portafolio en tiempo real
- Validaciones robustas de negocio
- Logging detallado de operaciones

## Requisitos Previos

- Node.js (v18 o superior)
- Docker y Docker Compose

## Configuración

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd Challenge
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```
Lo que se toma como .env es .env.[environment]

## Ejecución

### Desarrollo Local

```bash
# Iniciar la base de datos
docker-compose up -d

# Iniciar el servidor en modo desarrollo
npm run start:dev
```

### Producción

```bash
# Compilar el proyecto
npm run build

# Iniciar el servidor
npm run start:prod
```

## Tests

```bash
# Tests unitarios
npm run test

# Tests de integración
npm run test:e2e

# Cobertura de tests
npm run test:cov
```

## Estructura del Proyecto

```
src/
├── controllers/     # Controladores REST
├── services/       # Lógica de negocio
├── entities/       # Entidades de base de datos
├── dtos/          # Objetos de transferencia de datos
├── interfaces/    # Interfaces y tipos
└── main.ts        # Punto de entrada de la aplicación
```

## Endpoints Principales

### Órdenes
- `POST /orders` - Crear nueva orden
- `PUT /orders/:id/cancel` - Cancelar orden
- `GET /orders` - Listar órdenes por usuario

### Instrumentos
- `GET /instruments/search` - Búsqueda de instrumentos
- `GET /instruments/:id` - Obtener instrumento por ID

### Portafolio
- `GET /portfolio` - Obtener portafolio del usuario

## Nota Especial: Optimización de Búsqueda

Se han implementado índices especiales en PostgreSQL para mejorar significativamente el rendimiento de las búsquedas de instrumentos:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_instruments_ticker ON instruments USING gin (ticker gin_trgm_ops);
CREATE INDEX idx_instruments_name ON instruments USING gin (name gin_trgm_ops);
```

Estos índices permiten:
- Búsquedas eficientes por similitud en tickers y nombres
- Coincidencias parciales rápidas
- Mejor rendimiento en búsquedas de texto libre

Por otro lado en api.http se podra encontrar la collection de endpoints

## Docker

El proyecto incluye configuración Docker para desarrollo y producción:

```bash
# Desarrollo
docker-compose up -d

# Producción
docker build -t trading-api .
docker run -p 3000:3000 trading-api
```

## Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add some amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles. 