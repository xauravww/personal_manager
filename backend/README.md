# Personal Resource Manager - Backend

Node.js/Express API for the Personal Resource Manager application.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Copy `.env` and update the values:
   ```bash
   cp .env .env.local
   ```

3. Set up PostgreSQL database:
   - Create a PostgreSQL database
   - Update `DATABASE_URL` in `.env`
   - Run database initialization:
     ```bash
     npm run db:init
     ```

4. Build and run:
   ```bash
   npm run build
   npm run dev
   ```

## API Documentation

Once the server is running, visit `http://localhost:3001/api-docs` for Swagger documentation.

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix linting issues
- `npm run test` - Run tests
- `npm run db:init` - Push Prisma schema to database
- `npm run db:migrate` - Create and run database migrations
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:studio` - Open Prisma Studio for database management

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - JWT token expiration time
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `OPENAI_API_KEY` - OpenAI API key for AI features (optional)

## Database Schema

The application uses Prisma ORM with PostgreSQL. The schema is defined in `prisma/schema.prisma` and includes:

- `User` - User accounts with authentication
- `Resource` - User resources (notes, videos, links, documents)
- `Tag` - Resource tags with many-to-many relationships

Full-text search is implemented using PostgreSQL's built-in capabilities with Prisma's raw SQL queries.