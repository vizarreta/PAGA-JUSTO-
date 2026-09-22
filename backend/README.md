# PagaJusto - Backend Implementation

## Overview
Backend system for PagaJusto platform built with NestJS, Prisma ORM, and Stellar SDK for wallet authentication and agreement management.

## Prerequisites

### System Requirements
- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker Desktop (for PostgreSQL)
- Rust + Cargo (for Soroban contract compilation)
- Freighter Chrome/Firefox extension (for wallet authentication)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Paga-Justo-
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Setup Environment Variables**
   Create `.env` file in `backend/` directory:
   ```env
   # Application
   PORT=3000
   NODE_ENV=development

   # JWT Authentication
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=24h

   # Stellar Network
   STELLAR_NETWORK=testnet
   STREAMPIPE_URL=https://soroban-testnet.stellar.org
   HORIZON_URL=https://horizon-testnet.stellar.org

   # Database
   DATABASE_URL=postgresql://pagajusto:pagajusto_dev@localhost:5432/pagajusto?schema=public

   # Freighter
   FREIGHTER_API=https://freighter.io
   ```

4. **Start Docker Desktop**
   - Start Docker Desktop application
   - Ensure PostgreSQL is running on port 5432

5. **Database Migration**
   ```bash
   # Generate Prisma client
   cd backend
   npx prisma generate

   # Run migrations
   npm run db:migrate
   # or push schema
   npm run db:push
   ```

6. **Install Rust (for Soroban contracts)**
   ```bash
   # Install rustup
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

   # Add WASM target
   rustup target add wasm32-unknown-unknown

   # Install stellar CLI
   cargo install stellar-cli
   ```

7. **Start the Backend**
   ```bash
   # Development mode
   npm run start:dev

   # Production mode
   npm run build
   npm run start
   ```

   Server will run at `http://localhost:3000`

## API Endpoints

### Authentication (Auth Module)

#### GET /auth/challenge
Generates a challenge nonce for wallet authentication.
- **Query Parameters**: `publicKey` (required) - Stellar public key
- **Response**: `{ nonce: string }`

#### POST /auth/verify
Verifies wallet signature against challenge.
- **Body Parameters**:
  - `publicKey` (required) - Stellar public key
  - `signature` (required) - Base64 encoded signature
  - `nonce` (required) - Challenge nonce from /challenge endpoint
- **Response**: `{ valid: boolean }` or JWT token on success

### Agreements (Agreements Module)

#### POST /agreements
Create a new agreement.
- **Body**:
  ```json
  {
    "clientAddress": "G...",
    "freelancerAddress": "G...",
    "token": "native",
    "totalAmount": 1000.0,
    "milestones": [100, 200, 300],
    "termsHash": "hash-string"
  }
  ```
- **Response**: Created agreement object

#### GET /agreements/:id
Retrieve agreement by ID.

#### POST /agreements/:id/fund
Fund an agreement.
- **Body**: `{ client: "G..." }`
- **Response**: Updated agreement

#### POST /agreements/:id/milestone
Update milestone status.
- **Body**: `{ milestoneIndex: 0, amount: 100.0 }`
- **Response**: Updated agreement

### Users (Users Module)

#### POST /users
Create a new user.
- **Body**: `{ address: "G...", publicKey: "..." }`
- **Response**: Created user object

#### GET /users/:address
Retrieve user by address.

#### POST /users/:address/profile
Update user profile.

## Stellar Integration

### Wallet Authentication Flow
1. User connects Freighter extension
2. Frontend requests challenge for user's public key
3. User signs challenge via Freighter (SEP-53 signMessage)
4. Frontend sends signature + public key + nonce to backend
5. Backend verifies signature using Stellar SDK
6. Backend issues JWT upon successful verification

### Soroban Contract Functions
- `initialize(client, freelancer, token, milestones, termsHash)`
- `fund(client)` - transfers tokens to contract
- `approveAndRelease(freelancer, milestoneIndex)` - releases milestone payment

### Friendbot
Fund new accounts on testnet:
```bash
curl "https://friendbot.stellar.org?addr=PUBLIC_KEY_HERE"
```

## Project Structure

```
backend/
├── src/
│   ├── app.module.ts          # Root module
│   ├── main.ts               # Entry point
│   ├── prisma/               # Prisma ORM
│   │   ├── prisma.service.ts # Prisma service with onModuleInit/onModuleDestroy
│   │   └── schema.prisma     # Database schema
│   ├── auth/                 # Authentication module
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── stellar/              # Stellar/Soroban integration
│   │   ├── stellar.service.ts
│   │   └── stellar.module.ts
│   ├── agreements/           # Agreement management
│   │   ├── agreements.controller.ts
│   │   ├── agreements.service.ts
│   │   └── agreements.module.ts
│   └── users/                # User management
│       ├── users.controller.ts
│       ├── users.service.ts
│       └── users.module.ts
├── prisma/
│   └── schema.prisma
├── package.json
├── requirements.txt
└── nest-cli.json
```

## Development Notes

### TypeScript Configuration
- Target: ES2024
- Strict mode enabled
- Experimental decorators enabled

### Prisma Service Pattern
The PrismaService extends PrismaClient and implements OnModuleInit/OnModuleDestroy:
```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### JWT Strategy
Configured in AuthModule with NestJWT:
```typescript
JwtModule.registerAsync({
  useFactory: (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET'),
    signOptions: { expiresIn: '24h' },
  }),
  inject: [ConfigService],
})
```

### Wallet Signature Verification
Uses Stellar Keypair.verify():
```typescript
const keypair = Keypair.fromPublicKey(publicKey);
const isValid = keypair.verify(
  Buffer.from(nonce, 'utf-8'),
  Buffer.from(signature, 'base64')
);
```

## Docker Compose (for PostgreSQL)

```yaml
services:
  postgres:
    image: postgres:17-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: pagajusto
      POSTGRES_PASSWORD: pagajusto_dev
      POSTGRES_DB: pagajusto
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```