# Cookly Backend API

A modern Node.js backend for the Cookly mobile app - an AI-powered recipe generator that creates personalized recipes based on available ingredients using Azure OpenAI.

## 🚀 Features

- **AI-Powered Recipe Generation**: Uses Azure OpenAI to create unique recipes from ingredients
- **User Authentication**: Secure JWT-based authentication with password hashing
- **Recipe Management**: Save, rate, and organize personal recipe collections
- **Advanced Search**: Find recipes by ingredients, dietary restrictions, and preferences
- **MongoDB Integration**: Robust data persistence with Mongoose ODM
- **Input Validation**: Comprehensive request validation using Joi
- **Error Handling**: Centralized error handling with detailed logging
- **Rate Limiting**: Protection against API abuse
- **CORS Support**: Cross-origin resource sharing for web clients

## 🏗️ Architecture

```
src/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── middleware/      # Custom middleware
├── models/          # Mongoose schemas
├── routes/          # API route definitions
├── services/        # Business logic services
└── utils/          # Helper utilities
```

## 📋 Prerequisites

- Node.js >= 16.0.0
- MongoDB (local or Atlas)
- Azure OpenAI account and API credentials

## ⚙️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd cookly-backend
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env
   ```

   Configure your `.env` file with the following variables:

   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=5000
   FRONTEND_URL=http://localhost:3000

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/cookly

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d

   # Azure OpenAI Configuration
   AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-azure-openai-api-key
   AZURE_OPENAI_API_VERSION=2024-02-15-preview
   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-35-turbo

   # App Configuration
   MAX_INGREDIENTS=20
   DEFAULT_RECIPE_PORTIONS=4
   ```

4. **Start the server**

   ```bash
   # Test setup first (optional)
   yarn test:setup

   # Development with auto-reload
   yarn dev

   # Production
   yarn start
   ```

## 📡 API Endpoints

### Authentication

| Method | Endpoint                    | Description         | Auth Required |
| ------ | --------------------------- | ------------------- | ------------- |
| POST   | `/api/auth/register`        | Register new user   | No            |
| POST   | `/api/auth/login`           | User login          | No            |
| GET    | `/api/auth/me`              | Get current user    | Yes           |
| PUT    | `/api/auth/profile`         | Update user profile | Yes           |
| PUT    | `/api/auth/change-password` | Change password     | Yes           |

### Recipes

| Method | Endpoint                             | Description                    | Auth Required |
| ------ | ------------------------------------ | ------------------------------ | ------------- |
| POST   | `/api/recipes/generate`              | Generate new recipe            | Yes           |
| GET    | `/api/recipes`                       | Get all recipes (with filters) | No            |
| GET    | `/api/recipes/:id`                   | Get single recipe              | No            |
| POST   | `/api/recipes/search-by-ingredients` | Search by ingredients          | No            |
| GET    | `/api/recipes/saved`                 | Get user's saved recipes       | Yes           |
| POST   | `/api/recipes/:id/save`              | Save recipe                    | Yes           |
| DELETE | `/api/recipes/:id/save`              | Unsave recipe                  | Yes           |
| POST   | `/api/recipes/:id/rate`              | Rate recipe                    | Yes           |

### Health Check

| Method | Endpoint  | Description  | Auth Required |
| ------ | --------- | ------------ | ------------- |
| GET    | `/health` | Health check | No            |

## 🔧 API Usage Examples

### Register a User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password123",
    "preferences": {
      "dietaryRestrictions": ["vegetarian"],
      "defaultPortions": 4
    }
  }'
```

### Generate a Recipe

```bash
curl -X POST http://localhost:5000/api/recipes/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "ingredients": ["chicken breast", "broccoli", "rice"],
    "servings": 4,
    "mealType": "dinner",
    "difficulty": "medium",
    "dietaryRestrictions": []
  }'
```

### Search Recipes by Ingredients

```bash
curl -X POST http://localhost:5000/api/recipes/search-by-ingredients \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["tomato", "basil", "mozzarella"],
    "limit": 10,
    "minMatch": 2
  }'
```

### Get Recipes with Filters

```bash
curl "http://localhost:5000/api/recipes?cuisine=italian&mealType=dinner&isVegetarian=true&page=1&limit=10"
```

## 🗃️ Data Models

### User Model

```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  preferences: {
    dietaryRestrictions: [String],
    favoriteIngredients: [String],
    dislikedIngredients: [String],
    defaultPortions: Number
  },
  savedRecipes: [ObjectId],
  createdAt: Date,
  lastLoginAt: Date
}
```

### Recipe Model

```javascript
{
  title: String,
  description: String,
  ingredients: [{
    name: String,
    amount: String,
    unit: String
  }],
  inputIngredients: [String],
  instructions: [{
    stepNumber: Number,
    description: String,
    duration: String
  }],
  cookingTime: {
    prep: Number,
    cook: Number,
    total: Number
  },
  difficulty: String,
  servings: Number,
  cuisine: String,
  mealType: [String],
  dietaryInfo: Object,
  nutritionalInfo: Object,
  ratings: [{
    user: ObjectId,
    rating: Number,
    comment: String
  }],
  averageRating: Number,
  createdBy: ObjectId,
  createdAt: Date
}
```

## 🔒 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

Tokens expire after 7 days by default (configurable via `JWT_EXPIRE` environment variable).

## 📊 Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  },
  "pagination": {
    // Pagination info (when applicable)
    "currentPage": 1,
    "totalPages": 5,
    "totalRecipes": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    // Validation errors (when applicable)
  ]
}
```

## 🛡️ Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Joi schema validation
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configurable origins
- **Helmet**: Security headers
- **Environment Variables**: Sensitive data protection

## 🚦 Error Handling

The API implements comprehensive error handling:

- **Validation Errors**: 400 Bad Request
- **Authentication Errors**: 401 Unauthorized
- **Authorization Errors**: 403 Forbidden
- **Not Found Errors**: 404 Not Found
- **Rate Limit Errors**: 429 Too Many Requests
- **Server Errors**: 500 Internal Server Error

## 📈 Performance & Scalability

- **Database Indexing**: Optimized queries on frequently searched fields
- **Pagination**: Efficient data retrieval with skip/limit
- **Connection Pooling**: MongoDB connection optimization
- **Async/Await**: Non-blocking operations
- **Error Logging**: Comprehensive error tracking

## 🧪 Testing

```bash
# Test setup and configuration
yarn test:setup

# Run tests (when implemented)
yarn test

# Test Azure OpenAI connection
# Make a request to /api/recipes/generate with valid credentials
```

## 📝 Environment Variables Reference

| Variable                       | Description               | Default            | Required |
| ------------------------------ | ------------------------- | ------------------ | -------- |
| `NODE_ENV`                     | Environment mode          | development        | No       |
| `PORT`                         | Server port               | 5000               | No       |
| `MONGODB_URI`                  | MongoDB connection string | -                  | Yes      |
| `JWT_SECRET`                   | JWT signing secret        | -                  | Yes      |
| `JWT_EXPIRE`                   | JWT expiration time       | 7d                 | No       |
| `AZURE_OPENAI_ENDPOINT`        | Azure OpenAI endpoint URL | -                  | Yes      |
| `AZURE_OPENAI_API_KEY`         | Azure OpenAI API key      | -                  | Yes      |
| `AZURE_OPENAI_API_VERSION`     | API version               | 2024-02-15-preview | No       |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Deployment name           | gpt-35-turbo       | No       |

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**

   - Ensure MongoDB is running
   - Check connection string format
   - Verify network connectivity

2. **Azure OpenAI Errors**

   - Verify API credentials
   - Check endpoint URL format
   - Ensure deployment exists

3. **JWT Token Issues**
   - Check token format
   - Verify JWT secret
   - Check token expiration

### Debug Mode

Set `NODE_ENV=development` to enable:

- Detailed error stack traces
- Enhanced logging
- Development-specific features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions:

- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

Built with ❤️ using Node.js, Express, MongoDB, and Azure OpenAI
